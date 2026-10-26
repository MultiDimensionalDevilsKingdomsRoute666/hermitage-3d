// src/content/lightmap-look.ts
/**
 * Interior lightmap look gain — design-staircase §4.4 (r17c per-state scalar law).
 * The artistic multiplier applied AFTER the manifest white point restores the ktx2 encoding:
 * eff(room, state) = whitePoint(state) × INTERIOR_LOOK_GAIN[room][state]. Runtime design
 * configuration, not a second encoding scale: the interior exposure stays 1.0 and ADR-0013's
 * probe scalars are untouched. Every entry explicit and positive. Pure; no three, no DOM.
 */
import type { LightState, RoomId } from '../world/registry';

/** The three baked states in manifest order; the record types above are keyed by it. */
export const LIGHT_STATES: readonly LightState[] = ['day', 'dusk', 'nightChandeliers'];

export const INTERIOR_LOOK_GAIN: Readonly<Record<RoomId, Readonly<Record<LightState, number>>>> = {
  jordan: { day: 4, dusk: 3, nightChandeliers: 1 },
  // R-UX4 (walkthrough-UX pass, corridor light): all gallery states encode at the manifest's
  // shared white point 0.2 (the lamp field byte-identical across the three atlases; day =
  // night + day rigs at 1.0, tools/lm-recipes.mjs), so eff = 0.6 / 0.6 / 0.55. Ceiling law:
  // max eff = 0.6 = the accepted dusk, so no state exposes a coarser 8-bit step than dusk.
  // g(night) < g(day) is part of the law (night ≤ day holds per texel, not just on mean).
  // The night gain is the band rule's knob (raise in 0.25 steps while it stays under g(day)):
  // at 2.5 the captured day/night G1 mean ratio read 1.87 — the rule's step 1 → 2.75.
  'rastrelli-gallery': { day: 3, dusk: 3, nightChandeliers: 2.75 },
  // R4 (design-gallery.md §4.6): the first-bake gains for the Military Gallery of 1812.
  // The states differ by an order of magnitude here (§4.3). The first bake's histogram
  // (the r17c retune law: the descriptor edit + reencode, never a re-bake) moved the DAY
  // split: the white point 0.25 clipped 46% of the plate (the floor + the lit vault sit
  // ~0.5 linear), so the day encodes at wp 0.5 and the look gain drops 3 → 1.5 — eff stays
  // 0.75 (the look is unchanged; the 8-bit survival is what moved). eff = 0.75 / 0.45 / 0.6
  // — under the EFF ceiling of 1.0, night < day per texel.
  'military-gallery': { day: 1.5, dusk: 3, nightChandeliers: 2 },
};
