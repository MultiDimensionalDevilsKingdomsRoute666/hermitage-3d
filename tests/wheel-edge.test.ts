import { describe, expect, it } from 'vitest';

import {
  EDGE_BUDGET_PX,
  EDGE_MAX_EVENT_PX,
  EDGE_SUSTAIN_MS,
  WHEEL_EDGE_START,
  wheelEdge,
} from '../src/camera/wheel-edge';

const T0 = 1_000;
const feed = (
  state: { budget: number; sinceMs: number | null; peakPx: number },
  d: number,
  dt: number,
) => wheelEdge(state, { pastBoundary: true, deltaPx: d, nowMs: T0 + dt });

describe('§3 wheel-edge: the boundary pass fires on deliberate sustained scrolling', () => {
  it('fires after the budget and the sustain window are both met', () => {
    const small = 60;
    let state = WHEEL_EDGE_START;
    let fire = false;
    for (let i = 0; i < 12; i += 1) {
      // 11 events of 60 px = 660 px, the last at 11 x 45 ms… the stream stays sustained.
      const step = feed({ ...state }, small, i * 45);
      state = step.state;
      fire = step.fire;
    }
    expect(state.budget).toBeGreaterThanOrEqual(EDGE_BUDGET_PX);
    expect(T0 + 11 * 45 - (state.sinceMs ?? T0)).toBeGreaterThanOrEqual(EDGE_SUSTAIN_MS);
    expect(fire).toBe(true);
  });

  it('restarts the pass on a fast burst (the momentum opening event)', () => {
    const step = feed(WHEEL_EDGE_START, EDGE_MAX_EVENT_PX + 40, 0);
    expect(step.fire).toBe(false);
    expect(step.state).toEqual(WHEEL_EDGE_START);
  });

  it('rejects the momentum tail: fast events reset, a short pass never fires', () => {
    const streamline = WHEEL_EDGE_START;
    // A momentum tail after a flick: one slow event then the burst stops fast-regenerating.
    const slow = feed(streamline, 90, 0);
    expect(slow.state.budget).toBe(90);
    const burst = feed(slow.state, EDGE_MAX_EVENT_PX, 30);
    expect(burst.state).toEqual(WHEEL_EDGE_START);
  });

  it('never fires before the sustain window even with a full budget of legal events', () => {
    // Nine 80 px events land 720 px in 320 ms — over the budget, under the window.
    let state = WHEEL_EDGE_START;
    for (let i = 0; i < 9; i += 1) {
      const step = feed({ ...state }, 80, i * 40);
      state = step.state;
      expect(step.fire).toBe(false);
    }
    expect(state.budget).toBe(9 * 80);
    expect(state.peakPx).toBe(80);
  });

  it('clears the accumulator outside a boundary pass', () => {
    const step = wheelEdge(
      { budget: 900, sinceMs: T0, peakPx: 90 },
      {
        pastBoundary: false,
        deltaPx: 90,
        nowMs: T0 + 100,
      },
    );
    expect(step.state).toEqual(WHEEL_EDGE_START);
    expect(step.fire).toBe(false);
    expect(wheelEdge(WHEEL_EDGE_START, { pastBoundary: true, deltaPx: 0, nowMs: T0 }).fire).toBe(
      false,
    );
  });

  it('demands finite time and deltas, loud', () => {
    expect(() =>
      wheelEdge(WHEEL_EDGE_START, { pastBoundary: true, deltaPx: Number.NaN, nowMs: T0 }),
    ).toThrow(RangeError);
    expect(() =>
      wheelEdge(WHEEL_EDGE_START, {
        pastBoundary: true,
        deltaPx: 10,
        nowMs: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(RangeError);
  });
});
