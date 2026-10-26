// tests/lm-recipes.test.mjs
//
// R-UX4 (walkthrough-UX pass, corridor light): pins the declared composite law in
// tools/lm-recipes.mjs — the gallery day state is the night lamp field plus the day rig's
// daylight, both at scale 1; dusk and night encode their own bakes; argv construction is
// deterministic and fail-loud. Node driver-side data (imports tools/, never src/).
import { describe, expect, it } from 'vitest';
import {
  composeArgs,
  composeRecipeFor,
  DUSK_CANDELABRA_SCALE,
  LIGHTMAP_COMPOSE_RECIPES,
} from '../tools/lm-recipes.mjs';

const STATES = ['day', 'dusk', 'nightChandeliers'];

describe('lightmap compose recipes', () => {
  it('gallery day is the night lamp field plus the day rig daylight, both at scale 1', () => {
    const terms = composeRecipeFor('rastrelli-gallery', 'day');
    expect(terms).not.toBeNull();
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['nightChandeliers', 1],
      ['day', 1],
    ]);
  });

  it('gallery dusk and night encode their own bakes', () => {
    expect(composeRecipeFor('rastrelli-gallery', 'dusk')).toBeNull();
    expect(composeRecipeFor('rastrelli-gallery', 'nightChandeliers')).toBeNull();
  });

  it('R4 D-3: the 1812 dusk composes the night candelabra field at a third', () => {
    const terms = composeRecipeFor('military-gallery', 'dusk');
    expect(terms).not.toBeNull();
    expect(terms?.map((t) => [t.source, t.scale])).toEqual([
      ['dusk', 1],
      ['nightChandeliers', DUSK_CANDELABRA_SCALE],
    ]);
    expect(DUSK_CANDELABRA_SCALE).toBeCloseTo(1 / 3, 12);
    // The night state itself encodes its own bake; the day state too.
    expect(composeRecipeFor('military-gallery', 'day')).toBeNull();
    expect(composeRecipeFor('military-gallery', 'nightChandeliers')).toBeNull();
  });

  it('every term names a canonical state with a finite positive scale', () => {
    for (const room of Object.values(LIGHTMAP_COMPOSE_RECIPES)) {
      for (const terms of Object.values(room)) {
        for (const term of terms ?? []) {
          expect(STATES).toContain(term.source);
          expect(Number.isFinite(term.scale) && term.scale > 0).toBe(true);
        }
      }
    }
  });

  it('unknown rooms and states resolve to null (their own bake)', () => {
    expect(composeRecipeFor('jordan', 'day')).toBeNull();
    expect(composeRecipeFor('rastrelli-gallery', 'unknown')).toBeNull();
  });

  it('builds a deterministic argv tail and rejects bad scales', () => {
    expect(
      composeArgs('/stage/out.exr', [
        { path: '/stage/n.exr', scale: 1 },
        { path: '/stage/d.exr', scale: 1 },
      ]),
    ).toEqual(['--out', '/stage/out.exr', '--in', '/stage/n.exr:1', '--in', '/stage/d.exr:1']);
    expect(() => composeArgs('/stage/out.exr', [{ path: '/stage/n.exr', scale: 0 }])).toThrow();
  });
});
