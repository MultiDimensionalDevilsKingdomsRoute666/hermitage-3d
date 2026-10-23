// src/camera/wheel-edge.ts
/**
 * The wheel-boundary law (design-gallery-fork: the owner's reachability report,
 * 2026-10-21): the rail's own wheel is travel-only (§6.1 — a wheel at a rail end
 * clamps), so a trackpad visitor reaches a door and stalls. The law adds ONE
 * deliberate gesture: sustained scrolling PAST a rail end fires that end's
 * airlock. A trackpad's momentum burst must NOT fire it — the law demands all
 * three of: accumulated |delta| >= EDGE_BUDGET_PX, no single event >=
 * EDGE_MAX_EVENT_PX (a deliberate press resumes slowly; a momentum burst starts
 * fast), and a sustained stream for >= EDGE_SUSTAIN_MS (a momentum tail dies
 * before the window opens). The host owns the DOM and calls feed(); the law is
 * pure and DOM-free. Thresholds are declared tuning constants (DEC-031).
 * The pass's budget persists across silent gaps by design: the CI wheel walk's
 * janked event delivery (SwiftShader clusters a stream into per-frame bursts)
 * must still be able to fire, and a real visitor's slow deliberate accumulation
 * at a door stays one pass. The lean (src/camera/door-lean.ts) owns its own
 * freshness window instead of borrowing the pass's reset.
 */

/* The deliberate-overshoot budget past the clamp, px. */
export const EDGE_BUDGET_PX = 650;
/* A momentum burst is fast by construction; a deliberate resume is not. px/event. */
export const EDGE_MAX_EVENT_PX = 120;
/* The momentum impulse decays inside this window; crossing it proves intent. ms. */
export const EDGE_SUSTAIN_MS = 420;

export type WheelEdgeInput = Readonly<{
  /** True while settled exactly at a rail end whose airlock side is next. */
  pastBoundary: boolean;
  /** The signed wheel delta, px (the rail's own sign law). */
  deltaPx: number;
  /** The DOM event clock, ms (Date.now; the law is pure over given values). */
  nowMs: number;
}>;

export type WheelEdgeState = Readonly<{
  /** The accumulated |delta| since the first past-boundary event, px. */
  budget: number;
  /** The first past-boundary event's timestamp, ms; null outside a pass. */
  sinceMs: number | null;
  /** The largest single |delta| seen in the current pass, px. */
  peakPx: number;
}>;

export const WHEEL_EDGE_START: WheelEdgeState = { budget: 0, sinceMs: null, peakPx: 0 };

export interface WheelEdgeStep {
  readonly state: WheelEdgeState;
  /** Fire the boundary's airlock this frame. */
  readonly fire: boolean;
}

export function wheelEdge(current: WheelEdgeState, input: WheelEdgeInput): WheelEdgeStep {
  if (!Number.isFinite(input.nowMs)) {
    throw new RangeError(`nowMs must be finite, got ${input.nowMs}`);
  }
  if (!Number.isFinite(input.deltaPx)) {
    throw new RangeError(`deltaPx must be finite, got ${input.deltaPx}`);
  }
  if (!input.pastBoundary || input.deltaPx === 0) {
    return { state: WHEEL_EDGE_START, fire: false };
  }
  const magnitude = Math.abs(input.deltaPx);
  if (magnitude >= EDGE_MAX_EVENT_PX) {
    // A fast burst: no deliberate press reads this fast — the pass restarts.
    return { state: WHEEL_EDGE_START, fire: false };
  }
  const sinceMs = current.sinceMs ?? input.nowMs;
  const state: WheelEdgeState = {
    budget: current.budget + magnitude,
    sinceMs,
    peakPx: Math.max(current.peakPx, magnitude),
  };
  const sustained = input.nowMs - sinceMs >= EDGE_SUSTAIN_MS;
  return { state, fire: sustained && state.budget >= EDGE_BUDGET_PX };
}
