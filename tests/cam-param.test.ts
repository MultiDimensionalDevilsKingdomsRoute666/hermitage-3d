import { describe, expect, it } from 'vitest';
import { formatCamParam, parseCamParam } from '../src/camera/cam-param';

const parse = (q: string) => parseCamParam(new URLSearchParams(q));

describe('parseCamParam', () => {
  it('treats absent and empty as null without issues', () => {
    expect(parse('')).toEqual({ cam: null, issues: [] });
    expect(parse('cam=')).toEqual({ cam: null, issues: [] });
  });
  it('parses unit-interval numbers', () => {
    expect(parse('cam=0.25').cam).toBe(0.25);
    expect(parse('cam=.5').cam).toBe(0.5);
    expect(parse('cam=1').cam).toBe(1);
    expect(parse('cam=0').cam).toBe(0);
  });
  it('lets the last value win and flags duplicates once', () => {
    expect(parse('cam=0.2&cam=0.8')).toEqual({ cam: 0.8, issues: ['invalid-cam'] });
    expect(parse('cam=0.2&cam=zz')).toEqual({ cam: null, issues: ['invalid-cam'] });
  });
  it('rejects junk and out-of-range values', () => {
    for (const q of ['cam=abc', 'cam=1.5', 'cam=-0.1', 'cam=1e-1', 'cam=0.']) {
      expect(parse(q)).toEqual({ cam: null, issues: ['invalid-cam'] });
    }
  });
});

describe('formatCamParam', () => {
  it('emits short round-trippable values', () => {
    expect(formatCamParam(0.5)).toBe('0.5');
    expect(formatCamParam(1)).toBe('1');
    expect(formatCamParam(0)).toBe('0');
    expect(formatCamParam(2)).toBe('1');
    expect(parse(`cam=${formatCamParam(0.123456)}`).cam).toBe(0.1235);
  });
});
