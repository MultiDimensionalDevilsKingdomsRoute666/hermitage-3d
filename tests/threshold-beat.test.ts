// tests/threshold-beat.test.ts
import { describe, expect, it } from 'vitest';
import type { Bounds, Vec3 } from '../src/world/registry';
import type { BeatPose } from '../src/world/threshold-beat';
import {
  ARRIVE_TRAVEL_MAX_M,
  arrivePose,
  beatExposure,
  DEPART_STANDOFF_M,
  DEPART_TRAVEL_MAX_M,
  departPose,
} from '../src/world/threshold-beat';

const portal: Bounds = { min: [-1, 0, -6], max: [1, 3, -4] }; // centre [0, 1.5, -5]
const stop: BeatPose = { position: [0, 1.6, 0], target: [0, 1.4, -2] };
const tangent: Vec3 = [0, 0, -1];
const entryPortal: Bounds = { min: [-1, 0, -1], max: [1, 3, 1] }; // centre [0, 1.5, 0]
const entry: BeatPose = { position: [0, 1.6, 6], target: [0, 1.5, 10] };
const steps = Array.from({ length: 11 }, (_, i) => i / 10);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const monotone = (xs: readonly number[], sign: 1 | -1) =>
  xs.every((x, i) => i === 0 || sign * (x - (xs[i - 1] ?? x)) >= 0);

describe('departPose', () => {
  it('progress 0 returns the door stop bit-identically', () => {
    const p = departPose({ stop, tangent, portal, progress: 0 });
    expect(p.position).toBe(stop.position);
    expect(p.target).toBe(stop.target);
  });
  it('covers at most the travel cap along the tangent, monotonically, never overshooting', () => {
    const zs = steps.map((progress) => departPose({ stop, tangent, portal, progress }).position[2]);
    expect(monotone(zs, -1)).toBe(true);
    const last = zs[10] ?? 0;
    expect(last).toBeCloseTo(-DEPART_TRAVEL_MAX_M, 9);
    expect(departPose({ stop, tangent, portal, progress: 1.4 }).position[2]).toBeCloseTo(last, 9);
  });
  it('halts the standoff short of the plane when the stop is close', () => {
    const closePortal: Bounds = { min: [-1, 0, -4], max: [1, 3, -2] }; // centre [0, 1.5, -3]
    const p = departPose({ stop, tangent, portal: closePortal, progress: 1 });
    // toPlane = 3 → travel = 3 − 1.5 = 1.5 → the halt sits 1.5 m short of the plane at z −3.
    expect(p.position[2]).toBeCloseTo(-3 + DEPART_STANDOFF_M, 9);
  });
  it('the gaze glides to the portal centre', () => {
    const t = departPose({ stop, tangent, portal, progress: 1 }).target;
    expect(dist(t, [0, 1.5, -5])).toBeCloseTo(0, 9);
  });
  it('a tangent pointing away from the portal yields no travel', () => {
    for (const progress of steps) {
      const p = departPose({ stop, tangent: [0, 0, 1], portal, progress });
      expect(p.position).toEqual(stop.position);
    }
  });
  it('fails loud on malformed input', () => {
    expect(() => departPose({ stop, tangent: [0, 0, -2], portal, progress: 0.5 })).toThrow();
    expect(() => departPose({ stop, tangent, portal, progress: Number.NaN })).toThrow();
    const bad: BeatPose = { position: [0, Number.POSITIVE_INFINITY, 0], target: stop.target };
    expect(() => departPose({ stop: bad, tangent, portal, progress: 0.5 })).toThrow();
  });
});

describe('arrivePose', () => {
  it('progress ≥ 1 returns the entry stop bit-identically', () => {
    for (const progress of [1, 1.3]) {
      const p = arrivePose({ portal: entryPortal, stop: entry, progress });
      expect(p.position).toBe(entry.position);
      expect(p.target).toBe(entry.target);
    }
  });
  it('starts a few metres back toward the portal and glides in, gaze held', () => {
    const poses = steps.map((progress) =>
      arrivePose({ portal: entryPortal, stop: entry, progress }),
    );
    const start = poses[0]?.position ?? entry.position;
    // d ≈ 6 m > the cap → the start sits ARRIVE_TRAVEL_MAX_M back from the stop, portal side.
    expect(dist(start, entry.position)).toBeCloseTo(ARRIVE_TRAVEL_MAX_M, 9);
    expect(start[2]).toBeGreaterThan(0);
    expect(
      monotone(
        poses.map((p) => p.position[2]),
        1,
      ),
    ).toBe(true);
    for (const p of poses) expect(p.target).toBe(entry.target);
  });
  it('a stop near the portal starts at the portal centre — the glide crosses the doorway', () => {
    const near: BeatPose = { position: [0, 1.5, 1], target: entry.target };
    const poses = steps.map((progress) =>
      arrivePose({ portal: entryPortal, stop: near, progress }),
    );
    const start = poses[0]?.position ?? near.position;
    expect(dist(start, [0, 1.5, 0])).toBeCloseTo(0, 9);
    expect(
      monotone(
        poses.map((p) => p.position[2]),
        1,
      ),
    ).toBe(true);
  });
  it('a stop already at the portal centre holds', () => {
    const at: BeatPose = { position: [0, 1.5, 0], target: entry.target };
    for (const progress of steps) {
      expect(arrivePose({ portal: entryPortal, stop: at, progress }).position).toEqual(at.position);
    }
  });
  it('fails loud on malformed input', () => {
    expect(() => arrivePose({ portal: entryPortal, stop: entry, progress: Number.NaN })).toThrow();
  });
});

describe('beatExposure', () => {
  const base = { fromExposure: 0.37, toExposure: 1 } as const;
  it('card is exactly 0 at any progress', () => {
    for (const progress of [0, 0.5, 1, 7]) {
      expect(beatExposure({ ...base, phase: 'card', progress })).toBe(0);
    }
  });
  it('depart drains monotonically from fromExposure to exactly 0', () => {
    const xs = steps.map((progress) => beatExposure({ ...base, phase: 'depart', progress }));
    expect(xs[0]).toBe(base.fromExposure);
    expect(xs[10]).toBe(0);
    expect(monotone(xs, -1)).toBe(true);
  });
  it('arrive ramps monotonically from exactly 0 to toExposure', () => {
    const xs = steps.map((progress) => beatExposure({ ...base, phase: 'arrive', progress }));
    expect(xs[0]).toBe(0);
    expect(xs[10]).toBe(base.toExposure);
    expect(monotone(xs, 1)).toBe(true);
    expect(beatExposure({ ...base, phase: 'arrive', progress: 2 })).toBe(base.toExposure);
  });
  it('fails loud on malformed input', () => {
    expect(() => beatExposure({ ...base, phase: 'depart', progress: Number.NaN })).toThrow();
    expect(() =>
      beatExposure({ phase: 'arrive', progress: 0.5, fromExposure: -1, toExposure: 1 }),
    ).toThrow();
    expect(() =>
      beatExposure({ phase: 'arrive', progress: 0.5, fromExposure: 1, toExposure: Number.NaN }),
    ).toThrow();
  });
});
