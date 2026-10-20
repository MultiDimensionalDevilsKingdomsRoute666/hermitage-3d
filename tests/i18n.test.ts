// tests/i18n.test.ts
// Gates for the round-24a extraction files (src/i18n/*): the purity fence (the hud.test.ts
// reference pattern), the byte-exact formatting law in force today, a dense cross-check of the
// arithmetic Petersburg clock against formatPetersburg (sky/time.ts), and a round-trip of the
// real /notes model's rendered numbers through the new formatters.
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { format, formatDate, formatInt, formatNumber, formatTime } from '../src/i18n/format';
import { formatPetersburg } from '../src/sky/time';
import { buildSouthNotesModel } from '../src/ui/notes-view';

// ---------------------------------------------------------------------------
// Purity fence — the hud.test.ts reference pattern, applied to every i18n module.
// ---------------------------------------------------------------------------
describe('i18n purity', () => {
  const sources = import.meta.glob(['../src/i18n/*.ts'], {
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

  it('loads the module sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(3);
  });
  it('imports nothing from three or node', () => {
    for (const [file, src] of Object.entries(sources)) {
      const code = stripComments(src);
      expect(code, file).not.toMatch(/from\s+['"]three/);
      expect(code, file).not.toMatch(/import\s*\(\s*['"]three/);
      expect(code, file).not.toMatch(/['"]node:/);
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
    for (const [file, src] of Object.entries(sources)) {
      const code = stripLiterals(stripComments(src));
      for (const re of forbidden) expect(code, `${file} ${String(re)}`).not.toMatch(re);
    }
  });
});

// ---------------------------------------------------------------------------
// format() — {name} interpolation, loud on both failure kinds.
// ---------------------------------------------------------------------------
describe('format', () => {
  it('resolves named tokens', () => {
    expect(format('{axes} axes × {rows} rows', { axes: '62', rows: '4' })).toBe('62 axes × 4 rows');
  });
  it('resolves a repeated token everywhere', () => {
    expect(format('{n} + {n}', { n: '7' })).toBe('7 + 7');
  });
  it('throws loud on a missing variable', () => {
    expect(() => format('Total — {activeParts} active parts', {})).toThrow(/activeParts/);
  });
  it('throws loud on an unused variable', () => {
    expect(() => format('Shell', { extra: '1' })).toThrow(/extra/);
  });
});

// ---------------------------------------------------------------------------
// The formatting law in force today, byte-exact.
// ---------------------------------------------------------------------------
describe('formatInt', () => {
  it('groups thousands with a plain space', () => {
    expect(formatInt(0)).toBe('0');
    expect(formatInt(999)).toBe('999');
    expect(formatInt(1000)).toBe('1 000');
    expect(formatInt(1234567)).toBe('1 234 567');
    expect(formatInt(1000000)).toBe('1 000 000');
  });
  it('carries the minus sign', () => {
    expect(formatInt(-5)).toBe('-5');
    expect(formatInt(-1234567)).toBe('-1 234 567');
  });
  it('truncates non-integral input toward zero', () => {
    expect(formatInt(210.9)).toBe('210');
    expect(formatInt(-210.9)).toBe('-210');
  });
});

describe('formatNumber', () => {
  it('prints integers through the grouped int path', () => {
    expect(formatNumber(210)).toBe('210');
    expect(formatNumber(1234)).toBe('1 234');
  });
  it('trims two-decimal rounding trailing zeros', () => {
    expect(formatNumber(3.39)).toBe('3.39');
    expect(formatNumber(3.4)).toBe('3.4');
    expect(formatNumber(2.999)).toBe('3');
    expect(formatNumber(0.005)).toBe('0.01');
  });
  it('groups the integer part of non-integers (the round-25 ru law shape)', () => {
    // Today's page renders no non-integer >= 1000 (asserted against the real model below),
    // so this branch is unreachable in practice and intentionally targets the RU round.
    expect(formatNumber(1234.56)).toBe('1 234.56');
  });
});

// ---------------------------------------------------------------------------
// The arithmetic Petersburg clock == formatPetersburg (sky/time.ts) on civil time.
// ---------------------------------------------------------------------------
describe('petersburg wall time cross-check', () => {
  const cross = (epochMs: number): void => {
    const law = formatPetersburg(epochMs);
    expect(formatDate(epochMs), String(epochMs)).toBe(law.date);
    expect(formatTime(epochMs), String(epochMs)).toBe(law.time);
  };
  const walkDays = (year: number): void => {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    for (let day = start; day < end; day += 24 * 60 * 60 * 1000) cross(day);
  };
  it('matches on every day of a leap year, an early and a late epoch year', () => {
    walkDays(2000);
    walkDays(1905);
    walkDays(2095);
  });
  it('matches across the petersburg day edge (21:00Z) and a month boundary', () => {
    // 2026-02-27T18:00Z → 2026-03-01T02:00Z, hourly steps: the +3h shift rolls the day.
    for (let ms = Date.UTC(2026, 1, 27, 18); ms <= Date.UTC(2026, 2, 1, 2); ms += 60 * 60 * 1000) {
      cross(ms);
    }
  });
  it('matches on the golden det timestamps', () => {
    cross(Date.UTC(2026, 5, 22, 3, 18));
    cross(Date.UTC(2026, 5, 20, 21, 50));
    cross(Date.UTC(2026, 1, 17, 16, 25));
  });
  it('matches minute-stepped across a petersburg midnight', () => {
    const from = Date.UTC(2026, 5, 20, 20, 50);
    const to = Date.UTC(2026, 5, 20, 21, 10);
    for (let ms = from; ms <= to; ms += 60_000) {
      cross(ms);
    }
  });
});

// ---------------------------------------------------------------------------
// The English dictionary: complete, clean, and pinned where the bytes are load-bearing.
// ---------------------------------------------------------------------------
describe('en dictionary', () => {
  it('has a non-empty, untrimmed value for every key', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.length, key).toBeGreaterThan(0);
      expect(value, key).toBe(value.trim());
    }
  });
  it('keeps the U+2019 apostrophe of the committed notes link', () => {
    expect(en['chrome.notesLink']).toBe('How it’s built →');
  });
  it('pins the ten stop captions the e2e asserts', () => {
    expect(en['caption.s0']).toBe('the facade and the hour');
    expect(en['caption.s1']).toBe('the arch opens');
    expect(en['caption.g0']).toBe('dark; the square behind');
    expect(en['caption.g1']).toBe('compression');
    expect(en['caption.g2']).toBe('the door (airlock)');
    expect(en['caption.j0']).toBe('looking up into light');
    expect(en['caption.j1']).toBe('the flight');
    expect(en['caption.j2']).toBe('portholes mirror the windows');
    expect(en['caption.j3']).toBe('the gallery above');
    expect(en['caption.j4']).toBe('arrival; the portal (landing airlock)');
  });
  it('keeps the quoted id of the provenance failure string (notes-view renders it quoted)', () => {
    expect(en['notes.failNoProvenance']).toBe(
      "displayed number '{id}' has no provenance register entry",
    );
  });
});

// ---------------------------------------------------------------------------
// Round-trip against the real /notes model: today's rendered display bytes must be
// reproducible by the new formatters, and the grouped non-integer branch must stay
// unreachable on the page (no rendered non-integer >= 1000).
// ---------------------------------------------------------------------------
describe('notes model number round-trip', () => {
  const result = buildSouthNotesModel();
  it('builds the default model', () => {
    expect(result.ok).toBe(true);
  });
  if (!result.ok) {
    return;
  }
  it('reformats every displayed number byte-identically', () => {
    for (const block of result.model.blocks) {
      if (block.kind !== 'numbers') {
        continue;
      }
      for (const row of block.rows) {
        if (row.value === null) {
          expect(row.display, row.id).toBe(`measured: ${en['notes.pending']}`);
          continue;
        }
        expect(formatNumber(row.value), row.id).toBe(row.display);
      }
    }
  });
  it('renders no non-integer at or above 1000 (the grouped branch stays unreachable)', () => {
    for (const block of result.model.blocks) {
      if (block.kind !== 'numbers') {
        continue;
      }
      for (const row of block.rows) {
        if (row.value !== null && !Number.isInteger(row.value)) {
          expect(Math.abs(row.value), row.id).toBeLessThan(1000);
        }
      }
    }
  });
});
