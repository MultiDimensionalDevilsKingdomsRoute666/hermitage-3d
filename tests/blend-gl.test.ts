// tests/blend-gl.test.ts
// §5 scalar law gates: eff(s) = whitePoint(s) × INTERIOR_LOOK_GAIN[room][s], every factor
// finite and > 0. blend-gl is three-bound (node import of three is fine); no renderer, no DOM.
import { describe, expect, it, vi } from 'vitest';
import { effectiveIntensities } from '../src/assets/blend-gl';

const JORDAN = { day: 0.1, dusk: 0.1, nightChandeliers: 3.0 } as const;
// The committed gallery record (R-UX4): all three states encode at the shared white point 0.2
// (public/assets/rastrelli-gallery/manifest.json is the source of truth this fixture mirrors).
const GALLERY = { day: 0.2, dusk: 0.2, nightChandeliers: 0.2 } as const;
const PRECISION = 12;

describe('effectiveIntensities', () => {
  it('jordan: white points × gains 4/3/1', () => {
    const eff = effectiveIntensities('jordan', JORDAN);
    expect(eff.day).toBeCloseTo(0.4, PRECISION);
    expect(eff.dusk).toBeCloseTo(0.3, PRECISION);
    expect(eff.nightChandeliers).toBeCloseTo(3.0, PRECISION);
  });
  it('rastrelli-gallery: shared white point × gains 3/3/2.75', () => {
    const eff = effectiveIntensities('rastrelli-gallery', GALLERY);
    expect(eff.day).toBeCloseTo(0.6, PRECISION);
    expect(eff.dusk).toBeCloseTo(0.6, PRECISION);
    expect(eff.nightChandeliers).toBeCloseTo(0.55, PRECISION);
  });
  it('R-UX4 ceiling law: gallery max eff = the dusk value, and night < day per texel', () => {
    const eff = effectiveIntensities('rastrelli-gallery', GALLERY);
    expect(eff.dusk).toBe(Math.max(eff.day, eff.dusk, eff.nightChandeliers));
    expect(eff.nightChandeliers).toBeLessThan(eff.day);
  });
  it('returns a fresh record covering exactly the three states', () => {
    const eff = effectiveIntensities('jordan', JORDAN);
    expect(Object.keys(eff).sort()).toEqual(['day', 'dusk', 'nightChandeliers']);
    expect(eff).not.toBe(JORDAN);
  });
  it('a zero white-point entry throws RangeError naming the state', () => {
    const bad = { ...JORDAN, dusk: 0 };
    expect(() => effectiveIntensities('jordan', bad)).toThrow(RangeError);
    expect(() => effectiveIntensities('jordan', bad)).toThrow(/whitePoint\[dusk\]/);
  });
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'a non-finite or negative white point (%s) throws RangeError naming the state',
    (value) => {
      const bad = { ...GALLERY, nightChandeliers: value };
      expect(() => effectiveIntensities('rastrelli-gallery', bad)).toThrow(RangeError);
      expect(() => effectiveIntensities('rastrelli-gallery', bad)).toThrow(
        /whitePoint\[nightChandeliers\]/,
      );
    },
  );
  it('a zero look-gain entry throws RangeError naming the state', async () => {
    vi.resetModules();
    vi.doMock('../src/content/lightmap-look', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/content/lightmap-look')>();
      return {
        ...actual,
        INTERIOR_LOOK_GAIN: {
          ...actual.INTERIOR_LOOK_GAIN,
          jordan: { ...actual.INTERIOR_LOOK_GAIN.jordan, day: 0 },
        },
      };
    });
    try {
      const mocked = await import('../src/assets/blend-gl');
      expect(() => mocked.effectiveIntensities('jordan', JORDAN)).toThrow(RangeError);
      expect(() => mocked.effectiveIntensities('jordan', JORDAN)).toThrow(/lookGain\[day\]/);
    } finally {
      vi.doUnmock('../src/content/lightmap-look');
      vi.resetModules();
    }
  });
});
