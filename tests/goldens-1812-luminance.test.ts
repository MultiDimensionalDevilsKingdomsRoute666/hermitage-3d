// tests/goldens-1812-luminance.test.ts
/**
 * R4 (design-gallery §4.6, D-21): the 1812 look fences read off the COMMITTED baselines —
 * per-state mean-luminance bands (±LUMINANCE_BAND_TOLERANCE around the value recorded at the
 * first capture), the order day > dusk > night, and day/night ≥ LUMINANCE_DAY_NIGHT_MIN_RATIO.
 * Luminance law: Rec. 709 luma of the sRGB-DECODED pixel (linear light), averaged over every
 * pixel of the frame — the integration's ruling: the ratio is a floor UNDER §4.3's declared
 * order-of-magnitude drop, which is a linear-light statement (encoded space would turn the
 * floor into ~13× and exceed it). The baselines are local-only (ADR-0012: CI never sees them)
 * — the suite skips when any of the three is absent. Node style; pngjs decodes; no renderer,
 * no DOM.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

const SNAPSHOT_DIR = fileURLToPath(new URL('./e2e/golden.spec.ts-snapshots/', import.meta.url));
const LIGHTS = ['day', 'dusk', 'night'] as const;
type Light = (typeof LIGHTS)[number];

// ---- gates (R4 Block 2) ----
const LUMINANCE_BAND_TOLERANCE = 0.15;
const LUMINANCE_DAY_NIGHT_MIN_RATIO = 3;

/**
 * The recorded mean linear luminance of each committed 1812 baseline. null = not yet recorded:
 * the band law skips for that state (the order and ratio laws still run) and the reporting case
 * below prints the measured value to fill in.
 */
const MEAN_LUMINANCE_1812: Readonly<Record<Light, number | null>> = {
  day: null, // FILL: recorded at first capture
  dusk: null, // FILL: recorded at first capture
  night: null, // FILL: recorded at first capture
};

/** The first (sorted) baseline whose name starts with golden-1812-<light> — project suffixes vary. */
const baselineOf = (light: Light): string | null => {
  if (!existsSync(SNAPSHOT_DIR)) return null;
  const prefix = `golden-1812-${light}`;
  const names = readdirSync(SNAPSHOT_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.png'))
    .sort();
  const first = names[0];
  return first === undefined ? null : join(SNAPSHOT_DIR, first);
};

const SRGB_TO_LINEAR: readonly number[] = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

const meanLuminance = (data: Uint8Array, width: number, height: number): number => {
  const pixels = width * height;
  if (pixels === 0) throw new Error('luminance: empty image');
  let sum = 0;
  for (let i = 0; i < pixels; i += 1) {
    const r = SRGB_TO_LINEAR[data[i * 4] ?? 0] ?? 0;
    const g = SRGB_TO_LINEAR[data[i * 4 + 1] ?? 0] ?? 0;
    const b = SRGB_TO_LINEAR[data[i * 4 + 2] ?? 0] ?? 0;
    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return sum / pixels;
};

const paths: Readonly<Record<Light, string | null>> = {
  day: baselineOf('day'),
  dusk: baselineOf('dusk'),
  night: baselineOf('night'),
};
const present = LIGHTS.every((light) => paths[light] !== null);
const allFilled = LIGHTS.every((light) => MEAN_LUMINANCE_1812[light] !== null);

describe.skipIf(!present)('1812 goldens: luminance fences (D-21)', () => {
  const measured = new Map<Light, number>();
  const mean = (light: Light): number => {
    const cached = measured.get(light);
    if (cached !== undefined) return cached;
    const path = paths[light];
    if (path === null) throw new Error(`luminance: no 1812 baseline for ${light}`);
    const png = PNG.sync.read(readFileSync(path));
    const value = meanLuminance(png.data, png.width, png.height);
    measured.set(light, value);
    return value;
  };

  it('order: day > dusk > night (mean linear luminance)', () => {
    expect(mean('day')).toBeGreaterThan(mean('dusk'));
    expect(mean('dusk')).toBeGreaterThan(mean('night'));
  });

  it(`ratio: day / night >= ${LUMINANCE_DAY_NIGHT_MIN_RATIO}`, () => {
    expect(mean('night')).toBeGreaterThan(0);
    expect(mean('day') / mean('night')).toBeGreaterThanOrEqual(LUMINANCE_DAY_NIGHT_MIN_RATIO);
  });

  for (const light of LIGHTS) {
    const center = MEAN_LUMINANCE_1812[light];
    it.skipIf(center === null)(
      `${light}: mean within ±${LUMINANCE_BAND_TOLERANCE * 100} % of the recorded band`,
      () => {
        if (center === null) return;
        expect(Math.abs(mean(light) - center) / center).toBeLessThanOrEqual(
          LUMINANCE_BAND_TOLERANCE,
        );
      },
    );
  }

  // Runs only while a band is unfilled: prints the measured means to copy into the FILL slots.
  it.skipIf(allFilled)('FILL: report the measured means for the unfilled bands', () => {
    const report = LIGHTS.map((light) => `${light}: ${mean(light).toFixed(6)}`).join(', ');
    console.info(`[1812 luminance] FILL MEAN_LUMINANCE_1812 — ${report}`);
    expect(report).not.toBe('');
  });
});
