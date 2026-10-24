/*
 * The 1812 kit's runtime classification (docs/design-gallery.md §3.2/§3.3; the merge law).
 * Pure: no three, no DOM, no node, no clock, no randomness.
 *
 * State laws:
 * - ROLE: a part is a kit frame, a kit canvas, or an architecture part — by the part-name
 *   prefix the bpy builder committed (frame_%03d / canvas_%03d, else architecture).
 * - WALL: a kit part's wall comes from the LAYOUT LAW by frame index
 *   (rooms/1812/layout.ts allFrames()[index].wall) — never from geometry centroids: the
 *   usable wall range is inset from the modelled ends, so bay-0 columns classify north and
 *   bay-10 columns south of it, and a centroid read misclassifies the end bays. The part
 *   name's number is the frame index. The K8 portal and the two allies hang in the end-wall
 *   group with H3 (§3.3 "the end-wall group lives with H3").
 * - The four merge buckets: west, east, north (the flanking pair) and the end-wall group.
 */
import { allFrames } from './layout';

export type KitRole = 'frame' | 'canvas' | 'architecture';
export type KitWall = 'west' | 'east' | 'north' | 'h3';
export const KIT_WALLS: readonly KitWall[] = ['west', 'east', 'north', 'h3'];

export function roleOf(name: string): KitRole {
  if (name.startsWith('frame_')) return 'frame';
  if (name.startsWith('canvas_')) return 'canvas';
  return 'architecture';
}

/** The frame index a kit part carries in its name, or null for an architecture part. */
export function indexOfName(name: string): number | null {
  const role = roleOf(name);
  if (role === 'architecture') return null;
  // The role prefixes differ in length: 'frame_' is 6 characters, 'canvas_' is 7.
  const prefix = role === 'frame' ? 'frame_' : 'canvas_';
  const index = Number.parseInt(name.slice(prefix.length), 10);
  return Number.isFinite(index) ? index : null;
}

/** The merge bucket of a kit part: the layout law's wall, south mapped onto the end group. */
export function wallOfName(name: string): KitWall | null {
  const index = indexOfName(name);
  if (index === null) return null;
  const frame = allFrames()[index];
  if (frame === undefined) return null;
  if (frame.wall === 'south') return 'h3';
  return frame.wall;
}
