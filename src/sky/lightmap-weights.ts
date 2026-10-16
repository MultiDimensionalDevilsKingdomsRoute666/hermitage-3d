// Interior lightmap weights — design-sky-time.md §8 (frozen room contract).
// Exactly three states (day / dusk / night-chandeliers); the active pair is
// built with a complement, so the sum is exactly 1 at every elevation.

import { BLEND, DAYLIGHT_SUN_INTENSITY_MAX } from '../content/sky-time';
import { smootherstep } from './easing';

export type LightmapWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number }>;

const { nightEndDeg, duskStartDeg, duskEndDeg, dayStartDeg } = BLEND;

export function lightmapWeights(elevationDeg: number): LightmapWeights {
  if (!Number.isFinite(elevationDeg)) throw new RangeError('elevation must be finite');

  if (elevationDeg <= nightEndDeg) return { day: 0, dusk: 0, nightChandeliers: 1 };

  if (elevationDeg < duskStartDeg) {
    const a = smootherstep(elevationDeg - nightEndDeg);
    return { day: 0, dusk: a, nightChandeliers: 1 - a };
  }

  if (elevationDeg <= duskEndDeg) return { day: 0, dusk: 1, nightChandeliers: 0 };

  if (elevationDeg < dayStartDeg) {
    const b = smootherstep((elevationDeg - duskEndDeg) / (dayStartDeg - duskEndDeg));
    return { day: b, dusk: 1 - b, nightChandeliers: 0 };
  }

  return { day: 1, dusk: 0, nightChandeliers: 0 };
}

// The exterior directional sun uses the same shaping law (§7): no direct
// sunlight at or below geometric elevation 0°.
export const sunLightIntensity = (elevationDeg: number): number =>
  DAYLIGHT_SUN_INTENSITY_MAX * smootherstep(elevationDeg / 10);
