import { describe, expect, it } from 'vitest';

import {
  advanceLean,
  LEAN_FRESH_MS,
  LEAN_MAX_M,
  LEAN_RELEASE_MS,
  LEAN_RISE_MS,
  LEAN_START,
  leanPose,
  leanTarget,
} from '../src/camera/door-lean';
import { EDGE_BUDGET_PX } from '../src/camera/wheel-edge';

const run = (budget: number, frames: number, dt: number, reducedMotion = false, fresh = true) => {
  let state = LEAN_START;
  for (let i = 0; i < frames; i += 1) {
    state = advanceLean(state, { budget, fresh, deltaMs: dt, reducedMotion });
  }
  return state;
};

describe('§2 door lean: a dolly ∝ budget / EDGE_BUDGET_PX, sprung, exactly zero at rest', () => {
  it('targets a fraction of the full lean and clamps at the budget', () => {
    expect(leanTarget(0, true, false)).toBe(0);
    expect(leanTarget(EDGE_BUDGET_PX / 2, true, false)).toBeCloseTo(LEAN_MAX_M / 2, 12);
    expect(leanTarget(EDGE_BUDGET_PX * 3, true, false)).toBe(LEAN_MAX_M);
  });

  it('rises quickly toward the target and holds while the pass holds its budget', () => {
    const rising = run(EDGE_BUDGET_PX, 1, LEAN_RISE_MS);
    expect(rising.metres).toBeCloseTo(LEAN_MAX_M * (1 - Math.exp(-1)), 9);
    const held = run(EDGE_BUDGET_PX, 60, 16);
    expect(held.metres).toBe(LEAN_MAX_M);
    expect(
      advanceLean(held, {
        budget: EDGE_BUDGET_PX,
        fresh: true,
        deltaMs: 16,
        reducedMotion: false,
      }),
    ).toBe(held);
  });

  it('springs back slower than it rose and lands on exactly zero', () => {
    const full = { metres: LEAN_MAX_M };
    const back = advanceLean(full, {
      budget: 0,
      fresh: true,
      deltaMs: LEAN_RELEASE_MS,
      reducedMotion: false,
    });
    expect(back.metres).toBeCloseTo(LEAN_MAX_M * Math.exp(-1), 9);
    expect(LEAN_RELEASE_MS).toBeGreaterThan(LEAN_RISE_MS);
    let state = full;
    for (let i = 0; i < 200; i += 1) {
      state = advanceLean(state, { budget: 0, fresh: true, deltaMs: 16, reducedMotion: false });
    }
    expect(state.metres).toBe(0);
  });

  it('releases when the pass goes stale: the budget persists, the freshness does not', () => {
    // The pass's budget persists across silent gaps (the fire law survives a scroll
    // stream's glide), so staleness is the lean's own read: past LEAN_FRESH_MS the
    // target is 0 whatever the budget — the paused press springs back.
    expect(leanTarget(EDGE_BUDGET_PX, false, false)).toBe(0);
    const held = run(EDGE_BUDGET_PX, 60, 16);
    const stale = advanceLean(held, {
      budget: EDGE_BUDGET_PX,
      fresh: false,
      deltaMs: LEAN_FRESH_MS + 16,
      reducedMotion: false,
    });
    expect(stale.metres).toBeLessThan(held.metres);
    let state = stale;
    for (let i = 0; i < 200; i += 1) {
      state = advanceLean(state, {
        budget: EDGE_BUDGET_PX,
        fresh: false,
        deltaMs: 16,
        reducedMotion: false,
      });
    }
    expect(state.metres).toBe(0);
  });

  it('is absent under reduced motion and at rest hands back the same state', () => {
    expect(run(EDGE_BUDGET_PX, 5, 16, true)).toBe(LEAN_START);
    expect(
      advanceLean(LEAN_START, { budget: 0, fresh: true, deltaMs: 16, reducedMotion: false }),
    ).toBe(LEAN_START);
  });

  it('leanPose dollies position and target together and is identity at zero', () => {
    const pose = { position: [0, 1.7, 86] as const, target: [0, 1.7, 90] as const };
    expect(leanPose(pose, [0, 0, 1], 0)).toBe(pose);
    const leaned = leanPose(pose, [0, 0, 1], 0.2);
    expect(leaned.position).toEqual([0, 1.7, 86.2]);
    expect(leaned.target).toEqual([0, 1.7, 90.2]);
    expect(() => leanPose(pose, [0, 0, 2], 0.2)).toThrow(RangeError);
    expect(() => leanPose(pose, [0, 0, 1], -0.1)).toThrow(RangeError);
  });

  it('demands finite non-negative time and budget, loud', () => {
    expect(() =>
      advanceLean(LEAN_START, { budget: -1, fresh: true, deltaMs: 16, reducedMotion: false }),
    ).toThrow(RangeError);
    expect(() =>
      advanceLean(LEAN_START, { budget: 0, fresh: true, deltaMs: -1, reducedMotion: false }),
    ).toThrow(RangeError);
  });
});
