// tests/world-stop-param.test.ts
// design-staircase §4.4 `?stop=` switch: the parsing contract mirrors lm-mode exactly.
import { describe, expect, it } from 'vitest';
import { parseStopParam } from '../src/world/stop-param';

describe('parseStopParam', () => {
  it('absent → null, no issues', () => {
    expect(parseStopParam(new URLSearchParams(''))).toEqual({ stop: null, issues: [] });
  });
  it('empty value → null, no issues', () => {
    expect(parseStopParam(new URLSearchParams('stop='))).toEqual({ stop: null, issues: [] });
  });
  it('a value → that string, no issues', () => {
    expect(parseStopParam(new URLSearchParams('stop=J4'))).toEqual({ stop: 'J4', issues: [] });
  });
  it('duplicates → last wins plus the invalid-stop issue', () => {
    expect(parseStopParam(new URLSearchParams('stop=J4&stop=G1'))).toEqual({
      stop: 'G1',
      issues: ['invalid-stop'],
    });
  });
  it('does not read other params', () => {
    expect(parseStopParam(new URLSearchParams('at=2026-06-22T03:18:00Z&det=1'))).toEqual({
      stop: null,
      issues: [],
    });
  });
});
