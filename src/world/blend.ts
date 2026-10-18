// src/world/blend.ts
/**
 * Lightmap blend — pure state selection (design-staircase §4, §4.1, §8 consumer).
 *
 * §8 hands the coordinator w = { day, dusk, nightChandeliers } (Σ = 1, ≤ 2 nonzero, quintic
 * seams). This module decides which two states are bound this frame and the scale each one
 * carries; the three-bound side (src/assets/blend-gl.ts) turns the answer into uniforms.
 *
 * Laws:
 * - (a, b) are the two largest weights, sorted descending; ties break by STATE_ORDER.
 * - At a one-hot plateau b = null and wB = 0 — the B sampler keeps its fallback texel.
 * - A broken weights object (non-finite, negative, Σ ≠ 1 beyond tolerance) throws RangeError:
 *   a failed bake must fail loud, never render dark.
 * - 'lm/night.ktx2' carries the nightChandeliers state (mirrors the bake's STATE_FILE map).
 *
 * Pure: no three, no DOM, no node, no clock, no randomness.
 */
import type { StateId } from './registry';

export type BlendWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number }>;
export type BlendPayload = Readonly<{ a: StateId; b: StateId | null; wA: number; wB: number }>;
export const STATE_ORDER: readonly StateId[] = ['day', 'dusk', 'nightChandeliers'];

const SUM_TOLERANCE = 1e-6;

const PATH_STATE: ReadonlyMap<string, StateId> = new Map<string, StateId>([
  ['lm/day.ktx2', 'day'],
  ['lm/dusk.ktx2', 'dusk'],
  ['lm/night.ktx2', 'nightChandeliers'],
]);

type Entry = Readonly<{ state: StateId; w: number; rank: number }>;

function assertWeight(name: StateId, w: number): void {
  if (!Number.isFinite(w) || w < 0) {
    throw new RangeError(`blend: weight ${name} must be finite and >= 0, got ${w}`);
  }
}

export function blendPayload(weights: BlendWeights): BlendPayload {
  assertWeight('day', weights.day);
  assertWeight('dusk', weights.dusk);
  assertWeight('nightChandeliers', weights.nightChandeliers);
  const sum = weights.day + weights.dusk + weights.nightChandeliers;
  if (Math.abs(sum - 1) > SUM_TOLERANCE) {
    throw new RangeError(`blend: weights must sum to 1, got ${sum}`);
  }
  const entries: Entry[] = [
    { state: 'day', w: weights.day, rank: 0 },
    { state: 'dusk', w: weights.dusk, rank: 1 },
    { state: 'nightChandeliers', w: weights.nightChandeliers, rank: 2 },
  ];
  entries.sort((x, y) => (y.w !== x.w ? y.w - x.w : x.rank - y.rank));
  const first = entries[0];
  const second = entries[1];
  if (first === undefined || second === undefined) {
    throw new RangeError('blend: unreachable — three entries expected');
  }
  const hasB = second.w > 0;
  return {
    a: first.state,
    b: hasB ? second.state : null,
    wA: first.w,
    wB: hasB ? second.w : 0,
  } satisfies BlendPayload;
}

export function stateOfPath(path: string): StateId | null {
  return PATH_STATE.get(path) ?? null;
}
