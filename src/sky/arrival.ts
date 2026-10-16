// The three-beat arrival machine — design-sky-time.md §10. Pure: the
// coordinator owns the current state and calls advanceArrival after rendering.

import { ARRIVAL } from '../content/sky-time';
import { smootherstep } from './easing';

export type ArrivalState =
  | Readonly<{ phase: 'sky' }>
  | Readonly<{ phase: 'title'; elapsedMs: number }>
  | Readonly<{ phase: 'massing'; elapsedMs: number }>
  | Readonly<{ phase: 'settled' }>;

export type ArrivalPresentation = Readonly<{
  titleVisible: boolean;
  massingOpacity: number;
}>;

const SKY: ArrivalState = { phase: 'sky' };
const SETTLED: ArrivalState = { phase: 'settled' };

export function initialArrival(): ArrivalState {
  return SKY;
}

// One beat per call, in order: sky → title → massing → settled. Nothing ever
// skips a beat; deterministic mode only drops the title hold and never
// collapses two beats into one frame.
export function advanceArrival(
  state: ArrivalState,
  deltaMs: number,
  massingReady: boolean,
  deterministic: boolean,
): ArrivalState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError('delta must be finite and non-negative');
  }

  if (state.phase === 'sky') {
    // The title frame starts its own clock; the sky frame's delta is not counted.
    return { phase: 'title', elapsedMs: 0 };
  }

  if (state.phase === 'title') {
    const elapsedMs = state.elapsedMs + deltaMs;
    const holdSatisfied = deterministic || elapsedMs >= ARRIVAL.titleHoldMs;
    if (massingReady && holdSatisfied) return { phase: 'massing', elapsedMs: 0 };
    return { phase: 'title', elapsedMs };
  }

  if (state.phase === 'massing') {
    const elapsedMs = state.elapsedMs + deltaMs;
    if (elapsedMs >= ARRIVAL.massingFadeMs) return SETTLED;
    return { phase: 'massing', elapsedMs };
  }

  return state;
}

export function presentationForArrival(
  state: ArrivalState,
  deterministic: boolean,
): ArrivalPresentation {
  if (state.phase === 'sky') return { titleVisible: false, massingOpacity: 0 };
  if (state.phase === 'title') return { titleVisible: true, massingOpacity: 0 };
  if (state.phase === 'massing') {
    const massingOpacity = deterministic
      ? 1
      : smootherstep(state.elapsedMs / ARRIVAL.massingFadeMs);
    return { titleVisible: true, massingOpacity };
  }
  return { titleVisible: true, massingOpacity: 1 };
}
