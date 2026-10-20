// src/i18n/format.ts
/**
 * Formatting law. Implements the adopted i18n/notes design: "Formatting law in force today"
 * (byte-exact reproduction of the current integer grouping, two-decimal trimming, ISO day
 * and HH:MM Petersburg wall time), the typography section (every later RU choice - thin-space
 * grouping, decimal comma, no-break space before units, B -> Б - is isolated in one named
 * constant so the swap is a one-line change at no call site), and the purity gate (no DOM,
 * no three, no clock; formatters take epoch milliseconds and derive civil time arithmetically).
 */

export const THOUSANDS_SEPARATOR = ' ';
export const DECIMAL_SEPARATOR = '.';
export const MINUS_SIGN = '-';
export const UNIT_SEPARATOR = ' ';
export const MAX_FRACTION_DIGITS = 2;

export const PETERSBURG_OFFSET_LABEL = 'UTC+03:00';
export const PETERSBURG_OFFSET_MS = 3 * 60 * 60 * 1000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type ByteUnit = 'B' | 'kB';

export const BYTE_UNITS = { B: 'B', kB: 'kB' } satisfies Record<ByteUnit, string>;

export const formatByteUnit = (unit: ByteUnit): string => BYTE_UNITS[unit];

export type FormatVars = Readonly<Record<string, string>>;

const TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

export const format = (template: string, vars: FormatVars): string => {
  const used = new Set<string>();
  const result = template.replace(TOKEN_PATTERN, (_token: string, name: string) => {
    const value = vars[name];
    if (value === undefined) {
      throw new Error(`format: template references {${name}} but no such variable was given`);
    }
    used.add(name);
    return value;
  });
  for (const name of Object.keys(vars)) {
    if (!used.has(name)) {
      throw new Error(`format: variable "${name}" is not referenced by the template`);
    }
  }
  return result;
};

const groupDigits = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);

export const formatInt = (value: number): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const magnitude = Math.abs(Math.trunc(value));
  const grouped = groupDigits(String(magnitude));
  return value < 0 && magnitude !== 0 ? MINUS_SIGN + grouped : grouped;
};

export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const rounded = Number(value.toFixed(MAX_FRACTION_DIGITS));
  if (Number.isInteger(rounded)) {
    return formatInt(rounded);
  }
  const [integerPart = '0', fractionPart = ''] = String(Math.abs(rounded)).split('.');
  const body = groupDigits(integerPart) + DECIMAL_SEPARATOR + fractionPart;
  return rounded < 0 ? MINUS_SIGN + body : body;
};

type CivilDay = { readonly year: number; readonly month: number; readonly day: number };

// Proleptic Gregorian civil day from days since 1970-01-01 (Hinnant's algorithm); it yields
// exactly what the UTC getters yield for the same instant, without constructing a clock.
const civilFromDays = (days: number): CivilDay => {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  return { year: month <= 2 ? y + 1 : y, month, day };
};

type PetersburgWallTime = CivilDay & { readonly hour: number; readonly minute: number };

const petersburgWallTime = (epochMs: number): PetersburgWallTime => {
  const shifted = epochMs + PETERSBURG_OFFSET_MS;
  const days = Math.floor(shifted / DAY_MS);
  const msOfDay = shifted - days * DAY_MS;
  return {
    ...civilFromDays(days),
    hour: Math.floor(msOfDay / HOUR_MS),
    minute: Math.floor((msOfDay % HOUR_MS) / MINUTE_MS),
  };
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const formatDate = (epochMs: number): string => {
  const { year, month, day } = petersburgWallTime(epochMs);
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
};

export const formatTime = (epochMs: number): string => {
  const { hour, minute } = petersburgWallTime(epochMs);
  return `${pad2(hour)}:${pad2(minute)}`;
};
