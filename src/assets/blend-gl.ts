// src/assets/blend-gl.ts
/**
 * Lightmap blend — three-bound side (design-staircase §4.1 Technique A, custom slot 2 of 2).
 *
 * The glb's own MeshStandardMaterial instances are patched via onBeforeCompile; no
 * ShaderMaterial, so per-mesh albedo, shadows, fog and emission survive. State A rides the
 * stock lightmap path (material.lightMap, material.lightMapIntensity = wA · iA); state B is a
 * second fetch on the SAME vLightMapUv varying through a shared `lmB` sampler scaled by
 * `lmScale = wB · iB`. The B sampler is always declared and bound (1×1 black texel when
 * b = null) — exactly two fetches per fragment, and plateau crossings are texture/uniform
 * binds, never recompiles.
 *
 * Laws:
 * - One shared uniform object per room across every patched program; one write updates all.
 * - Materials are patched once per unique instance (shared across meshes).
 * - Module-level state is safe: the coordinator serializes transits (loaders.ts pattern).
 * - lm textures are LINEAR data (NoColorSpace) and are added to `irradiance` untouched.
 * - A missing texture for a bound state throws — loud, never a silent black room.
 */
import * as THREE from 'three';
import type { BlendPayload } from '../world/blend';
import type { RoomId, RoomObject, StateId } from '../world/registry';

export interface BlendHandle {
  setStates(a: StateId, b: StateId | null): void;
  setWeights(wA: number, wB: number): void;
}

type SharedUniforms = Readonly<{
  lmB: { value: THREE.Texture };
  lmScale: { value: number };
}>;

type RoomBlend = Readonly<{
  handle: BlendHandle;
  shared: SharedUniforms;
  current: { a: StateId | null; b: StateId | null };
}>;

const rooms = new Map<RoomId, RoomBlend>();

const LIGHTMAP_UV_CHANNEL = 1;
const CACHE_KEY = 'zimny-lm-blend-v1';
const INCLUDE_LINE = '#include <lights_fragment_maps>';
const UNIFORM_DECLS = 'uniform sampler2D lmB;\nuniform float lmScale;\n';

// Stock block as shipped in three 0.186.1 `lights_fragment_maps`; whitespace-tolerant.
const STOCK_BLOCK =
  /vec4 lightMapTexel = texture2D\( lightMap, vLightMapUv \);\s*vec3 lightMapIrradiance = lightMapTexel\.rgb \* lightMapIntensity;\s*irradiance \+= lightMapIrradiance;/;

const BLEND_BLOCK = [
  'vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );',
  'vec4 lmTexelB = texture2D( lmB, vLightMapUv );',
  'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity + lmTexelB.rgb * lmScale;',
  'irradiance += lightMapIrradiance;',
].join('\n\t\t');

let patchedChunkCache: string | null = null;
let fallbackTexel: THREE.DataTexture | null = null;

function patchedChunk(): string {
  if (patchedChunkCache !== null) return patchedChunkCache;
  const stock: unknown = THREE.ShaderChunk.lights_fragment_maps;
  if (typeof stock !== 'string' || !STOCK_BLOCK.test(stock)) {
    throw new Error('blend-gl: three lights_fragment_maps no longer matches the §4.1 patch');
  }
  patchedChunkCache = stock.replace(STOCK_BLOCK, BLEND_BLOCK);
  return patchedChunkCache;
}

function blackTexel(): THREE.Texture {
  if (fallbackTexel === null) {
    fallbackTexel = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    fallbackTexel.colorSpace = THREE.NoColorSpace;
    fallbackTexel.channel = LIGHTMAP_UV_CHANNEL;
    fallbackTexel.needsUpdate = true;
  }
  return fallbackTexel;
}

function asTexture(roomId: RoomId, state: StateId, value: unknown): THREE.Texture {
  if (!(value instanceof THREE.Texture)) {
    throw new Error(`blend-gl: ${roomId}/${state} lightmap is not a three Texture`);
  }
  return value;
}

function requireTexture(
  roomId: RoomId,
  textures: ReadonlyMap<StateId, THREE.Texture>,
  state: StateId,
): THREE.Texture {
  const tex = textures.get(state);
  if (tex === undefined) {
    throw new Error(`blend-gl: ${roomId} has no baked lightmap for state ${state}`);
  }
  return tex;
}

function patchMaterial(material: THREE.MeshStandardMaterial, shared: SharedUniforms): void {
  const chunk = patchedChunk();
  material.onBeforeCompile = (shader) => {
    if (!shader.fragmentShader.includes(INCLUDE_LINE)) {
      throw new Error('blend-gl: fragment shader lacks lights_fragment_maps include');
    }
    shader.uniforms.lmB = shared.lmB;
    shader.uniforms.lmScale = shared.lmScale;
    shader.fragmentShader = UNIFORM_DECLS + shader.fragmentShader.replace(INCLUDE_LINE, chunk);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
}

function collectMaterials(roomId: RoomId, object: RoomObject): THREE.MeshStandardMaterial[] {
  const root = object as unknown as THREE.Object3D;
  const seen = new Set<THREE.Material>();
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (seen.has(material)) continue;
      seen.add(material);
      const standard = material as THREE.MeshStandardMaterial;
      if (!standard.isMeshStandardMaterial) {
        throw new Error(`blend-gl: ${roomId} mesh ${mesh.name} uses non-standard ${material.type}`);
      }
      out.push(standard);
    }
  });
  return out;
}

export function applyBlend(
  roomId: RoomId,
  object: RoomObject,
  textures: ReadonlyMap<StateId, unknown>,
  intensity: number,
): BlendHandle {
  if (!Number.isFinite(intensity) || intensity <= 0) {
    throw new RangeError(`blend-gl: ${roomId} intensity must be finite and > 0, got ${intensity}`);
  }
  if (rooms.has(roomId)) {
    throw new Error(`blend-gl: ${roomId} already blended — disposeBlend before re-mount`);
  }
  const typed = new Map<StateId, THREE.Texture>();
  for (const [state, value] of textures) {
    const tex = asTexture(roomId, state, value);
    tex.channel = LIGHTMAP_UV_CHANNEL;
    typed.set(state, tex);
  }
  const shared: SharedUniforms = { lmB: { value: blackTexel() }, lmScale: { value: 0 } };
  const materials = collectMaterials(roomId, object);
  const current: { a: StateId | null; b: StateId | null } = { a: null, b: null };
  const handle: BlendHandle = {
    setStates(a, b) {
      const texA = requireTexture(roomId, typed, a);
      const texB = b === null ? blackTexel() : requireTexture(roomId, typed, b);
      for (const material of materials) material.lightMap = texA;
      shared.lmB.value = texB;
      current.a = a;
      current.b = b;
    },
    setWeights(wA, wB) {
      for (const material of materials) material.lightMapIntensity = wA;
      shared.lmScale.value = wB;
    },
  };
  const first = requireTexture(roomId, typed, 'day');
  for (const material of materials) {
    material.lightMap = first;
    material.lightMapIntensity = 0;
    patchMaterial(material, shared);
    material.needsUpdate = true;
  }
  current.a = 'day';
  rooms.set(roomId, { handle, shared, current });
  return handle;
}

export function applyWeights(roomId: RoomId, payload: BlendPayload, intensity: number): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  if (room.current.a !== payload.a || room.current.b !== payload.b) {
    room.handle.setStates(payload.a, payload.b);
  }
  room.handle.setWeights(payload.wA * intensity, payload.wB * intensity);
}

export function disposeBlend(roomId: RoomId): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  room.shared.lmB.value = blackTexel();
  room.shared.lmScale.value = 0;
  rooms.delete(roomId);
}
