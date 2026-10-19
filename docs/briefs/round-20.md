# Round 20 brief — Phase 2b night windows (DEC-019)

ROLE
You are the specialist of a relay. You have no tools, no repo access and no prior context; the
orchestrator integrates your reply into the repository and validates it.

TASK — Phase 2b "night windows": the palace square's night facade becomes a lit window lattice
(DEC-019, already decided and recorded; you implement it). Every window recess on the south
facade gains a pane quad; panes are hashed into three stock-material levels whose emissive
intensity is driven by the SAME frozen sky weight that blends the interiors. No new lights, no
custom materials (stock MeshStandardMaterial only), no fourth baked lightmap state. Two new
modules + their tests; the main.ts wiring, the golden test and all doc edits are the
ORCHESTRATOR's.

CONTEXT — the committed interfaces you write against (import these; do not restate their
values as literals):

1) The §8 weight (frozen contract, src/sky/lightmap-weights.ts) — IMPORT, never re-derive:
     export type LightmapWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number }>;
     export function lightmapWeights(elevationDeg: number): LightmapWeights;
   The night weight is the nightChandeliers field. Its plateau law guarantees: white-night
   minima sit inside a dusk plateau where nightChandeliers is EXACTLY 0 (this is what keeps
   white-night windows dark under a still-luminous sky), and deep winter night gives 1.

2) The solar position (src/sky/solar.ts, pure):
     export function solarPosition(epochMs: number): { elevationDeg: number; azimuthDeg: number };
   (geometric solar-centre elevation in degrees; the tests use it for the solstice check).

3) The solver (src/procedural/facade-solver.ts):
     export type Placement = { readonly id: string; readonly partId: PartId;
                              readonly position: Vec3; readonly rotationY: number;
                              readonly scale: Vec3 };
     export type SolvedFacade = { ...; readonly placements: readonly Placement[];
                                  readonly byPart: PlacementsByPart; ... };
   Window recesses are placements of surround parts. The populated surround part ids (the only
   ones with placements today) are 'surround-row1-small', 'surround-row2-large',
   'surround-row3-large', 'surround-row4-small'.

4) The kit builder (src/procedural/facade-builder.ts) — the prep export you consume. It mirrors
   the dark recess panel's rect in the part's LOCAL frame (the panel is box(width, height,
   depth) at x=0, y in [0, height], z in [0, depth], sitting behind a reveal whose opening
   faces the street along +z):
     export type SurroundOpening = Readonly<{ width: number; height: number; depth: number }>;
     export function surroundOpening(partId: PartId): SurroundOpening; // throws on non-surround
     export const RECESS_HEX: number; // the recess panel colour, sRGB hex
   The kit's instance matrices compose exactly as:
     Matrix4.compose(position.xyz, Quaternion.setFromAxisAngle(Y_AXIS, rotationY), scale.xyz)
   — mirror this for the panes, then apply the local pane offset in the part's frame.

DESIGN DECISIONS (adjudicated; follow them):
- Two new files. src/world/night-facade.ts is PURE (no three import, no DOM — the repo
  regex-scans pure modules for forbidden references and runs them in node Vitest): the level
  law — hash, split constants, intensity identity, visibility law, the ground-warm lerp law —
  with declared constants documented as tuning targets. src/procedural/night-lattice.ts
  imports three and builds the meshes (same pattern as facade-builder.ts).
- Three levels ('dark' | 'dim' | 'bright'), three InstancedMesh (one per level, one shared
  stock MeshStandardMaterial per level) — the DEC-019 budget is +3 draw calls total. Panes are
  two-triangle quads sized to surroundOpening(partId) for the placement's part, positioned a
  hair in front of the panel's front face (local z = depth + a small epsilon), transformed by
  the mirrored placement matrix. Quads face the street (+z local before rotation).
- Hash: deterministic, input = the placement id string, no Math.random, stable across runs and
  restarts. The per-level split is a TUNING TARGET per DEC-019 (roughly: dark about a third,
  dim about two fifths, bright about a quarter of panes) — tests assert non-degeneracy, not
  the exact split.
- Intensity law: paneIntensity(level, wNight) = kLevel * wNight EXACTLY — the tests assert
  this identity against the imported lightmapWeights over a dense elevation grid. kLevel
  multipliers are declared tuning constants: the dark level's k is 0 (it stays dark), dim is
  roughly a third of peak, bright is the peak. The peak emissive intensity constant is also a
  declared tuning target — expect the orchestrator to re-tune it against the December golden.
- Visibility law: the lattice group is visible iff wNight > 0. At wNight = 0 the day/dusk
  scenes must be PIXEL-IDENTICAL to today (the goldens gate on it); the dark level's base
  colour matching RECESS_HEX exactly keeps the flip invisible inside night frames too.
- Emissive hue: ONE warm tint shared by dim and bright (a linear channel triple, declared
  constant in the pure module, chandelier-matched — the orchestrator validates visually and
  may re-tune; document it as a tuning target).
- Secondary (DEC-019): the hemisphere light's ground colour warms on the same weight. Provide
  the PURE law warmGround(current, tint, wNight) — the per-channel lerp toward the tint by
  wNight — and leave the light itself to the host (the host owns it).
- Loud failure: a surround partId reaching the builder without a surroundOpening must throw
  (a future populated surround part must consciously join the lattice).
- Panes: castShadow false, receiveShadow false, StaticDrawUsage instance matrices,
  computeBoundingSphere per mesh. All three meshes live in ONE group the host adds to the
  palace group (the palace hides indoors — the lattice inherits that flip for free).

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented
(DEC-019; ROADMAP Phase 2b; design-sky-time.md §8 for the imported weight); named exports
only, no default exports; no enums; `satisfies` over `as` where a literal object is typed;
`import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index access yields
T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines
≤ 100; tests live in tests/ (never beside modules), Vitest node style describe/it/expect, no
jsdom; pure modules are three-free and DOM-free (regex-scannable); state laws in comments
once, plain declarative style.

NUMBERS UNDER TRANSPORT: numbers in your reply may be MASKED by the transport. Never guess a
masked value — emit `MASKED-IN-BRIEF: keep the <name> value` and the orchestrator restores it
against the committed tree. Best: import constants instead of writing literals wherever a
committed export exists (RECESS_HEX; elevation thresholds arrive via the imported weights —
you never need them as literals). One timestamp you will need in a test: local midnight on the
2026 June solstice at the palace latitude is 2026-06-20T21:00:00Z (UTC+3 local) — if that
arrives garbled, emit the MASKED marker for it.

FORBIDDEN (must not touch): the three-state lightmap contract; facade kit materials and
geometry (the kit's material slot is reserved for snow); the day/dusk sky palette; light
counts; UI; any file other than the four below (main.ts wiring, golden.spec.ts and all spec/
doc edits are the ORCHESTRATOR's).

OUTPUT CONTRACT (numbered fenced blocks, one per file, a one-line rationale above each; then
CHALLENGES bullets; the reply budget is ~450 lines — the four files are small, stay within it):
1. src/world/night-facade.ts — pure law: the level type + count, levelOf(key) hash, kLevel
   constants, paneIntensity identity, latticeVisible law, warmGround law; every tuning
   constant named and commented as declared.
2. src/procedural/night-lattice.ts — three.js builder: buildNightLattice(solved) returning the
   group, the per-level materials and setNight(wNight); mirrored matrix composition; loud
   failure on unknown surround parts.
3. tests/night-facade.test.ts — hash determinism, non-degenerate split, the intensity identity
   over a dense grid via the imported weights (including a wNight-exactly-0 plateau sample),
   the June-solstice-midnight zero via solarPosition, the visibility law, warmGround endpoints.
4. tests/night-lattice.test.ts — one mesh per level; instance totals equal the solver's
   surround placement counts; level assignment deterministic across two builds; setNight laws
   including the 0-flip and the dark colour == RECESS_HEX; throw on unknown surround ids.

CHALLENGES: before answering, challenge key assumptions, consider a credible alternative, and
check likely failure cases; give the requested output with concise rationale and any material
uncertainties.
