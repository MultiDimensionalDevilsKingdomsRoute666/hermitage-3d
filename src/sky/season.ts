// src/sky/season.ts
/**
 * Season chooser law (design-season-chooser.md, round R11). Pure: no DOM, no three.js, no
 * Date.now() — clock values arrive as arguments; non-finite input throws RangeError.
 *
 * Laws, stated once:
 * - a season is a DATE at season granularity, not a snow switch; its only path into the
 *   renderer is the time state the goldens already pin by at=;
 * - seasonOf() reads the METEOROLOGICAL season of the LOCAL (+03 fixed offset, no DST)
 *   civil date: winter Dec–Feb, spring Mar–May, summer Jun–Aug, autumn Sep–Nov. This
 *   deliberately differs from the snow law's seams (Mar 5 reads spring with full snow;
 *   the date line beside the select is the truth);
 * - seasonInstant() lands on the season's anchor day in the scene instant's LOCAL civil
 *   year and keeps the scene instant's local time of day to the millisecond; it does not
 *   range-check — the host refuses an instant outside the supported epoch;
 * - the anchors sit where the snow law is exactly 1 (winter) or exactly 0 (the rest);
 *   tests/season.test.ts pins that invariant against src/world/snow-season.ts;
 * - this module owns its own civil-from-days arithmetic (year-bearing, proleptic
 *   Gregorian) and does not import the snow module.
 */
import { SITE, TIME } from '../content/sky-time';

export type SeasonId = 'winter' | 'spring' | 'summer' | 'autumn';

/** The four ids in option order (the chooser's `now` is not a season). */
export const SEASON_IDS: readonly SeasonId[] = ['winter', 'spring', 'summer', 'autumn'];

type SeasonAnchor = Readonly<{ month: number; day: number }>;

// TUNING TARGET: the one day each season is shown at. Winter on the snow plateau,
// spring after meltEnd, summer/autumn on existing golden dates. Owner's taste.
export const SEASON_ANCHORS = {
  winter: { month: 1, day: 15 }, // deep winter; noon sun ~9° (vs 6.6° at the solstice); wSnow = 1
  spring: { month: 5, day: 15 }, // bare, bright, 17 h of day; wSnow = 0 exactly
  summer: { month: 6, day: 21 }, // the white-night date the goldens already pin
  autumn: { month: 10, day: 15 }, // the oct-night golden's date; dark by 19:00
} as const satisfies Readonly<Record<SeasonId, SeasonAnchor>>;

const MS_PER_DAY = 86_400_000;

const LOCAL_OFFSET_MS = SITE.utcOffsetMinutes * TIME.minuteMs;

type Civil = Readonly<{ year: number; month: number; day: number; msOfDay: number }>;

export function isSeasonId(value: string): value is SeasonId {
  return value === 'winter' || value === 'spring' || value === 'summer' || value === 'autumn';
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`season: ${name} must be finite`);
}

/** Civil date of a day-count instant by integer arithmetic (civil-from-days, Hinnant). */
function civilOf(shiftedMs: number): Civil {
  const days = Math.floor(shiftedMs / MS_PER_DAY);
  const msOfDay = shiftedMs - days * MS_PER_DAY;
  const z = days + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  // the algorithm's year starts in March: January and February belong to the next civil year
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day, msOfDay };
}

/** Day count of a civil date (days-from-civil, Hinnant) — the inverse of civilOf(). */
function daysOf(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = month > 2 ? month - 3 : month + 9;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146_097 + doe - 719_468;
}

/** Meteorological season of the instant's local (+03) calendar date. */
export function seasonOf(epochMs: number): SeasonId {
  assertFinite(epochMs, 'epochMs');
  const { month } = civilOf(epochMs + LOCAL_OFFSET_MS);
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/**
 * The season's anchor day in the scene instant's local civil year, at the scene instant's
 * local time of day. Not range-checked: the host refuses instants outside TIME's bounds.
 */
export function seasonInstant(sceneEpochMs: number, season: SeasonId): number {
  assertFinite(sceneEpochMs, 'sceneEpochMs');
  const local = civilOf(sceneEpochMs + LOCAL_OFFSET_MS);
  const anchor = SEASON_ANCHORS[season];
  return (
    daysOf(local.year, anchor.month, anchor.day) * MS_PER_DAY + local.msOfDay - LOCAL_OFFSET_MS
  );
}
