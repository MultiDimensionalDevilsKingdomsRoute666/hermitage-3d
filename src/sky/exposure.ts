// Exposure — design-sky-time.md §2 (retained), §7: E(h) = 0.55 + 0.45 ·
// clamp((h + 6.6) / 21.6, 0, 1). Saturates outside the transition; continuous
// at the joins (slope change, no value discontinuity).

import { EXPOSURE } from '../content/sky-time';

export function exposureForElevation(elevationDeg: number): number {
  if (!Number.isFinite(elevationDeg)) throw new RangeError('elevation must be finite');
  const span = EXPOSURE.highElevationDeg - EXPOSURE.lowElevationDeg;
  const k = (elevationDeg - EXPOSURE.lowElevationDeg) / span;
  if (k <= 0) return EXPOSURE.low;
  if (k >= 1) return EXPOSURE.high;
  return EXPOSURE.low + k * (EXPOSURE.high - EXPOSURE.low);
}
