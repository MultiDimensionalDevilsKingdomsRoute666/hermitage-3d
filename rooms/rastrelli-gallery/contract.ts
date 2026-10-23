// rooms/rastrelli-gallery/contract.ts
/**
 * Rastrelli Gallery room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1; design-walkthrough-ux.md §7 (the corridor path fix: FOUR stops — the
 * junction knot Gj where the arch passage meets the gallery axis; the G0→G1 wall-pass is gone)
 * and §8 (authored subjects, R-UX5). Budget rows mirror the generated manifest.
 *
 * Subjects (world metres): G0 gazes down the passage at the lit junction; Gj, G1 and G2 share
 * the east door's opening centre at eye height, so Gj→G1→G2 is one locked dolly onto the
 * door's light. From G1 that direction is exactly (1, 0, 0) — the committed G1 gaze — so the
 * three G1 goldens hold. G2 stands 3 m off the door so the portal frame reads as architecture.
 * Every position and subject below is declared from the build constants
 * (tools/bpy/rastrelli-gallery.py) and framed by capture at integration.
 */
import type { RoomContract, Vec3 } from '../../src/world/registry';

/** The east door's light: the open portal's centre (x 43..44, z 70..76) at eye height. */
const EAST_DOOR: Vec3 = [43.5, 1.7, 73];
/** The junction as seen from G0: Gj's spot, 0.7 m over the eye so the vault leads the frame. */
const JUNCTION: Vec3 = [1.6, 2.4, 73];

export const contract: RoomContract = {
  id: 'rastrelli-gallery',
  title: 'data.titleGallery',
  // The whole committed model (tools/bpy/rastrelli-gallery.py): the arch passage
  // (x -4..4, z 63.5..87.5, vault peak 5.0) plus the gallery proper (x 4..44, z 70..76).
  bounds: { min: [-4, 0, 63.5], max: [44, 5, 87.5] },
  rail: {
    stops: [
      {
        id: 'G0',
        position: [0, 1.7, 86],
        subject: JUNCTION,
        look: { yaw: 20, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g0',
      },
      {
        // The junction knot (§7): on the passage axis where it meets the gallery's centreline
        // z 73. The path turns here; the mouth (x 4..4.8, z 70..76) is 2.4 m east.
        id: 'Gj',
        position: [1.6, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.gj',
      },
      {
        id: 'G1',
        position: [24, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g1',
      },
      {
        // 3 m off the opening: depart travels 1.5 m and halts 1.5 m short of the portal plane.
        id: 'G2',
        position: [40.5, 1.7, 73],
        subject: EAST_DOOR,
        look: { yaw: 25, pitchUp: 15, pitchDown: 10 },
        caption: 'caption.g2',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'square', airlock: 'arch-portal' },
    { to: 'jordan', airlock: 'gallery-airlock' },
  ],
  budget: {
    trianglesMax: 110_000,
    drawsMax: 25,
    textureBytesMax: 1_000_000,
    payloadBytesMax: 2_000_000,
  },
};
