// src/perf/transit-log.ts
/**
 * The per-phase transit timing split — docs/design-walkthrough-ux.md §4 (the beat), §9
 * (Threshold), §12 R-UX6 (the last open NEED); the perfLog instrument of src/main.ts.
 *
 * Pure: no three, no DOM, no clock — the host hands in its frame clock (nowMs) and the FSM's
 * Advance; this module folds them into a ledger and renders console lines. It never touches
 * the FSM (src/world/airlock.ts): it reads the state the host already holds.
 * Laws: one `begin` line per transit, one summary line on the exit frame, at most one `stall`
 * line (a card open past STALL_MS) — never a per-frame line, so the readout cannot perturb
 * the cadence it measures. A frame belongs to the phase it RENDERS (the state after
 * advanceTransit), so the rows plus the exit frame sum to the transit's wall time exactly.
 * A row prints its wall next to its nominal (DEPART_MS, holdMs, ARRIVE_MS) so the FSM's
 * carried overshoot is visible, never hidden: a row reads at most one frame short of its
 * nominal (the crossing frame renders the next phase — the exit boundary's carry lands
 * on the exit row, and the card→arrive boundary's overshoot is absorbed by the black, the
 * FSM's own law). Data latency and the swap are stamped on the FSM's own elapsedMs; `t` and
 * `lit t` are host-clock absolutes — the two clocks never mix in a field. The first lit
 * frame is the first frame rendering a non-card state after the card: the card→arrive frame
 * under 'doorway', the card→exit frame under 'cut' or at a dead end.
 * Every line starts with LINE_PREFIX and never contains the token run `frames · avg`: the
 * pre-existing readout lines keep their byte-exact formats and their collectors' greps.
 * Malformed input throws.
 */

import type { Advance, BeatState, CardState, DepartState, TransitState } from '../world/airlock';
import { ARRIVE_MS, DEPART_MS } from '../world/airlock';
import type { AirlockId, AirlockTransit, NodeHandle } from '../world/registry';
/** Every transit line begins with this; the window/first-sky lines never do. */
export const LINE_PREFIX = 'zimny: transit';
/** A card open this long emits the once-only stall line (a hung fetch made visible). */
export const STALL_MS = 5000;
export type BeatPhase = BeatState['phase'];
export type TransitPhase = Exclude<TransitState['phase'], 'idle'>;
export type PhaseRow = Readonly<{
  phase: BeatPhase;
  /** Sum of deltaMs over the frames that rendered this phase. */
  wallMs: number;
  frames: number;
  maxDeltaMs: number;
}>;
/** The host's wall costs of the frame's events; null when the event did not fire. */
export type FrameCosts = Readonly<{ swapCostMs: number | null; disposeCostMs: number | null }>;
export type TransitLog = Readonly<{
  airlockId: AirlockId;
  from: NodeHandle | null;
  to: NodeHandle | null;
  transit: AirlockTransit;
  holdMs: number;
  /** Host clock at begin. */
  beganAtMs: number;
  readyAtBegin: boolean;
  /** The door-lean depth on the fire frame (R-UX2 handover). */
  leanAtFireM: number;
  /** FSM elapsedMs when data was first seen ready; 0 when ready at begin. */
  dataReadyMs: number | null;
  /** FSM elapsedMs of the 'upload-swap' frame. */
  swapMs: number | null;
  swapCostMs: number | null;
  /** deltaMs of the frame after the swap frame — the first draw with the new resources. */
  postSwapDeltaMs: number | null;
  disposeCostMs: number | null;
  /** Host clock of the first lit frame. */
  litAtMs: number | null;
  /** The row of the phase currently rendered. */
  open: PhaseRow;
  /** Closed rows, in phase order. */
  rows: readonly PhaseRow[];
  frames: number;
  maxDeltaMs: number;
  maxDeltaPhase: TransitPhase;
  stalled: boolean;
}>;
const ms = (v: number): string => v.toFixed(1);
const opt = (v: number | null): string => (v === null ? '?' : ms(v));
const handle = (h: NodeHandle | null): string => h ?? 'null';
const route = (log: TransitLog): string => `${log.airlockId} ${handle(log.from)}→${handle(log.to)}`;
const emptyRow = (phase: BeatPhase): PhaseRow => ({ phase, wallMs: 0, frames: 0, maxDeltaMs: 0 });
const firstFrame = (phase: BeatPhase, deltaMs: number): PhaseRow => ({
  phase,
  wallMs: deltaMs,
  frames: 1,
  maxDeltaMs: deltaMs,
});
const bump = (r: PhaseRow, deltaMs: number): PhaseRow => ({
  phase: r.phase,
  wallMs: r.wallMs + deltaMs,
  frames: r.frames + 1,
  maxDeltaMs: Math.max(r.maxDeltaMs, deltaMs),
});
const nominalMs = (log: TransitLog, phase: BeatPhase): number => {
  if (phase === 'depart') return DEPART_MS;
  if (phase === 'arrive') return ARRIVE_MS;
  return log.holdMs;
};
const rowText = (log: TransitLog, phase: BeatPhase): string => {
  const r = log.rows.find((x) => x.phase === phase);
  if (r === undefined) return `${phase} skipped`;
  return `${phase} ${ms(r.wallMs)}/${nominalMs(log, phase)} ms ${r.frames} f`;
};
const dataText = (log: TransitLog): string => {
  if (log.dataReadyMs === null) return 'pending';
  if (log.readyAtBegin) return 'at-begin';
  return `+${ms(log.dataReadyMs)} ms`;
};
const swapText = (log: TransitLog): string => {
  if (log.swapMs === null) return 'none';
  return (
    `+${ms(log.swapMs)} ms cost ${opt(log.swapCostMs)} ms ` + `post ${opt(log.postSwapDeltaMs)} ms`
  );
};
const disposeText = (log: TransitLog): string =>
  log.disposeCostMs === null ? 'none' : `${ms(log.disposeCostMs)} ms`;
const litText = (log: TransitLog): string => (log.litAtMs === null ? '?' : log.litAtMs.toFixed(0));
const stallLine = (log: TransitLog, phaseElapsedMs: number): string =>
  `${LINE_PREFIX} stall ${route(log)} · card open ${ms(phaseElapsedMs)} ms · data ` +
  `${log.dataReadyMs === null ? 'pending' : 'ready'}`;
const summaryLine = (log: TransitLog, exitDeltaMs: number): string => {
  const total = log.rows.reduce((sum, r) => sum + r.wallMs, 0) + exitDeltaMs;
  return (
    `${LINE_PREFIX} ${route(log)} ${log.transit} · ${rowText(log, 'depart')} · ` +
    `${rowText(log, 'card')} · ${rowText(log, 'arrive')} · data ${dataText(log)} · ` +
    `swap ${swapText(log)} · dispose ${disposeText(log)} · lit t ${litText(log)} · ` +
    `total ${ms(total)} ms ${log.frames} f · max ${ms(log.maxDeltaMs)} ms ` +
    `@${log.maxDeltaPhase} · exit ${ms(exitDeltaMs)} ms`
  );
};
/** Opens the ledger on the frame a transit begins; returns the `begin` line. */
export function openTransitLog(
  state: DepartState | CardState,
  input: Readonly<{ nowMs: number; ready: boolean; leanAtFireM: number }>,
): Readonly<{ log: TransitLog; line: string }> {
  if (!Number.isFinite(input.nowMs)) {
    throw new RangeError(`transit-log: nowMs must be finite, got ${input.nowMs}`);
  }
  const log: TransitLog = {
    airlockId: state.airlockId,
    from: state.from,
    to: state.to,
    transit: state.transit,
    holdMs: state.holdMs,
    beganAtMs: input.nowMs,
    readyAtBegin: input.ready,
    leanAtFireM: input.leanAtFireM,
    dataReadyMs: input.ready ? 0 : null,
    swapMs: null,
    swapCostMs: null,
    postSwapDeltaMs: null,
    disposeCostMs: null,
    litAtMs: null,
    open: emptyRow(state.phase),
    rows: [],
    frames: 0,
    maxDeltaMs: 0,
    maxDeltaPhase: state.phase,
    stalled: false,
  };
  const line =
    `${LINE_PREFIX} begin ${route(log)} ${log.transit} · hold ${log.holdMs} ms · ` +
    `ready-at-begin ${input.ready ? 'yes' : 'no'} · lean ${input.leanAtFireM.toFixed(3)} m · ` +
    `t ${input.nowMs.toFixed(0)}`;
  return { log, line };
}
/**
 * Folds one advanced frame into the ledger. Returns the lines to print this frame: the stall
 * line (once) and/or the summary (on the exit frame). An idle Advance is a no-op.
 */
export function noteTransitFrame(
  log: TransitLog,
  advance: Advance,
  input: Readonly<{ deltaMs: number; nowMs: number; ready: boolean; costs: FrameCosts }>,
): Readonly<{ log: TransitLog; lines: readonly string[] }> {
  const { deltaMs, nowMs, ready, costs } = input;
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`transit-log: deltaMs must be finite and ≥ 0, got ${deltaMs}`);
  }
  const st = advance.state;
  if (st.phase === 'idle') return { log, lines: [] };
  const swapped = advance.events.includes('upload-swap');
  const disposed = advance.events.includes('dispose-from');
  const spike = deltaMs > log.maxDeltaMs;
  const samePhase = st.phase === log.open.phase;
  const leavesCard = !samePhase && log.open.phase === 'card';
  let open = log.open;
  if (samePhase) open = bump(log.open, deltaMs);
  else if (st.phase !== 'exit') open = firstFrame(st.phase, deltaMs);
  const next: TransitLog = {
    ...log,
    dataReadyMs: log.dataReadyMs ?? (ready ? st.elapsedMs : null),
    swapMs: swapped ? st.elapsedMs : log.swapMs,
    swapCostMs: swapped ? costs.swapCostMs : log.swapCostMs,
    postSwapDeltaMs: log.postSwapDeltaMs ?? (log.swapMs !== null ? deltaMs : null),
    disposeCostMs: disposed ? costs.disposeCostMs : log.disposeCostMs,
    litAtMs: log.litAtMs ?? (leavesCard ? nowMs : null),
    open,
    rows: samePhase ? log.rows : [...log.rows, log.open],
    frames: log.frames + 1,
    maxDeltaMs: spike ? deltaMs : log.maxDeltaMs,
    maxDeltaPhase: spike ? st.phase : log.maxDeltaPhase,
    stalled: log.stalled || (st.phase === 'card' && st.phaseElapsedMs >= STALL_MS),
  };
  const lines: string[] = [];
  if (!log.stalled && next.stalled) lines.push(stallLine(next, st.phaseElapsedMs));
  if (st.phase === 'exit') lines.push(summaryLine(next, deltaMs));
  return { log: next, lines };
}
