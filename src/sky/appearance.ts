// Sky appearance — design-sky-time.md §7: palette, elevation shaping, and the
// sun-direction vectors the shader consumes. Pure; no three.js objects.

import { PALETTE } from '../content/sky-time';
import { mixRgb, RAD, smootherstep } from './easing';
import { exposureForElevation } from './exposure';
import type { LightmapWeights } from './lightmap-weights';
import { lightmapWeights, sunLightIntensity } from './lightmap-weights';
import type { SolarPosition } from './solar';
import { assertSupportedEpoch, solarPosition } from './solar';

export type Vec3 = readonly [number, number, number];
export type LinearRgb = readonly [number, number, number];

export type Atmosphere = Readonly<{
  zenithRgb: LinearRgb;
  horizonRgb: LinearRgb;
  glowStrength: number;
  sunIntensity: number;
}>;

export type SkySample = Readonly<{
  epochMs: number;
  solar: SolarPosition;
  exposure: number;
  lightmaps: LightmapWeights;
  atmosphere: Atmosphere;
  sunDirection: Vec3;
  horizonSunDirection: Vec3;
}>;

export function atmosphereForElevation(elevationDeg: number): Atmosphere {
  if (!Number.isFinite(elevationDeg)) throw new RangeError('elevation must be finite');

  const twilightT = smootherstep((elevationDeg + 18) / 12);
  const dayD = smootherstep((elevationDeg + 4) / 19);

  // Z = mix(N, mix(Zt, Zd, D), T)
  const zenithRgb = mixRgb(
    PALETTE.night,
    mixRgb(PALETTE.twilightZenith, PALETTE.dayZenith, dayD),
    twilightT,
  );

  // H = mix(2·N, mix(0.35·Hd, Hd, D), T)
  const nightFloor: [number, number, number] = [
    2 * PALETTE.night[0],
    2 * PALETTE.night[1],
    2 * PALETTE.night[2],
  ];
  const dayHorizonPair = mixRgb(
    [0.35 * PALETTE.dayHorizon[0], 0.35 * PALETTE.dayHorizon[1], 0.35 * PALETTE.dayHorizon[2]],
    PALETTE.dayHorizon,
    dayD,
  );
  const horizonRgb = mixRgb(nightFloor, dayHorizonPair, twilightT);

  return {
    zenithRgb,
    horizonRgb,
    glowStrength: twilightT * (1 - dayD),
    sunIntensity: sunLightIntensity(elevationDeg),
  };
}

export function sampleSky(epochMs: number): SkySample {
  assertSupportedEpoch(epochMs);
  const solar = solarPosition(epochMs);
  const elevationDeg = solar.elevationDeg;
  const hRad = elevationDeg * RAD;
  const aRad = solar.azimuthDeg * RAD;
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);

  return {
    epochMs,
    solar,
    exposure: exposureForElevation(elevationDeg),
    lightmaps: lightmapWeights(elevationDeg),
    atmosphere: atmosphereForElevation(elevationDeg),
    // s = (cos h · sin A, sin h, −cos h · cos A); +X east, −Z north.
    sunDirection: [cosH * Math.sin(aRad), sinH, -cosH * Math.cos(aRad)],
    // a = (sin A, 0, −cos A) — the flattened azimuth vector for the warm lobe.
    horizonSunDirection: [Math.sin(aRad), 0, -Math.cos(aRad)],
  };
}
