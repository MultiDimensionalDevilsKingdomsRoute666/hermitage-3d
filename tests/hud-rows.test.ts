// tests/hud-rows.test.ts
/**
 * HUD data-* / prose contract after round 16b (design-staircase.md §8.3 layer 3, §8.4 /
 * DEC-018, §9 gates): the four round-11 keys are byte-identical, the three new keys are
 * plain ungrouped integers or the room id as is, and the fourth prose line is appended
 * without touching the first three. Purity of hud.ts stays gated by tests/hud.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { buildHudAttrs, buildHudLines, type HudState } from '../src/ui/hud';

const fixture = {
  tierLabel: 'tier high · q=2',
  frameDrawCalls: 132,
  frameTriangles: 132_264,
  medianFrameMs: 16.666,
  room: 'rastrelli-gallery',
  holdMs: 1_200,
  ledgerBytes: 4_321_987,
} satisfies HudState;

describe('buildHudAttrs', () => {
  it('keeps the four legacy keys and their formatting unchanged', () => {
    const attrs = buildHudAttrs(fixture);
    expect(attrs['data-tier']).toBe('tier high · q=2');
    expect(attrs['data-draws']).toBe('132');
    expect(attrs['data-tris']).toBe('132264');
    expect(attrs['data-frame-ms']).toBe('16.67');
  });
  it('exposes exactly the seven contract keys', () => {
    expect(Object.keys(buildHudAttrs(fixture)).sort()).toEqual([
      'data-draws',
      'data-frame-ms',
      'data-hold-ms',
      'data-ledger-bytes',
      'data-room',
      'data-tier',
      'data-tris',
    ]);
  });
  it('passes the room id through as is', () => {
    expect(buildHudAttrs(fixture)['data-room']).toBe('rastrelli-gallery');
    expect(buildHudAttrs({ ...fixture, room: 'square' })['data-room']).toBe('square');
  });
  it('emits hold and ledger bytes as plain ungrouped integers', () => {
    const attrs = buildHudAttrs(fixture);
    expect(attrs['data-hold-ms']).toBe('1200');
    expect(attrs['data-ledger-bytes']).toBe('4321987');
    expect(attrs['data-hold-ms']).not.toContain(' ');
    expect(attrs['data-ledger-bytes']).not.toContain(' ');
    const fractional = buildHudAttrs({ ...fixture, holdMs: 1_200.7, ledgerBytes: 99.9 });
    expect(fractional['data-hold-ms']).toBe('1200');
    expect(fractional['data-ledger-bytes']).toBe('99');
  });
  it('reads 0 for hold and ledger when idle and empty', () => {
    const attrs = buildHudAttrs({ ...fixture, holdMs: 0, ledgerBytes: 0 });
    expect(attrs['data-hold-ms']).toBe('0');
    expect(attrs['data-ledger-bytes']).toBe('0');
  });
});

describe('buildHudLines', () => {
  it('keeps the three legacy lines unchanged', () => {
    const lines = buildHudLines(fixture);
    expect(lines[0]).toBe('tier high · q=2');
    expect(lines[1]).toBe('draws 132 · tris 132 264');
    expect(lines[2]).toBe('fps 60 · 16.67 ms');
  });
  it('appends a fourth line with room, plain hold and grouped ledger bytes', () => {
    const lines = buildHudLines(fixture);
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('room rastrelli-gallery · hold 1200 ms · ledger 4 321 987 B');
  });
  it('still reads — for fps while no interval has been measured', () => {
    const lines = buildHudLines({ ...fixture, medianFrameMs: 0, holdMs: 0 });
    expect(lines[2]).toBe('fps — · 0 ms');
    expect(lines[3]).toBe('room rastrelli-gallery · hold 0 ms · ledger 4 321 987 B');
  });
});
