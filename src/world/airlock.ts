// src/world/airlock.ts
/**
 * Airlock transit FSM — docs/design-staircase.md §2.4, DEC-014, §8.2–§8.4.
 *
 * Pure: no three, no DOM, no clock; the host feeds deltaMs and dataReady.
 * Laws: a transit is hold → exit → idle; 'upload-swap' fires exactly once, on the first
 * ready frame; 'dispose-from' fires exactly once, on exit, only when something was mounted;
 * the hold never ends before data is ready (dark-card dwell), so elapsed-at-exit ≥ holdMs;
 * reduced motion forces a 'cut' with a zero hold; fetch starts at beginTransit this round.
 */
import type { AirlockDef, AirlockId, AirlockTransit, NodeHandle } from './registry';

type TransitFields = Readonly<{
  airlockId: AirlockId;
  from: NodeHandle | null;
  to: NodeHandle | null;
  transit: AirlockTransit;
  holdMs: number;
  elapsedMs: number;
}>;
export type HoldState = Readonly<
  TransitFields & { phase: 'hold'; dataReady: boolean; uploaded: boolean }
>;
export type ExitState = Readonly<TransitFields & { phase: 'exit' }>;
export type TransitState = Readonly<{ phase: 'idle' }> | HoldState | ExitState;
export type TransitEvent = 'upload-swap' | 'dispose-from';
const IDLE = { phase: 'idle' } as const satisfies TransitState;
export function beginTransit(
  input: Readonly<{ airlock: AirlockDef; from: NodeHandle | null; reducedMotion: boolean }>,
): HoldState {
  const { airlock, from } = input;
  const transit: AirlockTransit = input.reducedMotion ? 'cut' : airlock.transit;
  // One def serves both directions: `to` is derived relative to `from`; a cold entry
  // (from: null) lands on the def's `to`.
  const to = from !== null && from === airlock.to ? airlock.from : airlock.to;
  return {
    phase: 'hold',
    airlockId: airlock.id,
    from,
    to,
    transit,
    holdMs: transit === 'cut' ? 0 : airlock.holdMs,
    elapsedMs: 0,
    dataReady: false,
    uploaded: false,
  };
}
export function advanceTransit(
  state: TransitState,
  deltaMs: number,
  dataReady: boolean,
): Readonly<{ state: TransitState; events: readonly TransitEvent[] }> {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`advanceTransit: deltaMs must be finite and ≥ 0, got ${deltaMs}`);
  }
  if (state.phase !== 'hold') return { state, events: [] };
  const events: TransitEvent[] = [];
  const ready = state.dataReady || dataReady;
  let uploaded = state.uploaded;
  if (ready && !uploaded) {
    uploaded = true;
    events.push('upload-swap');
  }
  const elapsedMs = state.elapsedMs + deltaMs;
  if (ready && elapsedMs >= state.holdMs) {
    if (state.from !== null) events.push('dispose-from');
    const exit: TransitState = {
      phase: 'exit',
      airlockId: state.airlockId,
      from: state.from,
      to: state.to,
      transit: state.transit,
      holdMs: state.holdMs,
      elapsedMs,
    };
    return { state: exit, events };
  }
  return { state: { ...state, elapsedMs, dataReady: ready, uploaded }, events };
}
export function finishTransit(state: TransitState): TransitState {
  if (state.phase === 'hold') throw new Error('finishTransit: a hold is never torn down silently');
  return IDLE;
}
