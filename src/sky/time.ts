// Time state, URL parsing and the scrub transaction — design-sky-time.md §4, §9.
// Pure: no Date.now(), no DOM; clock values arrive as arguments. Node-testable.

import { SITE, TIME } from '../content/sky-time';
import { assertSupportedEpoch } from './solar';

export type TimeState =
  | Readonly<{ mode: 'live'; deterministic: false }>
  | Readonly<{ mode: 'fixed'; deterministic: boolean; epochMs: number }>;

export type TimeIssue =
  | 'fragment-too-long'
  | 'duplicate-at'
  | 'duplicate-det'
  | 'at-too-long'
  | 'invalid-at'
  | 'at-out-of-range'
  | 'invalid-det';

export type ParsedTime = Readonly<{
  state: TimeState;
  initialEpochMs: number;
  issues: readonly TimeIssue[];
}>;

type AtIssue = Extract<TimeIssue, 'at-too-long' | 'invalid-at' | 'at-out-of-range'>;

const LIVE: TimeState = { mode: 'live', deterministic: false };

// Exactly YYYY-MM-DDTHH:mm:ss[.S|.SS|.SSS](Z|±HH:MM). ASCII digits only, anchored,
// no whitespace, no expanded years, no lowercase t/z, no named zones.
const AT_PATTERN =
  /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,3}))?(Z|[+-][0-9]{2}:[0-9]{2})$/;

const MAX_OFFSET_MINUTES = 14 * 60;
const MAX_SCRUB_OFFSET_MINUTES = 1440;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

function isSupportedEpoch(epochMs: number): boolean {
  return (
    Number.isSafeInteger(epochMs) &&
    epochMs >= TIME.minEpochMs &&
    epochMs < TIME.maxEpochMsExclusive
  );
}

// Offset text is regex-shaped already ("Z" or ±HH:MM); returns signed minutes or
// undefined when the magnitude is not a real offset (minutes > 59 or > 14:00).
function parseOffsetMinutes(text: string): number | undefined {
  if (text === 'Z') return 0;
  const sign = text.startsWith('-') ? -1 : 1;
  const hours = Number(text.slice(1, 3));
  const minutes = Number(text.slice(4, 6));
  if (minutes > 59) return undefined;
  const total = hours * 60 + minutes;
  if (total > MAX_OFFSET_MINUTES) return undefined;
  return sign * total;
}

// Fields are validated before this is called, so no rollover can happen here.
// setUTCFullYear is used instead of Date.UTC so four-digit years 0000–0099 are
// not silently mapped to 1900–1999 (Date.UTC's two-digit-year quirk).
function utcEpoch(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

function parseAt(value: string): number | AtIssue {
  if (value.length > TIME.maxAtLength) return 'at-too-long';
  const match = AT_PATTERN.exec(value);
  if (match === null) return 'invalid-at';
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionText,
    offsetText,
  ] = match;
  if (
    yearText === undefined ||
    monthText === undefined ||
    dayText === undefined ||
    hourText === undefined ||
    minuteText === undefined ||
    secondText === undefined ||
    offsetText === undefined
  ) {
    return 'invalid-at';
  }
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12) return 'invalid-at';
  if (day < 1 || day > daysInMonth(year, month)) return 'invalid-at';
  if (hour > 23 || minute > 59 || second > 59) return 'invalid-at';
  // ".5" → 500, ".12" → 120, ".123" → 123: right-pad to thousandths.
  const millisecond = fractionText === undefined ? 0 : Number(fractionText.padEnd(3, '0'));
  const offsetMinutes = parseOffsetMinutes(offsetText);
  if (offsetMinutes === undefined) return 'invalid-at';
  const epochMs =
    utcEpoch(year, month, day, hour, minute, second, millisecond) - offsetMinutes * TIME.minuteMs;
  if (!isSupportedEpoch(epochMs)) return 'at-out-of-range';
  return epochMs;
}

// Query = text after the first "?"; without one, the whole fragment is the query.
// A single leading "#" (as delivered by location.hash) is dropped first.
function queryOf(fragment: string): string {
  const bare = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const mark = bare.indexOf('?');
  return mark === -1 ? bare : bare.slice(mark + 1);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function parseTime(fragment: string, nowMs: number): ParsedTime {
  assertSupportedEpoch(nowMs);
  if (fragment.length > TIME.maxFragmentLength) {
    return { state: LIVE, initialEpochMs: nowMs, issues: ['fragment-too-long'] };
  }

  const params = new URLSearchParams(queryOf(fragment));
  const issues: TimeIssue[] = [];

  let atEpochMs: number | undefined;
  const ats = params.getAll('at');
  if (ats.length > 1) {
    issues.push('duplicate-at');
  } else {
    const raw = ats[0];
    if (raw !== undefined && raw !== '') {
      const parsed = parseAt(raw);
      if (typeof parsed === 'number') atEpochMs = parsed;
      else issues.push(parsed);
    }
  }

  let deterministic = false;
  const dets = params.getAll('det');
  if (dets.length > 1) {
    issues.push('duplicate-det');
  } else {
    const raw = dets[0];
    if (raw === '1') deterministic = true;
    else if (raw !== undefined && raw !== '' && raw !== '0') issues.push('invalid-det');
  }

  let state: TimeState;
  if (atEpochMs !== undefined) {
    state = { mode: 'fixed', deterministic, epochMs: atEpochMs };
  } else if (deterministic) {
    state = { mode: 'fixed', deterministic: true, epochMs: nowMs };
  } else {
    state = LIVE;
  }

  return { state, initialEpochMs: epochAt(state, nowMs), issues };
}

export function epochAt(state: TimeState, nowMs: number): number {
  assertSupportedEpoch(nowMs);
  if (state.mode === 'fixed') {
    assertSupportedEpoch(state.epochMs);
    return state.epochMs;
  }
  return nowMs;
}

export function canonicalAt(epochMs: number): string {
  assertSupportedEpoch(epochMs);
  return new Date(epochMs).toISOString();
}

export function scrubBounds(anchorMs: number): readonly [number, number] {
  assertSupportedEpoch(anchorMs);
  const lowRaw = Math.max(TIME.minEpochMs, anchorMs - TIME.scrubRadiusMs);
  const highRaw = Math.min(TIME.maxEpochMsExclusive - 1, anchorMs + TIME.scrubRadiusMs);
  const lower = TIME.minuteMs * Math.ceil(lowRaw / TIME.minuteMs);
  const upper = TIME.minuteMs * Math.floor(highRaw / TIME.minuteMs);
  return [lower, upper];
}

export function scrubEpoch(anchorMs: number, offsetMinutes: number): number {
  const [lower, upper] = scrubBounds(anchorMs);
  if (!Number.isFinite(offsetMinutes)) throw new RangeError('offset must be finite');
  const clampedOffset = Math.min(
    MAX_SCRUB_OFFSET_MINUTES,
    Math.max(-MAX_SCRUB_OFFSET_MINUTES, offsetMinutes),
  );
  const instant = anchorMs + clampedOffset * TIME.minuteMs;
  const rounded = TIME.minuteMs * Math.round(instant / TIME.minuteMs);
  return Math.min(upper, Math.max(lower, rounded));
}

export function formatPetersburg(
  epochMs: number,
): Readonly<{ date: string; time: string; offset: 'UTC+03:00' }> {
  assertSupportedEpoch(epochMs);
  const shifted = new Date(epochMs + SITE.utcOffsetMinutes * TIME.minuteMs);
  const date = `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1, 2)}-${pad(
    shifted.getUTCDate(),
    2,
  )}`;
  const time = `${pad(shifted.getUTCHours(), 2)}:${pad(shifted.getUTCMinutes(), 2)}`;
  return { date, time, offset: 'UTC+03:00' };
}
