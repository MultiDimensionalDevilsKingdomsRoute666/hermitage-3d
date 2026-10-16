// Solar position — design-sky-time.md §5. Independent TypeScript
// transcription of the NOAA GML solar-calculator equations (public domain):
// https://gml.noaa.gov/grad/solcalc/calcdetails.html
// Geometric solar-centre elevation; no refraction correction in Phase 0.

import { SITE, TIME } from '../content/sky-time';
import { asinD, atan2D, clamp, cosD, mod, sinD, tanD } from './easing';

export type SolarPosition = Readonly<{ elevationDeg: number; azimuthDeg: number }>;

export function assertSupportedEpoch(epochMs: number): void {
  if (!Number.isFinite(epochMs)) throw new RangeError('epoch must be finite');
  if (!Number.isInteger(epochMs)) throw new RangeError('epoch must be integer milliseconds');
  if (Math.abs(epochMs) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('epoch outside the safe integer range');
  }
  if (epochMs < TIME.minEpochMs || epochMs >= TIME.maxEpochMsExclusive) {
    throw new RangeError('epoch outside the supported interval 1901-01-01…2100-01-01Z');
  }
}

export function solarPosition(epochMs: number): SolarPosition {
  assertSupportedEpoch(epochMs);

  const jd = epochMs / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;

  const l0 = mod(280.46646 + t * (36000.76983 + 0.0003032 * t), 360);
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const c =
    sinD(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sinD(2 * m) * (0.019993 - 0.000101 * t) +
    sinD(3 * m) * 0.000289;

  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * sinD(omega);

  const epsilon0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const epsilon = epsilon0 + 0.00256 * cosD(omega);

  const declination = asinD(sinD(epsilon) * sinD(lambda));

  const y = tanD(epsilon / 2) ** 2;

  const equationOfTimeMinutes =
    4 *
    (180 / Math.PI) *
    (y * sinD(2 * l0) -
      2 * e * sinD(m) +
      4 * e * y * sinD(m) * cosD(2 * l0) -
      0.5 * y * y * sinD(4 * l0) -
      1.25 * e * e * sinD(2 * m));

  const utcMinutes = mod(epochMs, 86400000) / 60000;
  const trueSolarMinutes = mod(utcMinutes + equationOfTimeMinutes + 4 * SITE.longitudeDeg, 1440);
  const hourAngle = trueSolarMinutes / 4 - 180;

  const elevationDeg = asinD(
    clamp(
      sinD(SITE.latitudeDeg) * sinD(declination) +
        cosD(SITE.latitudeDeg) * cosD(declination) * cosD(hourAngle),
      -1,
      1,
    ),
  );

  const azimuthDeg = mod(
    atan2D(
      sinD(hourAngle),
      cosD(hourAngle) * sinD(SITE.latitudeDeg) - tanD(declination) * cosD(SITE.latitudeDeg),
    ) + 180,
    360,
  );

  return { elevationDeg, azimuthDeg };
}
