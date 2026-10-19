// src/world/stop-param.ts
/**
 * The `?stop=` camera-stop switch — design-staircase §4.4's goldens and measurement surface.
 * DEV-ONLY stopgap until r18's rail lets the camera travel: the string names a stop id in the
 * target room's rail.stops; resolution happens in applySwap because ids are per-room. Mirrors
 * the lm-mode parsing contract exactly: absent or empty → null, no issues; a non-empty value →
 * that string; duplicates → last wins + the issue. Ephemeral per URL, never persisted. Pure;
 * no DOM, no three, no clock.
 */
export type StopParamIssue = 'invalid-stop';
const PARAM = 'stop';

export function parseStopParam(
  params: URLSearchParams,
): Readonly<{ stop: string | null; issues: readonly StopParamIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: StopParamIssue[] = values.length > 1 ? ['invalid-stop'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '') return { stop: null, issues };
  return { stop: last, issues };
}
