/**
 * Camera rail — pure core.
 * Implements design-staircase §6 «Cinematography — the rail», §6.1 (path, look limits, inputs,
 * reduced motion, boundary intents) and the seed half of §1.2 (?stop= / ?cam= precedence).
 *
 * Laws:
 * - u ∈ [0, 1] spans the ACTIVE node's stop list; stop i sits at u = i / (n - 1); a single-stop
 *   node is the point u = 0. A parameter within STOP_EPS of a stop snaps to it, so stops are
 *   bit-identical to the committed data.
 * - Path: centripetal Catmull-Rom through the stop positions. The only synthesised control
 *   points are the two end phantoms (mirror of the neighbour through the end stop).
 * - Default gaze = committed pose law: stop i looks at stop i + 1, the last stop looks back at
 *   the previous one. Between stops the committed yaw/pitch of the bounding stops blend with the
 *   smootherstep law (yaw by shortest arc; a half-turn tie turns positive). An optional per-stop
 *   gaze override (the square's authored framing, golden-pinned) replaces the law where given.
 * - Look limits blend linearly between the bounding stops; user offsets are re-clamped on every
 *   transition. Offsets are degrees: yaw > 0 turns right, pitch > 0 looks up.
 * - Motion: a glide is (from, to, durationMs, elapsedMs) eased by smootherstep; advance() is
 *   pure, takes a finite non-negative deltaMs and throws RangeError otherwise. A key step in
 *   flight retargets from the current u; a scroll in flight extends the scroll glide's `to`.
 *   Reduced motion turns every glide into a cut. Scroll clamps at the rail ends; only key steps
 *   past an end surface a boundary intent (the host turns it into an airlock transit).
 * - Seed precedence on node entry: ?stop= (known id) > ?cam= (finite, clamped) > entry (u = 0).
 * - r21 look response: target/current split; the sensitivity and damping laws live in look.ts
 *   (§6.1; §10 row r21). drag() accumulates the clamped TARGET, advance() eases the CURRENT
 *   every frame; settle() re-clamps both; at rest the eased look hands back the same object, so
 *   the never-dragged poses stay bit-identical.
 */

import type { Rail, Stop, Vec3 } from '../world/registry';
import type { LookLimits, LookOffset, PointerTypeName } from './look';
import { clampLook, dragLook, easeLook, NO_LOOK, settleLook } from './look';

export type { LookLimits, LookOffset } from './look';
export type GlideKind = 'step' | 'scroll';
export type Glide = Readonly<{
  kind: GlideKind;
  from: number;
  to: number;
  durationMs: number;
  elapsedMs: number;
}>;
export type RailState = Readonly<{
  u: number;
  glide: Glide | null;
  look: LookOffset;
  lookTarget: LookOffset;
}>;
export type Boundary = 'forward' | 'backward';
export type StepResult = Readonly<{ state: RailState; boundary: Boundary | null }>;
export type Pose = Readonly<{
  position: Vec3;
  target: Vec3;
  limits: LookLimits;
  look: LookOffset;
}>;
export type SeedInput = Readonly<{ stop: string | null; cam: number | null }>;
export type SeedSource = 'stop' | 'cam' | 'entry';
export type SeedResult = Readonly<{ state: RailState; source: SeedSource }>;

export const STEP_GLIDE_MS = 1400;
export const SCROLL_GLIDE_MS = 320;
/** Declared tuning target (the r26.1 owner report: «scrolling in is too fast — around 25%
 * slower»): wheel pixels per rail segment. 900 → 1200 = the same gesture travels 75% of the
 * distance it used to. */
export const SCROLL_PX_PER_SEGMENT = 1200;

const STOP_EPS = 1e-9;
const KNOT_EPS = 1e-6;
const TAU = Math.PI * 2;
type Angles = Readonly<{ yaw: number; pitch: number }>;
type Place = Readonly<{ i: number; t: number }>;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, w: number): number => a + (b - a) * w;
const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [
  lerp(a[0], b[0], w),
  lerp(a[1], b[1], w),
  lerp(a[2], b[2], w),
];
const mirror = (a: Vec3, b: Vec3): Vec3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const smootherstep = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const wrapArc = (d: number): number => {
  const r = d % TAU;
  if (r > Math.PI) return r - TAU;
  if (r <= -Math.PI) return r + TAU;
  return r;
};

function stopAt(rail: Rail, index: number): Stop {
  const stop = rail.stops[index];
  if (stop === undefined) throw new RangeError(`rail has no stop ${index}`);
  return stop;
}

export const stopCount = (rail: Rail): number => rail.stops.length;

export function stopParameter(rail: Rail, index: number): number {
  const n = stopCount(rail);
  if (!Number.isInteger(index) || index < 0 || index >= n) {
    throw new RangeError(`stop index ${index} outside 0..${n - 1}`);
  }
  return n === 1 ? 0 : index / (n - 1);
}

export function nearestStopIndex(rail: Rail, u: number): number {
  const n = stopCount(rail);
  return n === 1 ? 0 : Math.round(clamp(u, 0, 1) * (n - 1));
}

export const restingAt = (u: number): RailState => ({
  u,
  glide: null,
  look: NO_LOOK,
  lookTarget: NO_LOOK,
});

function locate(rail: Rail, u: number): Place {
  const n = stopCount(rail);
  if (n < 2) return { i: 0, t: 0 };
  const k = clamp(u, 0, 1) * (n - 1);
  const near = Math.round(k);
  const snapped = Math.abs(k - near) < STOP_EPS ? near : k;
  if (snapped >= n - 1) return { i: n - 2, t: 1 };
  const i = Math.floor(snapped);
  return { i, t: snapped - i };
}

function control(rail: Rail, index: number): Vec3 {
  const n = stopCount(rail);
  if (index < 0) return mirror(stopAt(rail, 0).position, stopAt(rail, 1).position);
  if (index >= n) return mirror(stopAt(rail, n - 1).position, stopAt(rail, n - 2).position);
  return stopAt(rail, index).position;
}

function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t0 = 0;
  const t1 = t0 + Math.max(KNOT_EPS, Math.sqrt(dist(p0, p1)));
  const t2 = t1 + Math.max(KNOT_EPS, Math.sqrt(dist(p1, p2)));
  const t3 = t2 + Math.max(KNOT_EPS, Math.sqrt(dist(p2, p3)));
  const s = lerp(t1, t2, t);
  const a1 = lerp3(p0, p1, (s - t0) / (t1 - t0));
  const a2 = lerp3(p1, p2, (s - t1) / (t2 - t1));
  const a3 = lerp3(p2, p3, (s - t2) / (t3 - t2));
  const b1 = lerp3(a1, a2, (s - t0) / (t2 - t0));
  const b2 = lerp3(a2, a3, (s - t1) / (t3 - t1));
  return lerp3(b1, b2, (s - t1) / (t2 - t1));
}

export function samplePosition(rail: Rail, u: number): Vec3 {
  const { i, t } = locate(rail, u);
  if (t === 0) return stopAt(rail, i).position;
  if (t === 1) return stopAt(rail, i + 1).position;
  return catmullRom(
    control(rail, i - 1),
    control(rail, i),
    control(rail, i + 1),
    control(rail, i + 2),
    t,
  );
}

function committedTarget(rail: Rail, index: number, gaze?: readonly Vec3[]): Vec3 {
  const pinned = gaze?.[index];
  if (pinned !== undefined) return pinned;
  const n = stopCount(rail);
  const p = stopAt(rail, index).position;
  if (n < 2) return [p[0], p[1], p[2] - 1];
  return stopAt(rail, index === n - 1 ? index - 1 : index + 1).position;
}

function anglesTo(from: Vec3, to: Vec3): Angles {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

function forward(a: Angles): Vec3 {
  const c = Math.cos(a.pitch);
  return [Math.sin(a.yaw) * c, Math.sin(a.pitch), -Math.cos(a.yaw) * c];
}

export function sampleLimits(rail: Rail, u: number): LookLimits {
  const { i, t } = locate(rail, u);
  const a = stopAt(rail, i).look;
  if (t === 0) return a;
  const b = stopAt(rail, i + 1).look;
  if (t === 1) return b;
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitchUp: lerp(a.pitchUp, b.pitchUp, t),
    pitchDown: lerp(a.pitchDown, b.pitchDown, t),
  };
}

const settle = (rail: Rail, s: RailState): RailState => ({
  ...s,
  ...settleLook(s, sampleLimits(rail, s.u)),
});

export function samplePose(rail: Rail, state: RailState, gaze?: readonly Vec3[]): Pose {
  const { i, t } = locate(rail, state.u);
  const position = samplePosition(rail, state.u);
  const limits = sampleLimits(rail, state.u);
  const look = clampLook(state.look, limits);
  if (t === 0) return { position, target: committedTarget(rail, i, gaze), limits, look };
  if (t === 1) return { position, target: committedTarget(rail, i + 1, gaze), limits, look };
  const a = anglesTo(stopAt(rail, i).position, committedTarget(rail, i, gaze));
  const b = anglesTo(stopAt(rail, i + 1).position, committedTarget(rail, i + 1, gaze));
  const w = smootherstep(t);
  const d = forward({ yaw: a.yaw + wrapArc(b.yaw - a.yaw) * w, pitch: lerp(a.pitch, b.pitch, w) });
  const target: Vec3 = [position[0] + d[0], position[1] + d[1], position[2] + d[2]];
  return { position, target, limits, look };
}

export function seedState(rail: Rail, seed: SeedInput): SeedResult {
  stopAt(rail, 0);
  if (seed.stop !== null) {
    const index = rail.stops.findIndex((s) => s.id === seed.stop);
    if (index >= 0) return { state: restingAt(stopParameter(rail, index)), source: 'stop' };
  }
  if (seed.cam !== null && Number.isFinite(seed.cam)) {
    return { state: restingAt(clamp(seed.cam, 0, 1)), source: 'cam' };
  }
  return { state: restingAt(0), source: 'entry' };
}

export function advance(rail: Rail, state: RailState, deltaMs: number): RailState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`deltaMs must be finite and non-negative, got ${deltaMs}`);
  }
  // Damping runs every frame, glide or not. At rest easeLook hands back state.look itself, so
  // the never-dragged state returns unchanged by reference and the golden poses stay bit-equal.
  const look = easeLook(state.look, state.lookTarget, deltaMs);
  const g = state.glide;
  if (g === null) return look === state.look ? state : { ...state, look };
  const { lookTarget } = state;
  const elapsedMs = g.elapsedMs + deltaMs;
  if (elapsedMs >= g.durationMs) {
    return settle(rail, { u: g.to, glide: null, look, lookTarget });
  }
  const u = lerp(g.from, g.to, smootherstep(elapsedMs / g.durationMs));
  return settle(rail, { u, glide: { ...g, elapsedMs }, look, lookTarget });
}

function glideTo(
  rail: Rail,
  state: RailState,
  to: number,
  kind: GlideKind,
  reducedMotion: boolean,
): RailState {
  if (reducedMotion || to === state.u) {
    return settle(rail, { u: to, glide: null, look: state.look, lookTarget: state.lookTarget });
  }
  const durationMs = kind === 'step' ? STEP_GLIDE_MS : SCROLL_GLIDE_MS;
  return { ...state, glide: { kind, from: state.u, to, durationMs, elapsedMs: 0 } };
}

export function stepStop(
  rail: Rail,
  state: RailState,
  direction: 1 | -1,
  reducedMotion: boolean,
): StepResult {
  const n = stopCount(rail);
  const k = (state.glide === null ? state.u : state.glide.to) * (n - 1);
  const near = Math.round(k);
  const atStop = Math.abs(k - near) < STOP_EPS;
  const index = atStop ? near + direction : direction > 0 ? Math.ceil(k) : Math.floor(k);
  if (index < 0) return { state, boundary: 'backward' };
  if (index > n - 1) return { state, boundary: 'forward' };
  const to = stopParameter(rail, index);
  return { state: glideTo(rail, state, to, 'step', reducedMotion), boundary: null };
}

export function scroll(
  rail: Rail,
  state: RailState,
  deltaPx: number,
  reducedMotion: boolean,
): RailState {
  if (!Number.isFinite(deltaPx)) throw new RangeError(`deltaPx must be finite, got ${deltaPx}`);
  const n = stopCount(rail);
  if (n < 2 || deltaPx === 0) return state;
  const g = state.glide;
  const base = g === null ? state.u : g.to;
  const to = clamp(base + deltaPx / (SCROLL_PX_PER_SEGMENT * (n - 1)), 0, 1);
  if (g !== null && g.kind === 'scroll' && !reducedMotion) return { ...state, glide: { ...g, to } };
  return glideTo(rail, state, to, 'scroll', reducedMotion);
}

/** Accumulates the drag onto `lookTarget`; the rendered `look` eases toward it in advance(). */
export function drag(
  rail: Rail,
  state: RailState,
  dxPx: number,
  dyPx: number,
  viewportHeightPx: number,
  pointerType: PointerTypeName,
): RailState {
  const unclamped = dragLook(state.lookTarget, dxPx, dyPx, viewportHeightPx, pointerType);
  return { ...state, lookTarget: clampLook(unclamped, sampleLimits(rail, state.u)) };
}
