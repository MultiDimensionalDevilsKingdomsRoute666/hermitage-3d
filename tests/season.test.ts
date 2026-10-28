// tests/season.test.ts
import { describe, expect, it } from 'vitest';
import { TIME } from '../src/content/sky-time';
import {
  isSeasonId,
  SEASON_ANCHORS,
  SEASON_IDS,
  type SeasonId,
  seasonInstant,
  seasonOf,
} from '../src/sky/season';
import { snowWeight } from '../src/world/snow-season';

const utc = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): number => Date.UTC(year, month - 1, day, hour, minute, second, ms);

const HOURS = Array.from({ length: 24 }, (_, h) => h);

describe('seasonOf — meteorological seasons by the local (+03) date', () => {
  it('straddles the UTC/local midnight at the Feb/Mar seam', () => {
    expect(seasonOf(utc(2026, 2, 28, 20, 59))).toBe('winter'); // Feb 28 23:59 +03
    expect(seasonOf(utc(2026, 2, 28, 21, 0))).toBe('spring'); // Mar 1 00:00 +03
  });

  it('turns at the other three local month boundaries', () => {
    expect(seasonOf(utc(2026, 5, 31, 20, 59))).toBe('spring');
    expect(seasonOf(utc(2026, 5, 31, 21, 0))).toBe('summer');
    expect(seasonOf(utc(2026, 8, 31, 20, 59))).toBe('summer');
    expect(seasonOf(utc(2026, 8, 31, 21, 0))).toBe('autumn');
    expect(seasonOf(utc(2026, 11, 30, 20, 59))).toBe('autumn');
    expect(seasonOf(utc(2026, 11, 30, 21, 0))).toBe('winter');
  });

  it('reads winter across the civil year end', () => {
    expect(seasonOf(utc(2026, 12, 31, 20, 59))).toBe('winter');
    expect(seasonOf(utc(2026, 12, 31, 21, 0))).toBe('winter'); // Jan 1 00:00 +03
    expect(seasonOf(utc(2027, 1, 1, 12))).toBe('winter');
  });

  it('reads all four seasons mid-month', () => {
    expect(seasonOf(utc(2026, 1, 15, 12))).toBe('winter');
    expect(seasonOf(utc(2026, 4, 15, 12))).toBe('spring');
    expect(seasonOf(utc(2026, 7, 15, 12))).toBe('summer');
    expect(seasonOf(utc(2026, 10, 15, 12))).toBe('autumn');
  });

  it('reads the golden instants', () => {
    expect(seasonOf(utc(2026, 6, 21, 12))).toBe('summer');
    expect(seasonOf(utc(2026, 12, 21, 10))).toBe('winter');
    expect(seasonOf(utc(2026, 10, 15, 20))).toBe('autumn');
  });

  it('deliberately differs from the snow seams: Mar 5 is spring with full snow', () => {
    const mar5 = utc(2026, 3, 5, 12);
    expect(seasonOf(mar5)).toBe('spring');
    expect(snowWeight(mar5)).toBe(1);
  });
});

describe('seasonInstant — the anchor day in the local year at the local time of day', () => {
  it('moves the June golden to the winter anchor at the same clock time', () => {
    expect(seasonInstant(utc(2026, 6, 21, 12), 'winter')).toBe(utc(2026, 1, 15, 12));
  });

  it('moves the December golden to the summer anchor at the same clock time', () => {
    expect(seasonInstant(utc(2026, 12, 21, 10), 'summer')).toBe(utc(2026, 6, 21, 10));
  });

  it('keeps the local year when the source is January or February (the March-based year)', () => {
    expect(seasonInstant(utc(2026, 1, 15, 12), 'summer')).toBe(utc(2026, 6, 21, 12));
    expect(seasonInstant(utc(2026, 2, 10, 6), 'autumn')).toBe(utc(2026, 10, 15, 6));
  });

  it('preserves the time of day to the second (and the millisecond)', () => {
    expect(seasonInstant(utc(2026, 6, 21, 3, 18, 45), 'autumn')).toBe(utc(2026, 10, 15, 3, 18, 45));
    expect(seasonInstant(utc(2026, 6, 21, 3, 18, 45, 123), 'spring')).toBe(
      utc(2026, 5, 15, 3, 18, 45, 123),
    );
  });

  it('uses the LOCAL civil year across the UTC/local straddle', () => {
    // 2026-12-31T21:30Z is 2027-01-01 00:30 +03: the local year is 2027, and Jun 21 00:30 +03
    // is Jun 20 21:30Z.
    expect(seasonInstant(utc(2026, 12, 31, 21, 30), 'summer')).toBe(utc(2027, 6, 20, 21, 30));
    // 2026-12-31T20:30Z is still Dec 31 23:30 +03 of 2026: the anchor is Jun 21 at 23:30
    // local, which stays inside Jun 21 in UTC (23:30 − 3h = 20:30Z).
    expect(seasonInstant(utc(2026, 12, 31, 20, 30), 'summer')).toBe(utc(2026, 6, 21, 20, 30));
  });

  it('is a fixed point on its own anchors and round-trips through seasonOf', () => {
    const sources = [
      utc(2026, 1, 15, 12),
      utc(2026, 6, 22, 3, 18),
      utc(2026, 12, 31, 21, 30),
      utc(1950, 4, 1, 23),
      utc(2080, 8, 31, 20, 59),
    ];
    for (const source of sources) {
      for (const season of SEASON_IDS) {
        const target = seasonInstant(source, season);
        expect(seasonOf(target)).toBe(season);
        expect(seasonInstant(target, season)).toBe(target);
      }
    }
  });

  it('leaves the supported epoch only from the last three local hours of 2099', () => {
    // the host refuses this instant (state unchanged, select re-synced, one console.warn)
    const edge = utc(2099, 12, 31, 22); // 2100-01-01 01:00 +03
    expect(edge).toBeLessThan(TIME.maxEpochMsExclusive);
    expect(seasonInstant(edge, 'winter')).toBeGreaterThanOrEqual(TIME.maxEpochMsExclusive);
    // the first supported instant resolves inside the bounds for every season
    for (const season of SEASON_IDS) {
      const target = seasonInstant(TIME.minEpochMs, season);
      expect(target).toBeGreaterThanOrEqual(TIME.minEpochMs);
      expect(target).toBeLessThan(TIME.maxEpochMsExclusive);
    }
  });
});

describe('season anchors — the snow invariant against the real snow law', () => {
  const anchorDay = (season: SeasonId): readonly number[] => {
    const { month, day } = SEASON_ANCHORS[season];
    return HOURS.map((h) => utc(2026, month, day, h));
  };

  const localAnchorDay = (season: SeasonId): readonly number[] =>
    // every local hour of the anchor day, as the chooser itself would produce it
    HOURS.map((h) => seasonInstant(utc(2026, 1, 1, h), season));

  it('is exactly 1 at every hour of the winter anchor', () => {
    for (const t of [...anchorDay('winter'), ...localAnchorDay('winter')]) {
      expect(snowWeight(t)).toBe(1);
    }
  });

  it('is exactly 0 at every hour of the spring, summer and autumn anchors', () => {
    for (const season of ['spring', 'summer', 'autumn'] as const) {
      for (const t of [...anchorDay(season), ...localAnchorDay(season)]) {
        expect(snowWeight(t)).toBe(0);
      }
    }
  });
});

describe('season — input law', () => {
  it('throws RangeError on non-finite input', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => seasonOf(bad)).toThrow(RangeError);
      expect(() => seasonInstant(bad, 'winter')).toThrow(RangeError);
    }
  });

  it('narrows option values to season ids', () => {
    for (const id of SEASON_IDS) expect(isSeasonId(id)).toBe(true);
    expect(isSeasonId('now')).toBe(false);
    expect(isSeasonId('')).toBe(false);
  });

  it('is pure by construction: both laws are functions of their arguments alone', () => {
    // no Date.now() in the module — the same inputs always yield the same outputs
    expect(seasonOf.length).toBe(1);
    expect(seasonInstant.length).toBe(2);
    expect(seasonInstant(utc(2026, 6, 21, 12), 'winter')).toBe(
      seasonInstant(utc(2026, 6, 21, 12), 'winter'),
    );
  });
});
