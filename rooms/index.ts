// rooms/index.ts
/**
 * The room registry list — design-staircase.md §8.1: adding a room = a folder under rooms/
 * + public/assets/<id>/ + one line here; never a change under src/engine/ or src/world/
 * (DEC-013; AGENTS.md rule 8). Contracts are static data; modules load behind their thunks
 * (lazy chunks). Portal boxes are true coordinates (§2.4); holdMs is the threshold card's
 * MINIMUM DWELL (DEC-017 rewritten: the hold constant repurposed, design-walkthrough-ux.md
 * §4 — ~300 ms is the cinema cut-to-black; the landing's 600 stays until DEC-025 retargets
 * it); the landing airlock's far portal stays declared until the phase-3 position portals.
 * Verified against the rail at r18: the keyboard walk observed every airlock firing through
 * its portal box, forward and backward.
 */
import type { AirlockDef, RegistryEntry } from '../src/world/registry';
import { contract as jordanContract } from './jordan/contract';
import { contract as galleryContract } from './rastrelli-gallery/contract';

export const AIRLOCKS: readonly AirlockDef[] = [
  {
    id: 'arch-portal',
    from: 'square',
    to: 'rastrelli-gallery',
    portalFrom: { min: [-3, 0, 86.5], max: [3, 6, 88.5] },
    portalTo: { min: [-3, 0, 85.5], max: [3, 3.6, 87.5] },
    transit: 'doorway',
    holdMs: 300,
  },
  {
    id: 'gallery-airlock',
    from: 'rastrelli-gallery',
    to: 'jordan',
    portalFrom: { min: [43, 0, 70], max: [44, 3.6, 76] },
    portalTo: { min: [78, 0, -66], max: [80, 3.6, -62] },
    transit: 'doorway',
    holdMs: 300,
  },
  {
    id: 'landing-airlock',
    from: 'jordan',
    to: null,
    portalFrom: { min: [71.5, 10, -68], max: [74.5, 13.5, -64] },
    portalTo: null,
    transit: 'cut',
    holdMs: 600,
  },
];

export const ENTRIES: readonly RegistryEntry[] = [
  {
    kind: 'resident',
    id: 'square',
    route: '/',
    neighbors: [{ to: 'rastrelli-gallery', airlock: 'arch-portal' }],
  },
  {
    kind: 'room',
    id: 'rastrelli-gallery',
    route: '/gallery',
    contract: galleryContract,
    thunk: () => import('./rastrelli-gallery/room').then((m) => m.room),
  },
  {
    kind: 'room',
    id: 'jordan',
    route: '/jordan',
    contract: jordanContract,
    thunk: () => import('./jordan/room').then((m) => m.room),
  },
];
