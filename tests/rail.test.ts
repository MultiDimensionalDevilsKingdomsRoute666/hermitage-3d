import { describe, expect, it } from 'vitest';
import {
  advance,
  drag,
  restingAt,
  STEP_GLIDE_MS,
  sampleLimits,
  samplePose,
  samplePosition,
  scroll,
  seedState,
  stepStop,
  stopParameter,
} from '../src/camera/rail';
import { SQUARE_RAIL, SQUARE_S0_GAZE } from '../src/camera/square-rail';
import type { Rail, Stop, Vec3 } from '../src/world/registry';

const stop = (id: string, position: Vec3, yaw = 30, pitchUp = 20, pitchDown = 10): Stop => ({
  id,
  position,
  look: { yaw, pitchUp, pitchDown },
  caption: id,
});

const STAIR: Rail = {
  stops: [
    stop('a', [0, 1.6, 0]),
    stop('b', [0, 1.6, -6]),
    stop('c', [3, 3.2, -9], 60, 40, 20),
    stop('d', [3, 4.8, -15]),
  ],
};
const LINE: Rail = { stops: [stop('p', [0, 0, 0]), stop('q', [0, 0, -10])] };
const POINT: Rail = { stops: [stop('only', [1, 2, 3])] };

const run = (rail: Rail, s: ReturnType<typeof restingAt>): ReturnType<typeof restingAt> => {
  let state = s;
  while (state.glide !== null) state = advance(rail, state, 16);
  return state;
};

describe('spline', () => {
  it('passes exactly through every stop', () => {
    STAIR.stops.forEach((s, i) => {
      expect(samplePosition(STAIR, stopParameter(STAIR, i))).toEqual(s.position);
    });
    expect(samplePosition(POINT, 0)).toEqual(POINT.stops[0]?.position);
  });
  it('is the straight segment for a two-stop rail', () => {
    const mid = samplePosition(LINE, 0.5);
    expect(mid[0]).toBeCloseTo(0);
    expect(mid[2]).toBeCloseTo(-5);
  });
  it('is continuous across a stop', () => {
    const before = samplePosition(STAIR, 1 / 3 - 1e-6);
    const at = samplePosition(STAIR, 1 / 3);
    before.forEach((v, k) => {
      expect(Math.abs(v - (at[k] ?? Number.NaN))).toBeLessThan(1e-3);
    });
  });
});

describe('committed pose law', () => {
  it('looks at the next stop and back from the last one', () => {
    const n = STAIR.stops.length;
    STAIR.stops.forEach((s, i) => {
      const pose = samplePose(STAIR, restingAt(stopParameter(STAIR, i)));
      expect(pose.position).toEqual(s.position);
      expect(pose.target).toEqual(STAIR.stops[i === n - 1 ? i - 1 : i + 1]?.position);
    });
  });
  it('keeps a unit gaze between stops', () => {
    const pose = samplePose(STAIR, restingAt(0.5));
    const d = pose.target.map((v, k) => v - (pose.position[k] ?? 0));
    expect(Math.hypot(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0)).toBeCloseTo(1);
  });
  it('honours a per-stop gaze override (the square’s authored framing)', () => {
    const gaze: readonly Vec3[] = [
      [0, 11, 0],
      [0, 1.7, 86],
    ];
    const s0 = samplePose(LINE, restingAt(0), gaze);
    const s1 = samplePose(LINE, restingAt(1), gaze);
    expect(s0.target).toEqual(gaze[0]);
    expect(s1.target).toEqual(gaze[1]);
  });
});

describe('look limits', () => {
  it('blend linearly between stops', () => {
    const lim = sampleLimits(STAIR, 0.5);
    expect(lim.yaw).toBeCloseTo(45);
    expect(lim.pitchUp).toBeCloseTo(30);
    expect(lim.pitchDown).toBeCloseTo(15);
  });
  it('clamp drag offsets', () => {
    // r21: drag accumulates the clamped TARGET; the rendered look eases in advance().
    expect(drag(STAIR, restingAt(0), 1000, -1000, 800).lookTarget).toEqual({ yaw: 30, pitch: -10 });
  });
  it('re-clamp when a glide narrows them', () => {
    const wide = drag(STAIR, restingAt(2 / 3), 2000, 0, 800);
    expect(wide.lookTarget.yaw).toBe(60);
    const back = run(STAIR, stepStop(STAIR, wide, -1, false).state);
    expect(back.look.yaw).toBe(30);
  });
  it('leave the never-dragged state bit-identical at rest (the r21 golden gate)', () => {
    const s = restingAt(0);
    expect(advance(STAIR, s, 16)).toBe(s); // the eased look hands back the same reference
  });
});

describe('keyboard stepping', () => {
  it('glides stop to stop monotonically and bounds the far end', () => {
    let state = restingAt(0);
    for (let i = 1; i < STAIR.stops.length; i++) {
      const r = stepStop(STAIR, state, 1, false);
      expect(r.boundary).toBeNull();
      let prev = r.state.u;
      state = r.state;
      while (state.glide !== null) {
        state = advance(STAIR, state, 16);
        expect(state.u).toBeGreaterThanOrEqual(prev);
        prev = state.u;
      }
      expect(state.u).toBe(stopParameter(STAIR, i));
    }
    const end = stepStop(STAIR, state, 1, false);
    expect(end.boundary).toBe('forward');
    expect(end.state).toBe(state);
  });
  it('bounds the near end and both ends of a single-stop node', () => {
    expect(stepStop(STAIR, restingAt(0), -1, false).boundary).toBe('backward');
    expect(stepStop(POINT, restingAt(0), 1, false).boundary).toBe('forward');
    expect(stepStop(POINT, restingAt(0), -1, false).boundary).toBe('backward');
  });
  it('retargets a glide in flight to the following stop', () => {
    const mid = advance(STAIR, stepStop(STAIR, restingAt(0), 1, false).state, 300);
    const second = stepStop(STAIR, mid, 1, false).state;
    expect(second.glide?.to).toBeCloseTo(2 / 3);
    expect(second.glide?.from).toBe(mid.u);
  });
});

describe('advance and reduced motion', () => {
  it('cuts instead of gliding', () => {
    const r = stepStop(STAIR, restingAt(0), 1, true);
    expect(r.state.glide).toBeNull();
    expect(r.state.u).toBe(stopParameter(STAIR, 1));
  });
  it('rejects bad deltas', () => {
    for (const d of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => advance(STAIR, restingAt(0), d)).toThrow(RangeError);
    }
  });
  it('settles exactly on the target once the duration elapses', () => {
    const done = advance(STAIR, stepStop(STAIR, restingAt(0), 1, false).state, STEP_GLIDE_MS);
    expect(done.glide).toBeNull();
    expect(done.u).toBe(stopParameter(STAIR, 1));
  });
});

describe('scroll', () => {
  it('clamps at both ends without a boundary', () => {
    expect(scroll(LINE, restingAt(1), 10_000, true).u).toBe(1);
    expect(scroll(LINE, restingAt(0), -10_000, true).u).toBe(0);
  });
  it('extends a scroll glide in flight', () => {
    const first = scroll(LINE, restingAt(0), 90, false);
    const second = scroll(LINE, advance(LINE, first, 50), 90, false);
    expect(second.glide?.to).toBeCloseTo(0.2);
    expect(second.glide?.from).toBe(0);
  });
  it('does nothing on a single-stop node', () => {
    const rest = restingAt(0);
    expect(scroll(POINT, rest, 500, false)).toBe(rest);
  });
});

describe('seed precedence', () => {
  it('stop beats cam, unknown stop falls to cam, cam clamps, else entry', () => {
    expect(seedState(STAIR, { stop: 'c', cam: 0.1 })).toEqual({
      state: restingAt(stopParameter(STAIR, 2)),
      source: 'stop',
    });
    expect(seedState(STAIR, { stop: 'nope', cam: 0.1 }).source).toBe('cam');
    expect(seedState(STAIR, { stop: null, cam: 7 }).state.u).toBe(1);
    expect(seedState(STAIR, { stop: null, cam: null })).toEqual({
      state: restingAt(0),
      source: 'entry',
    });
  });
});

describe('square rail (design §6.1, declared data)', () => {
  it('pins the two declared stops', () => {
    expect(SQUARE_RAIL.stops.map((s) => s.id)).toEqual(['S0', 'S1']);
    expect(SQUARE_RAIL.stops[0]?.position).toEqual([0, 1.7, 230]);
    expect(SQUARE_RAIL.stops[0]?.look).toEqual({ yaw: 35, pitchUp: 35, pitchDown: 35 });
    expect(SQUARE_RAIL.stops[0]?.caption).toBe('the facade and the hour');
    expect(SQUARE_RAIL.stops[1]?.position).toEqual([0, 1.7, 100]);
    expect(SQUARE_RAIL.stops[1]?.look).toEqual({ yaw: 25, pitchUp: 20, pitchDown: 10 });
    expect(SQUARE_RAIL.stops[1]?.caption).toBe('the arch opens');
  });
  it('keeps the authored S0 gaze and a level approach gaze at S1', () => {
    const gaze: readonly Vec3[] = [SQUARE_S0_GAZE, [0, 1.7, 86]];
    const s0 = samplePose(SQUARE_RAIL, restingAt(0), gaze);
    expect(s0.target).toEqual(SQUARE_S0_GAZE);
    const s1 = samplePose(SQUARE_RAIL, restingAt(1), gaze);
    expect(s1.target).toEqual([0, 1.7, 86]);
  });
});

describe('purity', () => {
  const sources = import.meta.glob('../src/camera/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const stripLiterals = (src: string): string =>
    stripComments(src)
      .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '');
  it('loads the module source', () => {
    expect(Object.keys(sources)).toHaveLength(4); // rail + square-rail + cam-param + look (r21)
  });
  it('imports nothing from three or node', () => {
    for (const src of Object.values(sources)) {
      const code = stripComments(src);
      expect(code).not.toMatch(/from\s+['"]three/);
      expect(code).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code).not.toMatch(/['"]node:/);
    }
  });
  it('touches no DOM, storage, clock, timer or randomness', () => {
    const forbidden = [
      /\bdocument\b/,
      /\bwindow\b/,
      /\bglobalThis\b/,
      /\bself\b/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bnavigator\b/,
      /\bDate\b/,
      /Math\.random/,
      /\bperformance\b/,
      /requestAnimationFrame/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
      /\bfetch\b/,
      /\bconsole\b/,
    ];
    for (const src of Object.values(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, String(re)).not.toMatch(re);
    }
  });
});
