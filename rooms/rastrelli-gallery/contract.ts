// rooms/rastrelli-gallery/contract.ts
/**
 * Rastrelli Gallery room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1 (stops: G0 arch mouth · G1 mid · G2 east door). Budget rows mirror the
 * generated manifest (tests pin them equal).
 */
import type { RoomContract } from '../../src/world/registry';

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
        look: { yaw: 20, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g0',
      },
      {
        id: 'G1',
        position: [24, 1.7, 73],
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g1',
      },
      {
        id: 'G2',
        position: [42, 1.7, 73],
        look: { yaw: 15, pitchUp: 10, pitchDown: 10 },
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
