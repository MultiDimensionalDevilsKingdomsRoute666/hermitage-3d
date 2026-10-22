// src/world/airlock.ts
/**
 * Airlock transit FSM — docs/design-walkthrough-ux.md §4 + §12 R-UX1, DEC-017;
 * docs/design-staircase.md §2.4, DEC-014, §8.2–§8.4.
 *
 * Pure: no three, no DOM, no clock; the host runs exactly one advanceTransit per rendered frame
 * with that frame's deltaMs and the current dataReady.
 * Laws: a transit is depart → card → arrive → exit → idle. Depart is skipped on a cold entry
 * (from: null) and under reduced motion ('cut'); arrive is skipped at a dead end (to: null) and
 * under 'cut'. At most one phase transition per frame; a frame's overshoot carries into the next
 * phase's elapsed — EXCEPT into the arrive glide, which always plays in full: a late-data card
 * overshoot is absorbed by the black (§4: the arrival frame is reached, never shortened).
 * dataReady latches and never shortens a phase. 'upload-swap' fires exactly once and always on a
 * card frame: the card-entry frame when data is already ready, else the first ready card frame;
 * the card never ends on its swap frame, so the host is guaranteed a fully black swap frame.
 * The card ends when data is ready AND holdMs (the minimum dwell) has elapsed — a not-ready card
 * holds forever (a black card with a title is a title card, not a hang). 'dispose-from' fires
 * exactly once, on the transition into exit, only when from ≠ null.
 */
import { clamp01 } from '../sky/easing';
import type { AirlockDef, AirlockId, AirlockTransit, NodeHandle } from './registry';
/** Departure glide — the design's ~700 ms: long enough to read as leaving, short of a wait. */
export const DEPART_MS = 700;
/** Arrival glide — the design's ~900 ms: the entry stop is reached, not cut to. */
export const ARRIVE_MS = 900;
type TransitFields = Readonly<{
  airlockId: AirlockId;
  from: NodeHandle | null;
  to: NodeHandle | null;
  transit: AirlockTransit;
  /** The card's minimum dwell (the def's holdMs); the HUD's data-hold-ms while non-idle. */
  holdMs: number;
  /** Milliseconds since beginTransit. */
  elapsedMs: number;
  /** Milliseconds inside the current phase; beatProgress derives the beat ratio from it. */
  phaseElapsedMs: number;
  dataReady: boolean;
}>;
export type IdleState = Readonly<{ phase: 'idle' }>;
export type DepartState = Readonly<TransitFields & { phase: 'depart' }>;
export type CardState = Readonly<TransitFields & { phase: 'card'; uploaded: boolean }>;
export type ArriveState = Readonly<TransitFields & { phase: 'arrive' }>;
export type ExitState = Readonly<TransitFields & { phase: 'exit' }>;
export type BeatState = DepartState | CardState | ArriveState;
export type TransitState = IdleState | BeatState | ExitState;
export type TransitEvent = 'upload-swap' | 'dispose-from';
export type Advance = Readonly<{ state: TransitState; events: readonly TransitEvent[] }>;
const IDLE = { phase: 'idle' } as const satisfies TransitState;
export function beginTransit(
  input: Readonly<{ airlock: AirlockDef; from: NodeHandle | null; reducedMotion: boolean }>,
): DepartState | CardState {
  const { airlock, from } = input;
  const transit: AirlockTransit = input.reducedMotion ? 'cut' : airlock.transit;
  // One def serves both directions: `to` is derived relative to `from`; a cold entry
  // (from: null) lands on the def's `to`.
  const to = from !== null && from === airlock.to ? airlock.from : airlock.to;
  const fields: TransitFields = {
    airlockId: airlock.id,
    from,
    to,
    transit,
    holdMs: airlock.holdMs,
    elapsedMs: 0,
    phaseElapsedMs: 0,
    dataReady: false,
  };
  if (from === null || transit === 'cut') return { ...fields, phase: 'card', uploaded: false };
  return { ...fields, phase: 'depart' };
}
const carried = (s: BeatState, deltaMs: number, dataReady: boolean): TransitFields => ({
  airlockId: s.airlockId,
  from: s.from,
  to: s.to,
  transit: s.transit,
  holdMs: s.holdMs,
  elapsedMs: s.elapsedMs + deltaMs,
  phaseElapsedMs: s.phaseElapsedMs + deltaMs,
  dataReady: s.dataReady || dataReady,
});
const enterCard = (f: TransitFields, carryMs: number): Advance => ({
  state: { ...f, phase: 'card', phaseElapsedMs: carryMs, uploaded: f.dataReady },
  events: f.dataReady ? ['upload-swap'] : [],
});
const enterExit = (f: TransitFields, carryMs: number): Advance => ({
  state: { ...f, phase: 'exit', phaseElapsedMs: carryMs },
  events: f.from !== null ? ['dispose-from'] : [],
});
export function advanceTransit(state: TransitState, deltaMs: number, dataReady: boolean): Advance {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`advanceTransit: deltaMs must be finite and ≥ 0, got ${deltaMs}`);
  }
  if (state.phase === 'idle' || state.phase === 'exit') return { state, events: [] };
  const f = carried(state, deltaMs, dataReady);
  if (state.phase === 'depart') {
    if (f.phaseElapsedMs < DEPART_MS) return { state: { ...f, phase: 'depart' }, events: [] };
    return enterCard(f, f.phaseElapsedMs - DEPART_MS);
  }
  if (state.phase === 'arrive') {
    if (f.phaseElapsedMs < ARRIVE_MS) return { state: { ...f, phase: 'arrive' }, events: [] };
    return enterExit(f, f.phaseElapsedMs - ARRIVE_MS);
  }
  if (f.dataReady && !state.uploaded) {
    return { state: { ...f, phase: 'card', uploaded: true }, events: ['upload-swap'] };
  }
  if (!f.dataReady || f.phaseElapsedMs < state.holdMs) {
    return { state: { ...f, phase: 'card', uploaded: state.uploaded }, events: [] };
  }
  const carryMs = f.phaseElapsedMs - state.holdMs;
  if (state.to === null || state.transit === 'cut') return enterExit(f, carryMs);
  // The arrival glide always plays in full: the card's overshoot (a late-data dwell) is
  // absorbed by the black, never by shortening the glide (§4: the arrival frame is REACHED).
  return { state: { ...f, phase: 'arrive', phaseElapsedMs: 0 }, events: [] };
}
/** The 0..1 beat ratio for the glide phases; clamped because a frame may overshoot. */
export function beatProgress(state: DepartState | ArriveState): number {
  return clamp01(state.phaseElapsedMs / (state.phase === 'depart' ? DEPART_MS : ARRIVE_MS));
}
export function finishTransit(state: TransitState): TransitState {
  if (state.phase !== 'idle' && state.phase !== 'exit') {
    throw new Error(`finishTransit: a ${state.phase} beat is never torn down silently`);
  }
  return IDLE;
}
