// tests/world-airlock.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { advanceTransit, beginTransit, finishTransit } from '../src/world/airlock';
import type { AirlockDef, Bounds } from '../src/world/registry';

const box: Bounds = { min: [0, 0, 0], max: [1, 1, 1] };
const def: AirlockDef = {
  id: 'gallery-airlock',
  from: 'rastrelli-gallery',
  to: 'jordan',
  portalFrom: box,
  portalTo: box,
  transit: 'doorway',
  holdMs: 900,
};
const begin = (from: 'rastrelli-gallery' | null = 'rastrelli-gallery', reducedMotion = false) =>
  beginTransit({ airlock: def, from, reducedMotion });

describe('beginTransit', () => {
  it('opens a hold with the def hold', () => {
    const s = begin();
    expect(s).toMatchObject({ phase: 'hold', holdMs: 900, elapsedMs: 0, to: 'jordan' });
  });
  it('reduced motion forces a zero-hold cut', () => {
    expect(begin('rastrelli-gallery', true)).toMatchObject({ transit: 'cut', holdMs: 0 });
  });
  it('derives the far side relative to from — one def serves both directions', () => {
    const back = beginTransit({ airlock: def, from: 'jordan', reducedMotion: false });
    expect(back).toMatchObject({ to: 'rastrelli-gallery' });
    const cold = beginTransit({ airlock: def, from: null, reducedMotion: false });
    expect(cold).toMatchObject({ to: 'jordan', from: null });
  });
});

describe('advanceTransit', () => {
  it('accrues elapsed without events while data is not ready', () => {
    const r = advanceTransit(begin(), 100, false);
    expect(r.state).toMatchObject({ phase: 'hold', elapsedMs: 100 });
    expect(r.events).toEqual([]);
  });
  it('throws on non-finite or negative delta', () => {
    expect(() => advanceTransit(begin(), Number.NaN, false)).toThrow();
    expect(() => advanceTransit(begin(), -1, false)).toThrow();
  });
  it('emits upload-swap exactly once', () => {
    const first = advanceTransit(begin(), 10, true);
    expect(first.events).toEqual(['upload-swap']);
    expect(advanceTransit(first.state, 10, true).events).toEqual([]);
  });
  it('exits with dispose-from when something was mounted', () => {
    const r = advanceTransit(begin(), 900, true);
    expect(r.state.phase).toBe('exit');
    expect(r.events).toEqual(['upload-swap', 'dispose-from']);
  });
  it('cold entry exits without dispose-from', () => {
    const r = advanceTransit(begin(null), 900, true);
    expect(r.state.phase).toBe('exit');
    expect(r.events).toEqual(['upload-swap']);
  });
  it('dwells past holdMs until data is ready', () => {
    const late = advanceTransit(begin(), 1500, false);
    expect(late.state).toMatchObject({ phase: 'hold', elapsedMs: 1500 });
    const out = advanceTransit(late.state, 16, true);
    expect(out.state.phase).toBe('exit');
    expect(out.state.phase === 'exit' && out.state.elapsedMs > 900).toBe(true);
  });
  it('exit is terminal in place', () => {
    const exit = advanceTransit(begin(), 900, true).state;
    const again = advanceTransit(exit, 500, true);
    expect(again.state).toBe(exit);
    expect(again.events).toEqual([]);
  });
});

describe('finishTransit', () => {
  it('exit → idle, hold throws', () => {
    const exit = advanceTransit(begin(), 900, true).state;
    expect(finishTransit(exit)).toEqual({ phase: 'idle' });
    expect(finishTransit({ phase: 'idle' })).toEqual({ phase: 'idle' });
    expect(() => finishTransit(begin())).toThrow();
  });
});

describe('purity', () => {
  it('imports no three/node and touches no host globals', () => {
    const src = readFileSync(new URL('../src/world/airlock.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/from\s+['"]three/);
    expect(src).not.toMatch(/from\s+['"]node:/);
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
    expect(stripped).not.toMatch(/\b(document|window|localStorage|performance|Date|setTimeout)\b/);
    expect(stripped).not.toMatch(/Math\.random/);
  });
});
