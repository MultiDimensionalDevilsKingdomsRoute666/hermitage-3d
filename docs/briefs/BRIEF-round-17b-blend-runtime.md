# BRIEF round 17b — the lightmap blend runtime (specialist)

ROLE: You are the specialist of a relay. You have no tools, no repo access and no prior
context; the orchestrator integrates your reply into the repository and validates it.

Project: Zimny (github.com/vasyapym/hermitage-3d) — TypeScript strict, three.js 0.186.1, Vitest
node tests, Biome (single quotes, space indent, 100-col lines). State after round 17a: BOTH
rooms' lightmaps are baked, committed and sha-proven byte-identical — gallery at 1024²
(intensity 4.0), jordan at 2048² (intensity 6.0); each room's manifest carries
`lightmaps: { states: ['day', 'dusk', 'nightChandeliers'], res, intensity }` and its payload
fetched by the runtime already includes the `lm/day.ktx2 | lm/dusk.ktx2 | lm/night.ktx2` and
`probe/dusk.ktx2` buffers (fetched with every other row; not yet decoded or used). Rooms
stream through airlock transits; the coordinator owns the frame loop. 254 tests green;
236,663 gzip of the 350,000 cap.

TASK (round 17b, slice 1 of the runtime blend): write two source files and one test file:

1. `src/world/blend.ts` — PURE: which two states are bound, and the per-frame scale numbers.
2. `src/assets/blend-gl.ts` — three-bound: the material patch that turns the blended
   lightmap into irradiance, plus the per-frame weight application.
3. `tests/world-blend.test.ts`

The ORCHESTRATOR wires afterwards (do not write): the RoomAssetService additive type changes
in src/world/registry.ts, rooms/<id>/room.ts calling your module at mount/unmount, main.ts
per-frame `applyWeights`, the PMREM environment probe (ADR-0013), the interior exposure
constant, the ledger VRAM rows, the §4.4 measurement harness (techniques B-RT / B-discrete),
goldens — later slices. Do not import main.ts or rooms/*; test only what you write.

DESIGN CONTRACT (docs/design-staircase.md; quotes abridged):

§4.1 Technique A — lightmap-blend material (custom slot 2 of 2): "One custom material
(ShaderMaterial or an `onBeforeCompile` patch — either counts as the slot; no sophistry) with
uniforms `lmA, lmB, wA, wB, iA, iB`; the two nonzero states are bound, so always exactly 2
texture fetches per fragment regardless of state count."

§4 consumption: "§8 gives `w = {day, dusk, night}`, Σ=1, ≤2 nonzero, quintic seams. Each state
is one lightmap atlas per room; bakes carry absolute brightness; a per-state intensity scalar
in the manifest compensates ETC1S being 8-bit LDR." The manifest pins ONE intensity per room
(= the bake's white point); your uniforms keep the iA/iB SLOTS (the future may split them)
but both carry the same manifest value in this round.

§8 (frozen, consumed not changed): the weight function lives in `src/sky/lightmap-weights.ts`
— FORBIDDEN to touch. Its API: `lightmapWeights(elevationDeg: number): LightmapWeights` with
`type LightmapWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number }>`
(Σ = 1 by construction, quintic seams, one-hot outside −7°…+10°). The coordinator derives the
elevation from the sky sample and calls it per frame; your blend consumes the WEIGHTS OBJECT.

Pinned adjudications (challenge if wrong):
- The blend does NOT introduce a ShaderMaterial: it patches the glb's own
  MeshStandardMaterial instances via `onBeforeCompile`, so per-mesh albedos, shadows and fog
  survive with one material slot spent.
- The stock lightmap path stays ACTIVE for state A: `material.lightMap = textureA`
  (rebound on plateau crossings) and `material.lightMapIntensity = wA · iA` (per frame).
  The `lights_fragment_maps` chunk's stock block — VERIFIED in three 0.186.1:
  `vec4 lightMapTexel = texture2D( lightMap, vLightMapUv ); vec3 lightMapIrradiance =
  lightMapTexel.rgb * lightMapIntensity; irradiance += lightMapIrradiance;` — is replaced by
  a block that adds the B fetch on the SAME `vLightMapUv` varying: both atlases share UV2,
  so no second varying is needed.
- There is no `USE_LM_B` define and no shader recompiles at state changes: the B sampler is
  ALWAYS declared and bound (a 1×1 black fallback texture when b = null) with scale 0 — the
  2-fetch law holds and plateau crossings are uniform/texture binds only, never recompiles.
- The lm textures are LINEAR data (the bake's ktx2 carry a linear OETF; KTX2Loader hands
  three.js NoColorSpace textures) — the blend adds them to `irradiance` untouched.
- Emissive fixtures (sconce glow, chandelier, panes) are patched like everything else: their
  `Emission Strength` survives untouched (emission is separate from irradiance in the
  shader), and their lm cells simply add ambient.
- The patch applies per MATERIAL INSTANCE and shares ONE uniform object per room across all
  patched programs (`shader.uniforms.lmB = <shared>`), so a single write updates every
  program. Materials are shared across instances — patch once per unique material.
- Module-level state is safe (the loaders.ts pattern): the coordinator serializes transits,
  so a room is patched at mount and disposed at unmount, never concurrently.

REQUIRED SEMANTICS — src/world/blend.ts. Pure by the house standard: no three (not even
type-only), no DOM, no node imports, no clock, no randomness. It may import ONLY
`type StateId` (and nothing else) from './registry'. Pin these names:

- `export type BlendWeights = Readonly<{ day: number; dusk: number; nightChandeliers: number }>`
- `export type BlendPayload = Readonly<{ a: StateId; b: StateId | null; wA: number; wB: number }>`
- `export function blendPayload(weights: BlendWeights): BlendPayload`
  Law: exactly two largest entries go out sorted descending as (a, b); at a one-hot plateau
  b = null and wB = 0; a tie (equal values) breaks by the frozen state order
  day < dusk < nightChandeliers; wA + wB = Σ of the two (1 at most seams, 1 at plateaus —
  the third weight is 0 by §8). Throws RangeError when any weight is non-finite or negative,
  or when the sum deviates from 1 by more than 1e-6 (a broken weights object must fail loud,
  not render dark).
- `export function stateOfPath(path: string): StateId | null` — 'lm/day.ktx2' → 'day';
  'lm/dusk.ktx2' → 'dusk'; 'lm/night.ktx2' → 'nightChandeliers' (the FILE name night carries
  the nightChandeliers state, mirroring the bake's STATE_FILE map); anything else
  ('tex/gilt.ktx2', 'probe/dusk.ktx2', '') → null.
- `export const STATE_ORDER: readonly StateId[] = ['day', 'dusk', 'nightChandeliers']`

REQUIRED SEMANTICS — src/assets/blend-gl.ts (three-bound; NOT node-tested — the round-16b CI
smoke exercises it at integration; keep it thin and mechanical). Imports three and
`type { RoomId, RoomObject, StateId }` from '../world/registry' plus the blend payload types:

- `export interface BlendHandle { setStates(a: StateId, b: StateId | null): void; setWeights(wA: number, wB: number): void }`
- `export function applyBlend(roomId: RoomId, object: RoomObject, textures: ReadonlyMap<StateId, unknown>, intensity: number): BlendHandle`
  — traverses the parsed root; for every mesh material (arrays included) sets
  `lightMap = textures.get(a)`, `lightMapIntensity = 0`, and patches via onBeforeCompile:
  declare the shared `uniform sampler2D lmB; uniform float lmScale;` and replace the stock
  lights_fragment_maps lightmap block with A + the B fetch on vLightMapUv. A missing texture
  for state `a` (an unbaked state) throws — loud, never a silent black room.
- `export function applyWeights(roomId: RoomId, payload: BlendPayload, intensity: number): void`
  — per frame: `lightMapIntensity = wA · intensity` on every material of the room,
  the shared uniform `lmScale.value = wB · intensity`; no allocation, no recompiles.
- `export function disposeBlend(roomId: RoomId): void` — drops the room's handle (materials
  themselves are disposed by the loaders' disposeParsed on unmount).
- Module state: one Map<RoomId, handle> — the serialized-transit law (see adjudications).

The textures map passed to applyBlend is keyed by STATE (the orchestrator converts the
decoded row-path map through stateOfPath). The value type is opaque (`unknown`) here and the
module casts each to a three Texture internally — the pure registry never names three.

TESTS (Vitest node style: describe/it/expect, no jsdom, no three import anywhere):

- tests/world-blend.test.ts — blendPayload: the three one-hot plateaus give (state, null, 1, 0)
  with a = day/dusk/nightChandeliers respectively; a mid-seam pair gives the two nonzero
  states in descending order (e.g. {day: 0.25, dusk: 0.75, night: 0} → a dusk, b day,
  wA 0.75, wB 0.25); a perfect tie breaks by STATE_ORDER (day before dusk before
  nightChandeliers); throws RangeError on NaN, negative, and Σ ≠ 1 (beyond 1e-6). stateOfPath:
  the three lm paths map to their states; tex/ and probe/ paths and the empty string map to
  null. End with the purity regex scan of src/world/blend.ts (house pattern: strip comments
  and string literals, then assert no /from\s+['"]three/, no node:, and no
  \b(document|window|localStorage|performance|Date|setTimeout)\b, no Math.random).

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented;
named exports only, no default exports; no enums; `satisfies` over `as` where a literal object
is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index
access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100
chars; tests live in tests/ (never beside modules), Vitest node style; pure modules are
three-free and DOM-free (regex-scannable); state laws in comments once, plain declarative
style.

NUMBERS UNDER TRANSPORT: the relay may mask numeric literals you see in this brief. Never
guess a masked number: where your code must reproduce one, emit a line
`MASKED-IN-BRIEF: keep the <name> value` in place of the literal. (Your files carry no
committed numbers — the manifest intensities arrive as arguments; test fixture numbers you
invent may be stated freely.)

FORBIDDEN (round fence): src/sky/lightmap-weights.ts (FROZEN §8 — consume, never edit),
src/engine/tier.ts semantics, the URL-grammar keys at/cam/q/det, src/engine/ledger.ts (VRAM
rows are a later slice), rooms/*, main.ts, tests other than your own file, public/basis/.

OUTPUT CONTRACT — reply with exactly this structure, nothing else between blocks except one
rationale line per file:
1. fenced ts block: src/world/blend.ts
2. fenced ts block: src/assets/blend-gl.ts
3. fenced ts block: tests/world-blend.test.ts
4. CHALLENGES — 2–6 bullets: assumptions challenged, one credible alternative considered,
   likely failure cases (the chunk-replace brittleness against three upgrades, uv1 attribute
   presence in the committed glbs, patch idempotence across re-mounts).
Keep the whole reply under ~450 lines; if you must cut, cut at a file boundary and end with
`TRUNCATED-HERE: <next file>`.

Before answering, challenge key assumptions, consider a credible alternative, and check
likely failure cases; give the requested output with concise rationale and any material
uncertainties.
