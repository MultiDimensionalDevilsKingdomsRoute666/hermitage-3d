// src/world/lm-mode.ts
/**
 * The `?lm=` lightmap-technique switch — design-staircase §4.4's falsifiable measurement
 * surface. DEV-ONLY: the product runs 'a' (technique A); 'b-rt' / 'b-discrete' exist so the
 * §4.4 thresholds (A vs B-RT vs B-discrete) can be measured on the reference device. Mirrors
 * the hud module's parsing contract exactly: absent or empty → 'a', no issues; a known
 * technique → it; anything else → 'a' plus the issue; duplicates → last wins + the issue.
 * Not persisted — the switch is ephemeral per URL. Pure; no DOM, no three, no clock.
 */
import type { LmMode } from './registry';

export type LmModeIssue = 'invalid-lm';
const PARAM = 'lm';
const MODES: readonly LmMode[] = ['a', 'b-rt', 'b-discrete'];

export function parseLmParam(
  params: URLSearchParams,
): Readonly<{ mode: LmMode; issues: readonly LmModeIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: LmModeIssue[] = values.length > 1 ? ['invalid-lm'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '' || last === 'a') return { mode: 'a', issues };
  if (last === 'b-rt' || last === 'b-discrete') return { mode: last, issues };
  if (issues.length === 0) issues.push('invalid-lm');
  return { mode: 'a', issues };
}

export const LM_MODES: readonly LmMode[] = MODES;
