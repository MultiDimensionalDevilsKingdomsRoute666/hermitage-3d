// tools/lm-recipes.mjs
//
// R-UX4 (walkthrough-UX pass, corridor light): the declared composite recipes, consulted by
// tools/reencode.mjs before the single-input encode. Room contract rastrelli-gallery
// (design-staircase §1.4: artificial light dominates at every hour; the three bakes differ
// little) — the published day state is the night lamp field plus the day rig's daylight, both
// at scale 1.0: by linearity of light transport this is the bake a single rig with fixtures ON
// plus the day sun/world would produce. The scale is 1 by law, not by tuning.
//
// R4 (design-gallery.md §4.6, D-3): the Military Gallery's dusk is COMPOSED, not baked at a
// third — the dusk rig bakes sky only (bake.py's DUSK_FIXTURES False for this room), and the
// published dusk is the dusk sky field plus the night candelabra field at
// DUSK_CANDELABRA_SCALE. By linearity this is the bake a 1/3-emission rig would produce, and
// "a third" becomes a recipe scalar retunable by a two-minute re-encode instead of a
// 40-minute re-bake. The compose runs PER CHART (architecture and kit alike) — recipes name
// bake-rig states; the driver resolves both charts' sources.
//
// Law: a published lightmap state either encodes its own bake-rig EXR (no recipe here) or
// encodes the linear sum  sum_i scale_i * EXR(source_i)  produced by tools/lm_compose.py.
// Sources are bake-rig STATES; the driver resolves them to staged denoised EXRs by its
// existing path convention. White points are never applied here (the manifest's
// lightmaps.intensity record stays the single source of truth).

/**
 * @typedef {'day' | 'dusk' | 'nightChandeliers'} LightState
 * @typedef {{ source: LightState, scale: number }} ComposeTerm
 */

/** D-3: the candelabra's share of the night field in the composed dusk. */
export const DUSK_CANDELABRA_SCALE = 1 / 3;

/** @type {Readonly<Record<string, Readonly<Partial<Record<LightState, readonly ComposeTerm[]>>>>>} */
export const LIGHTMAP_COMPOSE_RECIPES = Object.freeze({
  'rastrelli-gallery': Object.freeze({
    day: Object.freeze([
      Object.freeze({ source: 'nightChandeliers', scale: 1 }),
      Object.freeze({ source: 'day', scale: 1 }),
    ]),
  }),
  'military-gallery': Object.freeze({
    dusk: Object.freeze([
      Object.freeze({ source: 'dusk', scale: 1 }),
      Object.freeze({ source: 'nightChandeliers', scale: DUSK_CANDELABRA_SCALE }),
    ]),
  }),
});

/**
 * Returns the compose terms for (room, state), or null when the state encodes its own bake.
 * @param {string} room
 * @param {LightState} state
 * @returns {readonly ComposeTerm[] | null}
 */
export const composeRecipeFor = (room, state) => {
  const roomRecipes = LIGHTMAP_COMPOSE_RECIPES[room];
  if (roomRecipes === undefined) return null;
  const terms = roomRecipes[state];
  return terms === undefined ? null : terms;
};

/**
 * Builds the echoed argv tail for tools/lm_compose.py from resolved source paths.
 * @param {string} outPath
 * @param {readonly { path: string, scale: number }[]} resolved
 * @returns {string[]}
 */
export const composeArgs = (outPath, resolved) => {
  const args = ['--out', outPath];
  for (const term of resolved) {
    if (!Number.isFinite(term.scale) || term.scale <= 0) {
      throw new Error(`lm-recipes: scale must be finite and > 0, got ${String(term.scale)}`);
    }
    args.push('--in', `${term.path}:${String(term.scale)}`);
  }
  return args;
};
