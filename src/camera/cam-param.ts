// src/camera/cam-param.ts
/**
 * ?cam= parser (design §1.2 URL grammar): a rail parameter over the unit interval within the
 * active node. Mirrors the committed ?stop= contract: last value wins, duplicates are an issue,
 * an empty value is absent. Non-numeric or out-of-range values are an issue and absent.
 */
export type CamParamIssue = 'invalid-cam';
const PARAM = 'cam';

const UNIT_NUMBER = /^(?:0|1|0?\.[0-9]+|1\.0+)$/;
export const CAM_PARAM_DIGITS = 4;

export function parseCamParam(
  params: URLSearchParams,
): Readonly<{ cam: number | null; issues: readonly CamParamIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: CamParamIssue[] = values.length > 1 ? ['invalid-cam'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '') return { cam: null, issues };
  if (!UNIT_NUMBER.test(last)) {
    return { cam: null, issues: issues.length === 0 ? ['invalid-cam'] : issues };
  }
  return { cam: Number(last), issues };
}

export function formatCamParam(u: number): string {
  const fixed = Math.min(1, Math.max(0, u)).toFixed(CAM_PARAM_DIGITS);
  return fixed.replace(/\.?0+$/, '') || '0';
}
