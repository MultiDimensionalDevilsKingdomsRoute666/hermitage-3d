// rooms/jordan/room.ts
/**
 * Jordan Staircase room module — design-staircase.md §8.1. Placeholder materials ship in
 * the glb (round 15); lightmap blending, interior exposure and the PMREM probe arrive with
 * round 17. Module-level state is safe: the coordinator serializes transits, so a room is
 * never mounted twice.
 */
import type { RoomModule, RoomObject, RoomPayload } from '../../src/world/registry';
import { contract } from './contract';

let payload: RoomPayload | null = null;
let object: RoomObject | null = null;

export const room: RoomModule = {
  contract,
  async load(ctx, manifest, signal) {
    payload = await ctx.assets.fetchRoom(manifest, signal);
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
    object = null;
  },
};
