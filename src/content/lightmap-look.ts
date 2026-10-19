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
  'rastrelli-gallery': { day: 4, dusk: 3, nightChandeliers: 1 },
};
