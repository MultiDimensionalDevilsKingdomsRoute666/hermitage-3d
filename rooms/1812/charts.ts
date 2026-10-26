// rooms/1812/charts.ts
/**
 * The 1812 lightmap chart vocabulary — docs/design-gallery.md §3.7 (two charts per state:
 * architecture 2k + kit 1k, DEC-027), §4.4 (one white point per state, shared by both charts),
 * §8.1 (the room module binds the chart per material). Chart law: the ARCHITECTURE chart keeps
 * the core path law untouched (src/world/blend.ts stateOfPath: lm/day|dusk|night.ktx2); the KIT
 * chart publishes lm/kit-<file>.ktx2 beside it. A material reads its chart from
 * userData[LM_CHART_KEY]: absent means the architecture chart, a chart id means itself, any
 * other value throws. Pure: no three, no DOM.
 */
import type { StateId } from '../../src/world/registry';

export type LmChart = 'arch' | 'kit';

export const LM_CHARTS: readonly LmChart[] = ['arch', 'kit'];

/** The userData key the kit materials carry (CANVAS and the runtime MG_gilt clone). */
export const LM_CHART_KEY = 'lmChart';

export const KIT_PATHS: ReadonlyMap<string, StateId> = new Map<string, StateId>([
  ['lm/kit-day.ktx2', 'day'],
  ['lm/kit-dusk.ktx2', 'dusk'],
  ['lm/kit-night.ktx2', 'nightChandeliers'],
]);

export function kitStateOfPath(path: string): StateId | null {
  return KIT_PATHS.get(path) ?? null;
}

export function isLmChart(value: unknown): value is LmChart {
  return value === 'arch' || value === 'kit';
}

export function chartOfUserData(userData: Readonly<Record<string, unknown>>): LmChart {
  const tag = userData[LM_CHART_KEY];
  if (tag === undefined) return 'arch';
  if (isLmChart(tag)) return tag;
  throw new Error(`1812 charts: userData.${LM_CHART_KEY} = ${String(tag)} names no chart`);
}
