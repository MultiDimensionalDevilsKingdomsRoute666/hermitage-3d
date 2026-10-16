// Node tests — design-sky-time.md §12. Pure modules only: no DOM, no WebGL,
// no current-clock dependency. The four dated solar fixtures are the only
// dated references; everything else follows the contract's property checks.
import { describe, expect, it } from 'vitest';
import { solarPosition } from '../src/sky/solar';

const VECTOR_TOLERANCE = 0.00001;

// design-sky-time.md §6 — exactly four dated reference vectors.
const SOLAR_VECTORS = [
  {
    label: 'June solstice, 13:00',
    epochMs: 1782036000000,
    elevationDeg: 53.498189,
    azimuthDeg: 179.788785,
  },
  {
    label: 'June solstice, 00:45',
    epochMs: 1781991900000,
    elevationDeg: -6.562633,
    azimuthDeg: 356.436275,
  },
  {
    label: 'December solstice, 13:00',
    epochMs: 1797847200000,
    elevationDeg: 6.620538,
    azimuthDeg: 180.744154,
  },
  {
    label: 'March equinox, 13:00',
    epochMs: 1774000800000,
    elevationDeg: 29.971841,
    azimuthDeg: 178.210866,
  },
] as const;

const circularError = (a: number, b: number): number =>
  Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe('solar position — contract vectors', () => {
  for (const vector of SOLAR_VECTORS) {
    it(`${vector.label} matches the contract to 1e-5°`, () => {
      const position = solarPosition(vector.epochMs);
      expect(Math.abs(position.elevationDeg - vector.elevationDeg)).toBeLessThanOrEqual(
        VECTOR_TOLERANCE,
      );
      expect(circularError(position.azimuthDeg, vector.azimuthDeg)).toBeLessThanOrEqual(
        VECTOR_TOLERANCE,
      );
    });
  }
});
