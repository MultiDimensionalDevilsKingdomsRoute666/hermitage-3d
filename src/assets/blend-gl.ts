// src/assets/blend-gl.ts
/**
 * Lightmap techniques — three-bound hub (design-staircase §4.1 A, §4.2 B, §4.4 measurement).
 *
 * Mode 'a' (shipped, technique A): the glb's own MeshStandardMaterial instances patched via
 * onBeforeCompile — state A rides the stock lightmap path (material.lightMap,
 * material.lightMapIntensity = wA · iA), state B is a second fetch on the SAME vLightMapUv
 * through a shared `lmB` sampler scaled by `lmScale = wB · iA`; the sampler is always bound
 * (a 1×1 black texel when b = null), so exactly two fetches per fragment and plateau
 * crossings are texture/uniform binds, never recompiles.
 * Mode 'b-discrete' (the §4.4 floor): stock lightmap, argmax state at the full intensity,
 * no custom shaders.
 * Mode 'b-rt' (the §4.4 measured ceiling): two fullscreen quads re-blended EVERY FRAME into
 * a per-room RT consumed by the stock lightmap path — the real product would quantise w to
 * 1/64 and re-blend only on drift; the harness runs the ceiling, so a passing ceiling passes
 * any honest implementation.
 *
 * Laws:
 * - One shared uniform object per room across every patched program; one write updates all.
 * - Materials are patched once per unique instance (shared across meshes).
 * - Module-level state is safe: the coordinator serializes transits (loaders.ts pattern).
 * - lm textures are LINEAR data (NoColorSpace) and are added to `irradiance` untouched.
 * - A missing texture for a bound state throws — loud, never a silent black room.
 * - The coordinator calls applyWeights(roomId, frozenWeights, intensity) once per frame;
 *   unregistered rooms no-op (a hold before mount, the square).
 */
import * as THREE from 'three';
import { type BlendWeights, blendPayload, environmentScalar } from '../world/blend';
import type { LmMode, RoomId, RoomLedger, RoomObject, StateId } from '../world/registry';

export interface TechniqueHandle {
  setStates(a: StateId, b: StateId | null): void;
  setWeights(wA: number, wB: number): void;
}

type SharedUniforms = Readonly<{
  lmB: { value: THREE.Texture };
  lmScale: { value: number };
}>;

type RoomTechnique = Readonly<{
  mode: LmMode;
  handle: TechniqueHandle;
  shared: SharedUniforms;
  materials: THREE.MeshStandardMaterial[];
  textures: ReadonlyMap<StateId, THREE.Texture>;
  /** B-RT only: the per-room render target and its quad scene (the ceiling re-blend). */
  rt: { target: THREE.WebGLRenderTarget; scene: THREE.Scene; camera: THREE.Camera } | null;
  current: { a: StateId | null; b: StateId | null };
}>;

const rooms = new Map<RoomId, RoomTechnique>();

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

type QuadMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
/** Unique materials across every mesh of the parsed root (materials are shared by instances). */
export function collectMaterials(roomId: RoomId, object: RoomObject): THREE.MeshStandardMaterial[] {
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

function intensityGuard(roomId: RoomId, intensity: number): void {
  if (!Number.isFinite(intensity) || intensity <= 0) {
    throw new RangeError(`blend-gl: ${roomId} intensity must be finite and > 0, got ${intensity}`);
  }
}

function requireFree(roomId: RoomId): void {
  if (rooms.has(roomId)) {
    throw new Error(`blend-gl: ${roomId} already mounted — disposeTechnique before re-mount`);
  }
}

/** The entry point every room module calls once at mount (inside the airlock hold). */
export function applyTechnique(
  mode: LmMode,
  roomId: RoomId,
  object: RoomObject,
  textures: ReadonlyMap<StateId, unknown>,
  intensity: number,
  renderer: RoomObject,
  ledger: RoomLedger,
): TechniqueHandle {
  intensityGuard(roomId, intensity);
  requireFree(roomId);
  const typed = new Map<StateId, THREE.Texture>();
  for (const [state, value] of textures) {
    const tex = asTexture(roomId, state, value);
    tex.channel = LIGHTMAP_UV_CHANNEL;
    typed.set(state, tex);
  }
  const materials = collectMaterials(roomId, object);
  const shared: SharedUniforms = { lmB: { value: blackTexel() }, lmScale: { value: 0 } };
  const current: { a: StateId | null; b: StateId | null } = { a: null, b: null };
  let rt: RoomTechnique['rt'] = null;
  let handle: TechniqueHandle;

  if (mode === 'b-rt') {
    // §4.2 B-RT ceiling: the largest baked atlas sizes the per-room RT (2048² RGBA8 ≈ 16 MB).
    const res = Math.max(
      ...[...typed.values()].map((t) => (t.image as { width?: number } | undefined)?.width ?? 0),
      256,
    );
    const target = new THREE.WebGLRenderTarget(res, res, {
      colorSpace: THREE.NoColorSpace,
      depthBuffer: false,
    });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = (map: THREE.Texture): QuadMesh => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        }),
      );
      scene.add(mesh);
      return mesh;
    };
    const quadA = quad(requireTexture(roomId, typed, 'day'));
    const quadB = quad(blackTexel());
    rt = { target, scene, camera };
    const r = renderer as THREE.WebGLRenderer;
    handle = {
      setStates(a, b) {
        quadA.material.map = requireTexture(roomId, typed, a);
        quadB.material.map = b === null ? blackTexel() : requireTexture(roomId, typed, b);
      },
      setWeights(wA, wB) {
        // The ceiling: re-blend EVERY frame (the product would quantise w to 1/64 first).
        quadA.material.opacity = wA;
        quadB.material.opacity = wB;
        r.setRenderTarget(target);
        r.render(scene, camera);
        r.setRenderTarget(null);
      },
    };
    for (const material of materials) {
      material.lightMap = target.texture;
      material.lightMapIntensity = intensity; // the RT already carries the w·i blend
      material.needsUpdate = true;
    }
    const image = target.texture.image as { width: number; height: number };
    ledger.register(roomId, 'renderTarget', image.width * image.height * 4, 'preblend-rt');
  } else if (mode === 'b-discrete') {
    // §4.4 floor: the stock lightmap path, the argmax state bound at the FULL intensity.
    const tex = requireTexture(roomId, typed, 'day');
    for (const material of materials) {
      material.lightMap = tex;
      material.lightMapIntensity = intensity;
      material.needsUpdate = true;
    }
    handle = {
      setStates(a) {
        for (const material of materials) material.lightMap = requireTexture(roomId, typed, a);
      },
      setWeights(wA) {
        for (const material of materials) material.lightMapIntensity = wA;
      },
    };
  } else {
    // Technique A: state A on the stock slot; the patch adds the B fetch.
    const chunk = patchedChunk();
    for (const material of materials) {
      material.lightMap = blackTexel(); // bound for real on the first applyWeights frame
      material.lightMapIntensity = 0;
      material.onBeforeCompile = (shader) => {
        if (!shader.fragmentShader.includes(INCLUDE_LINE)) {
          throw new Error('blend-gl: fragment shader lacks lights_fragment_maps include');
        }
        shader.uniforms.lmB = shared.lmB;
        shader.uniforms.lmScale = shared.lmScale;
        shader.fragmentShader = UNIFORM_DECLS + shader.fragmentShader.replace(INCLUDE_LINE, chunk);
      };
      material.customProgramCacheKey = () => CACHE_KEY;
      material.needsUpdate = true;
    }
    handle = {
      setStates(a, b) {
        for (const material of materials) material.lightMap = requireTexture(roomId, typed, a);
        shared.lmB.value = b === null ? blackTexel() : requireTexture(roomId, typed, b);
      },
      setWeights(wA, wB) {
        for (const material of materials) material.lightMapIntensity = wA;
        shared.lmScale.value = wB;
      },
    };
  }

  rooms.set(roomId, { mode, handle, shared, materials, textures: typed, rt, current });
  return handle;
}

/** Per frame, once for the active room: dispatches by the room's mounted technique. */
export function applyWeights(roomId: RoomId, weights: BlendWeights, intensity: number): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  const payload = blendPayload(weights);
  if (room.mode === 'b-discrete') {
    if (room.current.a !== payload.a) {
      room.handle.setStates(payload.a, null);
      room.current.a = payload.a;
    }
    room.handle.setWeights(intensity, 0); // argmax at the full white point — no blend
  } else {
    if (room.current.a !== payload.a || room.current.b !== payload.b) {
      room.handle.setStates(payload.a, payload.b);
      room.current.a = payload.a;
      room.current.b = payload.b;
    }
    room.handle.setWeights(payload.wA * intensity, payload.wB * intensity);
  }
  // §5/ADR-0013: the probe is hour-static; envMapIntensity follows the clock scalars.
  const envIntensity = environmentScalar(weights);
  for (const material of room.materials) material.envMapIntensity = envIntensity;
}

export function disposeTechnique(roomId: RoomId): void {
  const room = rooms.get(roomId);
  if (room === undefined) return;
  room.shared.lmB.value = blackTexel();
  room.shared.lmScale.value = 0;
  if (room.rt) {
    room.rt.target.dispose();
    for (const child of room.rt.scene.children) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }
  rooms.delete(roomId);
}
