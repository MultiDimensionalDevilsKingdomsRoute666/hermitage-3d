// rooms/jordan/room.ts
/**
 * Jordan Staircase room module — design-staircase.md §8.1. Placeholder materials ship in
 * the glb (round 15); lightmap blending, interior exposure and the PMREM probe arrive with
 * round 17. Module-level state is safe: the coordinator serializes transits, so a room is
 * never mounted twice. The ledger (§8.3 layer 1) registers payload bytes in load and
 * releases the whole scope in unmount.
 */
import type { RoomModule, RoomObject, RoomPayload } from '../../src/world/registry';
import { contract } from './contract';

let payload: RoomPayload | null = null;
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
  },
  async mount(ctx) {
    if (payload === null) throw new Error(`${contract.id}: mount before load`);
    if (object !== null) return; // idempotent
    object = await ctx.assets.mountParsed(contract.id, payload);
    ctx.scene.add(object);
  },
  unmount(ctx) {
    if (object === null) return;
    ctx.scene.remove(object);
    ctx.assets.disposeParsed(object);
    ctx.ledger.release(contract.id);
    object = null;
  },
};
