// src/world/threshold-beat.ts
/**
 * Threshold beat law — docs/design-walkthrough-ux.md §4 + §12 R-UX1, DEC-017.
 *
 * Pure functions of plain data: the host hands in poses, the rail's end tangent (unit), portal
 * bounds, exposures and a 0..1 progress (clamped here; a frame may overshoot).
 * Laws: depart leaves the door stop along the tangent toward the portal centre — covering at
 * most DEPART_TRAVEL_MAX_M (the design's «last few metres») and, when the stop is close,
 * halting DEPART_STANDOFF_M short of the portal plane (the plane through the portal centre
 * normal to the tangent), never on it — while the gaze glides to the portal centre. Arrive
 * starts a few metres back from the entry stop toward the destination portal centre (at most
 * ARRIVE_TRAVEL_MAX_M, clamped at the portal centre — never past the doorway) and glides into
 * the stop, gaze held on the stop's subject. Depart at progress 0 and arrive at progress 1
 * RETURN the handed-in pose so the hand-over frames are bit-identical. Exposure: depart
 * from → 0, card exactly 0, arrive 0 → to, all over smootherstep(progress). Malformed input
 * throws.
 */
import { clamp01, mixScalar, smootherstep } from '../sky/easing';
import type { Bounds, Vec3 } from './registry';

export type BeatPhase = 'depart' | 'card' | 'arrive';
export type BeatPose = Readonly<{ position: Vec3; target: Vec3 }>;
/** Depart halts this far short of the portal plane when the stop is close: depth reads, never cut. */
export const DEPART_STANDOFF_M = 1.5;
/** Depart's travel cap — the design's «last few metres», a brisk stride over the ~700 ms beat. */
export const DEPART_TRAVEL_MAX_M = 2.5;
/** Arrive's travel cap — «a few metres back toward the destination portal», the same stride. */
export const ARRIVE_TRAVEL_MAX_M = 2.5;
/** Unit-tangent tolerance — the host derives the tangent in floating point. */
export const UNIT_EPSILON = 1e-6;
const assertFinite = (name: string, v: number): void => {
  if (!Number.isFinite(v)) throw new RangeError(`threshold-beat: ${name} must be finite, got ${v}`);
};
const assertVec3 = (name: string, v: Vec3): void => {
  assertFinite(`${name}[0]`, v[0]);
  assertFinite(`${name}[1]`, v[1]);
  assertFinite(`${name}[2]`, v[2]);
};
const assertPose = (name: string, p: BeatPose): void => {
  assertVec3(`${name}.position`, p.position);
  assertVec3(`${name}.target`, p.target);
};
const assertBounds = (name: string, b: Bounds): void => {
  assertVec3(`${name}.min`, b.min);
  assertVec3(`${name}.max`, b.max);
};
const centre = (b: Bounds): Vec3 => [
  (b.min[0] + b.max[0]) / 2,
  (b.min[1] + b.max[1]) / 2,
  (b.min[2] + b.max[2]) / 2,
];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3): number => Math.sqrt(dot(a, a));
const mixVec = (a: Vec3, b: Vec3, k: number): Vec3 => [
  mixScalar(a[0], b[0], k),
  mixScalar(a[1], b[1], k),
  mixScalar(a[2], b[2], k),
];
export function departPose(
  input: Readonly<{ stop: BeatPose; tangent: Vec3; portal: Bounds; progress: number }>,
): BeatPose {
  const { stop, tangent, portal, progress } = input;
  assertPose('stop', stop);
  assertVec3('tangent', tangent);
  assertBounds('portal', portal);
  assertFinite('progress', progress);
  if (Math.abs(length(tangent) - 1) > UNIT_EPSILON) {
    throw new RangeError('threshold-beat: tangent must be unit length');
  }
  const k = smootherstep(clamp01(progress));
  if (k <= 0) return { position: stop.position, target: stop.target };
  const c = centre(portal);
  // Signed distance from the stop to the portal plane along the tangent. The glide covers at
  // most DEPART_TRAVEL_MAX_M and, close in, halts DEPART_STANDOFF_M short of the plane — the
  // travel clamps at zero (a stop already inside the standoff does not move).
  const toPlane = dot(sub(c, stop.position), tangent);
  const travel = Math.min(DEPART_TRAVEL_MAX_M, Math.max(0, toPlane - DEPART_STANDOFF_M));
  const end = add(stop.position, scale(tangent, travel));
  return { position: mixVec(stop.position, end, k), target: mixVec(stop.target, c, k) };
}
export function arrivePose(
  input: Readonly<{ portal: Bounds; stop: BeatPose; progress: number }>,
): BeatPose {
  const { portal, stop, progress } = input;
  assertBounds('portal', portal);
  assertPose('stop', stop);
  assertFinite('progress', progress);
  const k = smootherstep(clamp01(progress));
  if (k >= 1) return { position: stop.position, target: stop.target };
  const c = centre(portal);
  const toPortal = sub(c, stop.position);
  const d = length(toPortal);
  // The start sits a few metres back from the entry stop toward the destination portal
  // (§4 «starts a few metres back toward the destination portal, inside its doorway»), at most
  // ARRIVE_TRAVEL_MAX_M and clamped at the portal centre — the glide never starts past the
  // doorway; a stop already at the portal centre holds (the vestibule-door entry today).
  const travel = Math.min(d, ARRIVE_TRAVEL_MAX_M);
  const start = d <= UNIT_EPSILON ? stop.position : add(stop.position, scale(toPortal, travel / d));
  return { position: mixVec(start, stop.position, k), target: stop.target };
}
export function beatExposure(
  input: Readonly<{ phase: BeatPhase; progress: number; fromExposure: number; toExposure: number }>,
): number {
  const { phase, progress, fromExposure, toExposure } = input;
  assertFinite('progress', progress);
  assertFinite('fromExposure', fromExposure);
  assertFinite('toExposure', toExposure);
  if (fromExposure < 0 || toExposure < 0) {
    throw new RangeError('threshold-beat: exposures must be ≥ 0');
  }
  if (phase === 'card') return 0;
  const k = smootherstep(clamp01(progress));
  return phase === 'depart' ? mixScalar(fromExposure, 0, k) : mixScalar(0, toExposure, k);
}
