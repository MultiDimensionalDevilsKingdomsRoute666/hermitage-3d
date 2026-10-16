// Facade spec invariants: the declared numbers must be internally consistent
// before the grammar/solver consumes them (relay round 5).
import { describe, expect, it } from 'vitest';
import {
  DECLARED_BAY_PITCH_M,
  DECLARED_SOUTH_WINDOW_ESTIMATE,
  FACADE_SPEC,
  SHELL,
  SIBLING_FACADES,
  SOUTH_FACADE,
  WINDOW_ROWS,
} from '../src/content/facade-spec';

describe('facade spec', () => {
  it('keeps the sourced totals ordered and finite', () => {
    expect(SHELL.windowsTotal.conservative).toBeLessThan(SHELL.windowsTotal.generous);
    expect(SHELL.roomsTotal.conservative).toBeLessThan(SHELL.roomsTotal.generous);
    expect(SHELL.corniceHeightM).toBeLessThan(SHELL.totalHeightM);
    expect(SHELL.totalHeightM).toBeLessThan(SHELL.rooflineStatuaryHeightM);
  });

  it('has four window rows in two tiers with the piano nobile tallest', () => {
    expect(WINDOW_ROWS).toHaveLength(4);
    expect(WINDOW_ROWS.map((r) => r.tier)).toEqual(['lower', 'lower', 'upper', 'upper']);
    const row2 = WINDOW_ROWS.find((r) => r.id === 'row2');
    const row1 = WINDOW_ROWS.find((r) => r.id === 'row1');
    expect(row2?.declaredHeadHeightM).toBeGreaterThan(row1?.declaredHeadHeightM ?? 0);
  });

  it('builds the south facade from three risalits and two stretches', () => {
    const kinds = SOUTH_FACADE.sections.map((s) => s.kind);
    expect(kinds).toEqual([
      'cornerRisalit',
      'stretch',
      'centralPortal',
      'stretch',
      'cornerRisalit',
    ]);
  });

  it('declares a symmetric south facade whose axes close the 210 m line', () => {
    const sections = SOUTH_FACADE.sections;
    expect(sections).toHaveLength(5);
    const [sw, west, , east, se] = sections;
    expect(sw?.declaredAxes).toBe(se?.declaredAxes);
    expect(west?.declaredAxes).toBe(east?.declaredAxes);
    const axes = sections.reduce((sum, s) => sum + s.declaredAxes, 0);
    const span = axes * DECLARED_BAY_PITCH_M;
    expect(Math.abs(span - SOUTH_FACADE.mainLineLengthM)).toBeLessThanOrEqual(2);
  });

  it('keeps stretches flat and risalits projecting', () => {
    for (const section of SOUTH_FACADE.sections) {
      if (section.kind === 'stretch') {
        expect(section.declaredProtrusionM).toBe(0);
      } else {
        expect(section.declaredProtrusionM).toBeGreaterThan(0);
      }
    }
  });

  it('estimates south-facade windows from axes times four rows', () => {
    const axes = SOUTH_FACADE.sections.reduce((sum, s) => sum + s.declaredAxes, 0);
    expect(DECLARED_SOUTH_WINDOW_ESTIMATE).toBe(axes * WINDOW_ROWS.length);
    // The declared estimate must sit under the sourced whole-palace totals.
    expect(DECLARED_SOUTH_WINDOW_ESTIMATE).toBeLessThan(SHELL.windowsTotal.conservative);
  });

  it('carries the south facade plus three sibling facades', () => {
    expect(FACADE_SPEC.south).toBe(SOUTH_FACADE);
    expect(SIBLING_FACADES.map((f) => f.id)).toEqual(['north', 'west', 'east']);
    for (const facade of SIBLING_FACADES) {
      const axes = facade.sections.reduce((sum, s) => sum + s.declaredAxes, 0);
      const span = axes * DECLARED_BAY_PITCH_M;
      expect(Math.abs(span - facade.mainLineLengthM)).toBeLessThanOrEqual(8);
    }
  });
});
