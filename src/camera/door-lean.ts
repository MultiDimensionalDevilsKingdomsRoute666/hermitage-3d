// src/camera/door-lean.ts
/**
 * The wheel-pass lean — docs/design-walkthrough-ux.md §2 (feedback), §4.1 (the departure
 * glide it hands into), §9, §12 R-UX2.
 *
 * A sustained wheel pass into a door (src/camera/wheel-edge.ts) is invisible until it fires;
 * the lean makes the push felt. The camera dollies toward the portal along the rail's end
 * tangent by LEAN_MAX_M · min(1, budget / EDGE_BUDGET_PX) — a small fraction of a metre, a
 * body leaning into a door. Position and target move together, so the frame translates and
 * never pivots. The pose follows its target as a first-order spring: a quick rise
 * (LEAN_RISE_MS) answers the roll inside the frame it lands; a slower release
 * (LEAN_RELEASE_MS) means a reset pass — a flick's restart (the burst clears the budget), a
 * step away from the end, or the pass going stale — springs back rather than snaps. The
 * staleness read is the lean's OWN: the target lives only while the last boundary wheel
 * event is younger than LEAN_FRESH_MS (the pass's budget persists across silent gaps by
 * design — the wheel-through's fire law must survive a scroll stream's glide — so the lean
 * cannot borrow the pass's reset; it reads the host's last-event age instead). A pause
 * longer than the freshness window releases the lean; within the window a held pass holds
 * the lean exactly as it holds its budget. Within LEAN_EPS_M the pose snaps onto
 * its target, so a released lean returns to EXACTLY 0 and leanPose hands back the given pose
 * object — the goldens (no input, budget 0) stay bit-identical.
 * Reduced motion: the target is 0 whatever the budget; the enter still fires.
 * Handover (§4.1): on the frame a transit begins, the host locks the depart's door pose as
 * leanPose(railPose, tangent, metres) and resets the lean; departPose then measures its plane
 * distance from the leaned pose, so the glide starts where the lean left the camera.
 * Pure: no three, no DOM, no clock; the host hands in deltaMs. Malformed input throws.
 */
import { clamp01 } from '../sky/easing';
import type { Vec3 } from '../world/registry';
import type { BeatPose } from '../world/threshold-beat';
import { EDGE_BUDGET_PX } from './wheel-edge';
/** The full lean at a complete budget — felt, never a step. */
export const LEAN_MAX_M = 0.35;
/** Rise time constant: the roll is answered within a few frames. */
export const LEAN_RISE_MS = 90;
/** Release time constant: the spring-back of a reset pass. */
export const LEAN_RELEASE_MS = 260;
/** The target lives this long past the last boundary wheel event (the host's read). ms. */
export const LEAN_FRESH_MS = 220;
/** Inside this distance the lean snaps onto its target (exact zero at rest). */
export const LEAN_EPS_M = 1e-4;
/** Unit-tangent tolerance — the host derives the tangent in floating point. */
export const LEAN_UNIT_EPSILON = 1e-6;
export type LeanState = Readonly<{ metres: number }>;
export const LEAN_START: LeanState = { metres: 0 };
export type LeanInput = Readonly<{
  /** The wheel pass's accumulated budget, px (WheelEdgeState.budget; 0 outside a pass). */
  budget: number;
  /** True while the last boundary wheel event is younger than LEAN_FRESH_MS. */
  fresh: boolean;
  deltaMs: number;
  reducedMotion: boolean;
}>;
export function leanTarget(budget: number, fresh: boolean, reducedMotion: boolean): number {
  if (!Number.isFinite(budget) || budget < 0) {
    throw new RangeError(`door-lean: budget must be finite and ≥ 0, got ${budget}`);
  }
  if (reducedMotion || !fresh || budget === 0) return 0;
  return LEAN_MAX_M * clamp01(budget / EDGE_BUDGET_PX);
}
export function advanceLean(state: LeanState, input: LeanInput): LeanState {
  if (!Number.isFinite(input.deltaMs) || input.deltaMs < 0) {
    throw new RangeError(`door-lean: deltaMs must be finite and ≥ 0, got ${input.deltaMs}`);
  }
  const target = leanTarget(input.budget, input.fresh, input.reducedMotion);
  if (input.reducedMotion) return state.metres === 0 ? state : LEAN_START;
  const gap = target - state.metres;
  if (gap === 0) return state;
  if (Math.abs(gap) <= LEAN_EPS_M) return { metres: target };
  const tau = gap > 0 ? LEAN_RISE_MS : LEAN_RELEASE_MS;
  const metres = target - gap * Math.exp(-input.deltaMs / tau);
  return Math.abs(target - metres) <= LEAN_EPS_M ? { metres: target } : { metres };
}
/** The leaned pose: a dolly of `metres` along the unit `tangent` into the door. */
export function leanPose(pose: BeatPose, tangent: Vec3, metres: number): BeatPose {
  if (!Number.isFinite(metres) || metres < 0) {
    throw new RangeError(`door-lean: metres must be finite and ≥ 0, got ${metres}`);
  }
  if (metres === 0) return pose;
  const len = Math.hypot(tangent[0], tangent[1], tangent[2]);
  if (!Number.isFinite(len) || Math.abs(len - 1) > LEAN_UNIT_EPSILON) {
    throw new RangeError('door-lean: tangent must be unit length');
  }
  const d: Vec3 = [tangent[0] * metres, tangent[1] * metres, tangent[2] * metres];
  return {
    position: [pose.position[0] + d[0], pose.position[1] + d[1], pose.position[2] + d[2]],
    target: [pose.target[0] + d[0], pose.target[1] + d[1], pose.target[2] + d[2]],
  };
}
