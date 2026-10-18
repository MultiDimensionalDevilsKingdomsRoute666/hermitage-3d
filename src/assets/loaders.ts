// src/assets/loaders.ts
/**
 * Three-bound loader service — docs/design-staircase.md §8.2 (fetch/decode off the render
 * path; parse + GPU upload inside the hold), §8.3 (dispose once, in exit), §8.4 (no GPU
 * allocation in the frame loop). Implements RoomAssetService from src/world/registry.
 *
 * Laws: fetchRoom never touches the renderer; mountParsed is hold-only and uploads every
 * texture before returning; blob URLs live until disposeParsed, never revoked per frame.
 */
import {
  LoadingManager,
  type Material,
  type Mesh,
  type Object3D,
  PMREMGenerator,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type {
  RoomAssetService,
  RoomId,
  RoomLedger,
  RoomObject,
  RoomPayload,
} from '../world/registry';

export interface Loaders extends RoomAssetService {
  dispose(): void;
}

const materialsOf = (object: Object3D): Material[] => {
  const mesh = object as Mesh;
  if (mesh.isMesh !== true) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
};
const texturesOf = (material: Material): Texture[] =>
  Object.values(material as unknown as Record<string, unknown>).filter(
    (v): v is Texture => typeof v === 'object' && v !== null && (v as Texture).isTexture === true,
  );

/** §4.3: the honest GPU size — compressed textures carry their mip chain in image.data;
 * uncompressed textures estimate width × height × 4 B × 1.33 (the mip chain). */
const vramBytes = (texture: Texture): number => {
  const image = texture.image as
    | { width?: number; height?: number; data?: { byteLength?: number } }
    | undefined;
  const data = image?.data;
  if (data && typeof data.byteLength === 'number') return data.byteLength;
  if (image?.width === undefined || image?.height === undefined) return 0;
  return Math.ceil(image.width * image.height * 4 * (4 / 3));
};

export function createLoaders(renderer: WebGLRenderer, ledger: RoomLedger): Loaders {
  MeshoptDecoder.useWorkers(1);
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .setWorkerLimit(1)
    .detectSupport(renderer);
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  const blobsByRoot = new WeakMap<Object3D, string[]>();
  const envByRoom = new Map<string, WebGLRenderTarget>(); // §5/ADR-0013: one bake per mount
  const pmrem = new PMREMGenerator(renderer);
  const parseGlb = (data: ArrayBuffer, path: string): Promise<GLTF> =>
    new Promise((resolve, reject) => gltf.parse(data, path, resolve, reject));
  return {
    async fetchRoom(manifest, signal) {
      const rows = await Promise.all(
        manifest.files.map(async (row) => {
          const res = await fetch(`/assets/${manifest.id}/${row.path}`, { signal });
          if (!res.ok) throw new Error(`fetchRoom: ${res.status} for ${row.path}`);
          const bytes = await res.arrayBuffer();
          if (bytes.byteLength !== row.bytes)
            throw new Error(`fetchRoom: size mismatch ${row.path}`);
          return [row, bytes] as const;
        }),
      );
      const glbRow = rows.find(([row]) => row.kind === 'glb');
      if (!glbRow) throw new Error(`fetchRoom: manifest ${manifest.id} has no glb row`);
      const ktx2Map = new Map<string, ArrayBuffer>();
      for (const [row, bytes] of rows) if (row.kind === 'ktx2') ktx2Map.set(row.path, bytes);
      return { glb: glbRow[1], ktx2: ktx2Map };
    },
    /** §4: decode only the lm rows — the glb's own ktx2 albedos already decoded inside parse. */
    async decodeRoomTextures(roomId, payload) {
      const out = new Map<string, RoomObject>();
      await Promise.all(
        [...payload.ktx2]
          .filter(([path]) => path.startsWith('lm/'))
          .map(
            ([path, bytes]) =>
              new Promise<void>((resolve, reject) => {
                ktx2.parse(
                  bytes,
                  (texture: unknown) => {
                    out.set(path, texture);
                    resolve();
                  },
                  reject,
                );
              }),
          ),
      );
      if (out.size === 0) throw new Error(`decodeRoomTextures: ${roomId} has no lm rows`);
      return out;
    },
    async mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject> {
      const blobUrls = new Map<string, string>();
      for (const [key, bytes] of payload.ktx2) {
        blobUrls.set(key, URL.createObjectURL(new Blob([bytes])));
      }
      const manager = new LoadingManager();
      manager.setURLModifier((url) => {
        for (const [key, blob] of blobUrls) {
          if (url === key || url.endsWith(`/${key}`)) return blob;
        }
        return url;
      });
      // Holds are serialized, so rebinding the shared loaders' manager per call is race-free.
      // KTX2 bytes are fetched by KTX2Loader's own FileLoader, which consults the KTX2Loader's
      // manager — both are rebound, not just GLTFLoader's.
      gltf.manager = manager;
      ktx2.manager = manager;
      const parsed = await parseGlb(payload.glb, `/assets/${roomId}/`);
      const root = parsed.scene;
      // §8.3 layer 1: every decoded asset registers its honest GPU size — textures from the
      // transcoded mip data, geometries from their attribute + index arrays.
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh === true) {
          let geometryBytes = 0;
          for (const attribute of Object.values(mesh.geometry.attributes)) {
            const array = attribute as { array: { byteLength: number } };
            geometryBytes += array.array.byteLength;
          }
          const index = mesh.geometry.index as { array: { byteLength: number } } | null;
          if (index !== null) geometryBytes += index.array.byteLength;
          ledger.register(roomId, 'geometry', geometryBytes, `geo/${mesh.uuid}`);
        }
        for (const material of materialsOf(obj)) {
          for (const texture of texturesOf(material)) {
            renderer.initTexture(texture);
            ledger.register(roomId, 'texture', vramBytes(texture), `tex/${texture.uuid}`);
          }
        }
      });
      blobsByRoot.set(root, [...blobUrls.values()]);
      return root;
    },
    /** §5/ADR-0013: decode the dusk probe, bake PMREM once — inside the hold, never per frame. */
    async mountEnvironment(roomId, payload) {
      const probe = [...payload.ktx2].find(([path]) => path.startsWith('probe/'));
      if (probe === undefined) throw new Error(`mountEnvironment: ${roomId} has no probe row`);
      const source = await new Promise<Texture>((resolve, reject) =>
        ktx2.parse(probe[1], resolve, reject),
      );
      const rt = pmrem.fromEquirectangular(source);
      source.dispose(); // baked into the RT; the equirect is never sampled again
      envByRoom.set(roomId, rt);
      const image = rt.texture.image as { width: number; height: number };
      ledger.register(roomId, 'renderTarget', image.width * image.height * 8, 'pmrem-probe');
      return rt.texture;
    },
    disposeEnvironment(roomId) {
      envByRoom.get(roomId)?.dispose();
      envByRoom.delete(roomId);
    },
    disposeParsed(object) {
      const root = object as Object3D;
      root.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh === true) mesh.geometry.dispose();
        for (const material of materialsOf(obj)) {
          for (const texture of texturesOf(material)) texture.dispose();
          material.dispose();
        }
      });
      for (const url of blobsByRoot.get(root) ?? []) URL.revokeObjectURL(url);
      blobsByRoot.delete(root);
    },
    dispose() {
      pmrem.dispose();
      ktx2.dispose();
    },
  };
}
