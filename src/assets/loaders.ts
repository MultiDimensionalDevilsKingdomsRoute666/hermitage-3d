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
  type Texture,
  type WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { RoomAssetService, RoomId, RoomObject, RoomPayload } from '../world/registry';

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

export function createLoaders(renderer: WebGLRenderer): Loaders {
  MeshoptDecoder.useWorkers(1);
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('/basis/')
    .setWorkerLimit(1)
    .detectSupport(renderer);
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  const blobsByRoot = new WeakMap<Object3D, string[]>();
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
      root.traverse((obj) => {
        for (const material of materialsOf(obj)) {
          for (const texture of texturesOf(material)) renderer.initTexture(texture);
        }
      });
      blobsByRoot.set(root, [...blobUrls.values()]);
      return root;
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
      ktx2.dispose();
    },
  };
}
