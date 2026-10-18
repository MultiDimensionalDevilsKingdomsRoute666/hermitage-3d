// rooms/rastrelli-gallery/room.ts
/**
 * Rastrelli Gallery room module — design-staircase.md §8.1. The glb's placeholder materials
 * ship committed; the lightmap blend (§4.1 technique A) patches them at mount under the
 * manifest's intensity scalar; the PMREM probe and the interior exposure land with the next
 * slice. Module-level state is safe: the coordinator serializes transits, so a room is
 * never mounted twice. The ledger (§8.3 layer 1) registers payload bytes in load and
 * releases the whole scope in unmount.
 */
import { applyBlend, disposeBlend } from '../../src/assets/blend-gl';
import { stateOfPath } from '../../src/world/blend';
import type {
  RoomLoadContext,
  RoomManifest,
  RoomModule,
  RoomObject,
  RoomPayload,
  StateId,
} from '../../src/world/registry';
import { contract } from './contract';

let payload: RoomPayload | null = null;
let intensity = 1;
let object: RoomObject | null = null;

export const room: RoomModule = {
  contract,
  async load(ctx, manifest, signal) {
    payload = await ctx.assets.fetchRoom(manifest, signal);
    const glbRow = manifest.files.find((row) => row.kind === 'glb');
    if (glbRow === undefined) throw new Error(`${contract.id}: manifest has no glb row`);
    ctx.ledger.register(contract.id, 'glb', payload.glb.byteLength, glbRow.path);
    for (const [path, bytes] of payload.ktx2) {
      ctx.ledger.register(contract.id, 'ktx2', bytes.byteLength, path);
    }
    intensity = manifestIntensity(manifest);
  },
  async mount(ctx) {
    if (payload === null) throw new Error(`${contract.id}: mount before load`);
    if (object !== null) return; // idempotent
    object = await ctx.assets.mountParsed(contract.id, payload);
    applyBlend(contract.id, object, await stateTextures(ctx), intensity);
    ctx.scene.add(object);
  },
  unmount(ctx) {
    if (object === null) return;
    disposeBlend(contract.id);
    ctx.scene.remove(object);
    ctx.assets.disposeParsed(object);
    ctx.ledger.release(contract.id);
    object = null;
  },
};

const manifestIntensity = (manifest: RoomManifest): number => {
  const value = manifest.lightmaps.intensity;
  if (value === null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${contract.id}: manifest has no usable lightmap intensity`);
  }
  return value;
};

const stateTextures = async (ctx: RoomLoadContext): Promise<ReadonlyMap<StateId, unknown>> => {
  if (payload === null) throw new Error(`${contract.id}: no payload`);
  const decoded = await ctx.assets.decodeRoomTextures(contract.id, payload);
  const out = new Map<StateId, unknown>();
  for (const [path, texture] of decoded) {
    const state = stateOfPath(path);
    if (state !== null) out.set(state, texture);
  }
  if (out.size !== 3) {
    throw new Error(`${contract.id}: expected three baked states, got ${out.size}`);
  }
  return out;
};
