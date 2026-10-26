// tests/1812-charts.test.ts
// design-gallery §3.7 (DEC-027): the 1812 chart vocabulary — the kit path law beside the core
// arch law (disjoint), the userData chart tag. Pure module; node style.
import { describe, expect, it } from 'vitest';
import { chartOfUserData, KIT_PATHS, kitStateOfPath, LM_CHART_KEY } from '../rooms/1812/charts';
import { stateOfPath } from '../src/world/blend';

const ARCH_PATHS = ['lm/day.ktx2', 'lm/dusk.ktx2', 'lm/night.ktx2'] as const;

describe('1812 charts', () => {
  it('kit paths: lm/kit-<file>.ktx2 names the three states; the arch law ignores them', () => {
    expect([...KIT_PATHS.values()].sort()).toEqual(['day', 'dusk', 'nightChandeliers']);
    for (const path of KIT_PATHS.keys()) {
      expect(path.startsWith('lm/kit-')).toBe(true);
      expect(kitStateOfPath(path)).toBe(KIT_PATHS.get(path));
      expect(stateOfPath(path)).toBeNull();
    }
  });

  it('the arch rows stay the core law and are not kit rows', () => {
    for (const path of ARCH_PATHS) {
      expect(stateOfPath(path)).not.toBeNull();
      expect(kitStateOfPath(path)).toBeNull();
    }
  });

  it('chartOfUserData: absent is arch, a chart id is itself, anything else throws', () => {
    expect(chartOfUserData({})).toBe('arch');
    expect(chartOfUserData({ [LM_CHART_KEY]: 'arch' })).toBe('arch');
    expect(chartOfUserData({ [LM_CHART_KEY]: 'kit' })).toBe('kit');
    expect(() => chartOfUserData({ [LM_CHART_KEY]: 'gold' })).toThrow(/gold/);
    expect(() => chartOfUserData({ [LM_CHART_KEY]: null })).toThrow(/names no chart/);
  });
});
