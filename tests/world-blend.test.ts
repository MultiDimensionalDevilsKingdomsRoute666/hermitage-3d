// tests/world-blend.test.ts
/**
 * src/world/blend.ts — design-staircase §4 / §4.1 state selection and §8 consumption.
 * Node-style Vitest; no three, no jsdom.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { blendPayload, STATE_ORDER, stateOfPath } from '../src/world/blend';

describe('blendPayload', () => {
  it('one-hot plateaus bind a single state with b = null', () => {
    expect(blendPayload({ day: 1, dusk: 0, nightChandeliers: 0 })).toEqual({
      a: 'day',
      b: null,
      wA: 1,
      wB: 0,
    });
    expect(blendPayload({ day: 0, dusk: 1, nightChandeliers: 0 })).toEqual({
      a: 'dusk',
      b: null,
      wA: 1,
      wB: 0,
    });
    expect(blendPayload({ day: 0, dusk: 0, nightChandeliers: 1 })).toEqual({
      a: 'nightChandeliers',
      b: null,
      wA: 1,
      wB: 0,
    });
  });
  it('mid-seam pairs come out sorted descending', () => {
    expect(blendPayload({ day: 0.25, dusk: 0.75, nightChandeliers: 0 })).toEqual({
      a: 'dusk',
      b: 'day',
      wA: 0.75,
      wB: 0.25,
    });
    expect(blendPayload({ day: 0, dusk: 0.1, nightChandeliers: 0.9 })).toEqual({
      a: 'nightChandeliers',
      b: 'dusk',
      wA: 0.9,
      wB: 0.1,
    });
  });
  it('wA + wB equals the sum of the two bound weights', () => {
    const p = blendPayload({ day: 0.4, dusk: 0.6, nightChandeliers: 0 });
    expect(p.wA + p.wB).toBeCloseTo(1, 12);
  });
  it('ties break by STATE_ORDER', () => {
    expect(STATE_ORDER).toEqual(['day', 'dusk', 'nightChandeliers']);
    const dayDusk = blendPayload({ day: 0.5, dusk: 0.5, nightChandeliers: 0 });
    expect([dayDusk.a, dayDusk.b]).toEqual(['day', 'dusk']);
    const duskNight = blendPayload({ day: 0, dusk: 0.5, nightChandeliers: 0.5 });
    expect([duskNight.a, duskNight.b]).toEqual(['dusk', 'nightChandeliers']);
    const dayNight = blendPayload({ day: 0.5, dusk: 0, nightChandeliers: 0.5 });
    expect([dayNight.a, dayNight.b]).toEqual(['day', 'nightChandeliers']);
  });
  it('throws RangeError on NaN, negative and Σ ≠ 1', () => {
    expect(() => blendPayload({ day: Number.NaN, dusk: 0, nightChandeliers: 1 })).toThrow(
      RangeError,
    );
    expect(() =>
      blendPayload({ day: Number.POSITIVE_INFINITY, dusk: 0, nightChandeliers: 0 }),
    ).toThrow(RangeError);
    expect(() => blendPayload({ day: -0.1, dusk: 1.1, nightChandeliers: 0 })).toThrow(RangeError);
    expect(() => blendPayload({ day: 0.5, dusk: 0.4, nightChandeliers: 0 })).toThrow(RangeError);
    expect(() => blendPayload({ day: 0.5, dusk: 0.5, nightChandeliers: 0.5 })).toThrow(RangeError);
  });
  it('tolerates float drift within 1e-6', () => {
    expect(() => blendPayload({ day: 0.3, dusk: 0.7 + 5e-7, nightChandeliers: 0 })).not.toThrow();
  });
});

describe('stateOfPath', () => {
  it('maps the three lm rows to their states', () => {
    expect(stateOfPath('lm/day.ktx2')).toBe('day');
    expect(stateOfPath('lm/dusk.ktx2')).toBe('dusk');
    expect(stateOfPath('lm/night.ktx2')).toBe('nightChandeliers');
  });
  it('returns null for non-lightmap rows', () => {
    expect(stateOfPath('tex/gilt.ktx2')).toBeNull();
    expect(stateOfPath('probe/dusk.ktx2')).toBeNull();
    expect(stateOfPath('')).toBeNull();
    expect(stateOfPath('constructor')).toBeNull();
  });
});

describe('purity of src/world/blend.ts', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../src/world/blend.ts', import.meta.url)),
    'utf8',
  );
  const noComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const noStrings = noComments
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  it('imports nothing from three or node', () => {
    expect(noComments).not.toMatch(/from\s+['"]three/);
    expect(noComments).not.toMatch(/['"]node:/);
    expect(noComments).not.toMatch(/from\s+['"](?!\.\/registry['"])/);
  });
  it('touches no DOM, clock or randomness', () => {
    expect(noStrings).not.toMatch(/\b(document|window|localStorage|performance|Date|setTimeout)\b/);
    expect(noStrings).not.toMatch(/Math\.random/);
  });
});
