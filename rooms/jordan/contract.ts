// rooms/jordan/contract.ts
/**
 * Jordan Staircase room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1 (stops: J0 ground entry · J1 mid first flight · J2 mezzanine turn ·
 * J3 upper flight · J4 landing). Budget rows mirror the generated manifest.
 */
import type { RoomContract } from '../../src/world/registry';

export const contract: RoomContract = {
  id: 'jordan',
  title: 'Jordan Staircase — the ascent',
  bounds: { min: [66, 0, -86], max: [92, 20, -62] },
  rail: {
    stops: [
      {
        id: 'J0',
        position: [79, 1.7, -64],
        look: { yaw: 35, pitchUp: 35, pitchDown: 10 },
        caption: 'looking up into light',
      },
      {
        id: 'J1',
        position: [79, 5.2, -70],
        look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
        caption: 'the flight',
      },
      {
        id: 'J2',
        position: [79, 6.7, -80],
        look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
        caption: 'portholes mirror the windows',
      },
      {
        id: 'J3',
        position: [73, 9.7, -76],
        look: { yaw: 35, pitchUp: 30, pitchDown: 30 },
        caption: 'the gallery above',
      },
      {
        id: 'J4',
        position: [73, 11.7, -66],
        look: { yaw: 35, pitchUp: 30, pitchDown: 30 },
        caption: 'arrival; the portal (landing airlock)',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'rastrelli-gallery', airlock: 'gallery-airlock' },
    { to: null, airlock: 'landing-airlock' },
  ],
  budget: {
    trianglesMax: 380_000,
    drawsMax: 60,
    textureBytesMax: 4_000_000,
    payloadBytesMax: 7_000_000,
  },
};
