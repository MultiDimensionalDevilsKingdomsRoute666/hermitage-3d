# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Detail lives in `docs/briefs/ROUNDS.md` rows and the design docs; this file is the index,
not the archive. If a number here contradicts a fresh measurement, the measurement wins — fix this
file in the same session.

## Live state

- Updated: 2026-10-18 · measured on the round-16 close commit (`d876d59`).
- Round 16 **closed** (gate met): runtime room streaming — registry + airlock FSM + loaders +
  rooms list/scaffolds + manifest fetcher + main.ts wiring (16a, `268e277`) and the asserted
  disposal ledger + HUD rows (16b, `d876d59`). The e2e smoke walks the graph
  #/ → gallery → jordan → queued retarget mid-transit → #/ with the ledger rows back at boot
  values and a clean console (ROUNDS row 16).
- Round 17 **in flight**. **17a complete** (`60ef9b4`, `7b8399c`): bake pipeline + both rooms
  fully baked and committed, byte-identity proven on both rooms. **17b integrated** (`cfeab8d`,
  `d4c3ae4`): the blend runtime lived (the 17b day shot showed the baked light —
  `node_modules/.cache/look/bisect-17b.png`, HEADLESS shot: 1280×720 dpr 1, ~430 ms rAF
  throttle — fine for pixels, never for cadence). **17c MID-INTEGRATION** (this commit,
  validate green: 264 tests / 239,779 gzip / smoke green): the technique hub
  src/assets/blend-gl.ts (applyTechnique/disposeTechnique — §4.1 'a' patched, §4.2
  'b-discrete' stock argmax, §4.4 'b-rt' per-frame ceiling RT; the coordinator's one per-frame
  call = applyWeights(roomId, frozenWeights, intensity)) + src/world/lm-mode.ts (the ?lm=
  dev switch, hud-parsing contract) + the PMREM probe in loaders (mountEnvironment returns
  the env texture, one bake per hold, the RT row registered) + the honest VRAM ledger rows in
  mountParsed (geometry/texture kinds; the room payload registers at fetch, unchanged) +
  RoomScene.setEnvironment + RoomLoadContext {lmMode, renderer} + blend.ts environmentScalar
  (ADR-0013 scalars 1.0/0.6/0.35) + the rooms wired to the hub + main.ts: the interior
  exposure constant 1.0 (§4.4) and THE LIGHT SEAM — sun/hemi visible=false indoors, restored
  by applyEpoch on exit.
- **17c OPEN BUG — interiors render black under technique 'a'** even though the page probe
  shows everything correct: lightMap bound to the day texture (BC1, 2 MB mip, avg ≈ 93/255 —
  NOT black), lightMapIntensity = 6, the patch key 'zimny-lm-blend-v1' set, 2 blend programs
  compiled, no console errors, tris/draws fine. Diff vs the working 17b: the mount-time bind
  (17b bound the day texture at mount and preset current.a='day'; 17c binds black at mount
  and rebinds on the first applyWeights frame — the uniform refresh IS unconditional per
  frame per WebGLMaterials.js:260, so the rebind itself should work). THE LIGHT SEAM IS
  TEMPORARILY DISABLED (main.ts applySwap: the sun/hemi hiding commented out with a
  SUB-BISECT marker) — the sub-bisect step was interrupted; the day stayed black WITH the
  lights hidden, so the culprit is likely NOT the seam: suspects = the hub rewrite's bind
  timing vs three's program init, or the PMREM/environment interaction. Next: finish the
  sub-bisect empirically (bisect-17b.png vs the current tree — both headless jordan-day
  shots), fix, re-enable the seam, re-shoot.
- **17c remains after the bug**: the goldens — extend tests/e2e/golden.spec.ts with 6 room
  scenes (gallery/jordan × day/dusk/night; the det plateau constants ARE COMMITTED-SAFE:
  at=2026-06-22T03:18:00Z day, 2026-06-20T21:50:00Z dusk, 2026-02-17T16:25:00Z night — the
  room waits follow the smoke's roomReady pattern: data-room + data-ledger-bytes ≠ '0' +
  data-hold-ms = '0', then ~300 ms margin; page-level clip captures, headed real GPU, the
  baselines land under golden.spec.ts-snapshots) + the §4.4 headed measurement (A vs
  b-discrete vs b-rt at the plateaux AND mid-seam, 10-s HUD medians, the round-13 method) —
  **THE MEASUREMENT AND GOLDENS NEED A QUIET MACHINE (the owner's film pollutes cadence —
  ask first)** + ADR-0014 (the blend-technique verdict from the measurement) + the ROUNDS
  row 17 + the brief-file deletion discipline. The facade nits the owner parked for r19:
  the surrounds read as touching the columns (the derived module rhythm; a declared-gap fix
  is trivial mechanically, an art call), the afar blur = no-MSAA + the T1 render scale (by
  design; an owner question, not a bug).
- validate green: **254** tests, 16 files (vitest node) · build 6 js chunks, **236,663** gzip
  of 350,000 — cap untouched; the ≤225,000 r16 projection is re-marked measured in §9 (the
  loader stack GLTFLoader+KTX2+Meshopt cost more than the +60 KB estimate; headroom 113,337).
  e2e smoke green locally (SwiftShader). ⚠ Historical rows/log lines before round 16 say
  «204 tests» — undercount; the pre-round number was 208 (recorded in row 16).
- Payload rows (budget.mjs, all ok): _check 62,161 of 500,000 · jordan 526,735 of 7,000,000 ·
  rastrelli-gallery 123,749 of 2,000,000 · exterior 0 of 4,000,000 · basis 584,862 of 600,000
  (**basis is tight — never add anything to /basis/**).
- Room manifest budgets: gallery tris ≤110,000 / draws ≤25 / tex ≤1,000,000 B · jordan
  tris ≤380,000 / draws ≤60 / tex ≤4,000,000 B. Measured r15: gallery 2,106 drawn (6 unique
  prims), jordan 15,110 (12 unique prims); jordan fixed 64² lightmap grid carries 2,474 of
  4,096 cells.
- r16 interim simplifications still standing: deep-link cold load renders sky until the room
  is ready (dark-card choreography r17/r18); camera snaps to the entry stop / S0 (rail r18);
  the ledger registers payload bytes only (VRAM-from-format×mips fidelity and RT registers
  are r17).

## Standing protocol

**Relay loop.** One self-contained English brief at a time to the specialist chat (no tools, no
repo); wait for the reply; salvage-integrate (never paste wholesale); validate; commit own paths
only; push; watch CI via gh CLI. One ROUNDS.md row per round (multi-relay rounds list their relay
commits in the row). Open briefs live in docs/briefs/ as files; deleted once integrated.
Owner reads Russian; briefs and code in English.

**Transport traps (cost a full relay each when ignored).**
1. Numbers in verbatim material get MASKED by the transport. Specialist protocol: never guess —
   emit `MASKED-IN-BRIEF: keep the <name> value`; the orchestrator restores against the committed
   tree. Best: briefs carry no verbatim numbers at all (room coordinates/budgets live in
   orchestrator-owned files, not in the brief).
2. Long replies get truncated. Split whales at file boundaries; instruct: end with
   `TRUNCATED-HERE: <next file>`; continuation brief carries the adopted constants block + the
   committed file.
3. Reply budget: ~450 lines; cut at a file boundary, never mid-file.

**Brief boilerplate (copy blocks, compose fresh only the task-specific parts).**
- ROLE line: «You are the specialist of a relay. You have no tools, no repo access and no prior
  context; the orchestrator integrates your reply into the repository and validates it.»
- HOUSE STYLE (binds every file): leading block comment citing the design sections implemented;
  named exports only, no default exports; no enums; `satisfies` over `as` where a literal object
  is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index
  access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
  optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100;
  tests live in tests/ (never beside modules), Vitest node style describe/it/expect, no jsdom;
  pure modules are three-free and DOM-free (regex-scannable); state laws in comments once, plain
  declarative style.
- NUMBERS UNDER TRANSPORT paragraph + FORBIDDEN fence (per-round «must not touch» from design §10)
  + OUTPUT CONTRACT (numbered fenced blocks per file, one rationale line each, then CHALLENGES
  bullets) + closing line: «Before answering, challenge key assumptions, consider a credible
  alternative, and check likely failure cases; give the requested output with concise rationale
  and any material uncertainties.»

**Purity gate (house standard).** Regex scan of module source — strip comments and string
literals, then assert no /from\s+['"]three/, no node:, and no document/window/localStorage/
performance/Date/setTimeout/Math.random. Reference implementation: tests/hud.test.ts (~line 229).
Applies to every pure module (sky/*, engine/tier, ui/hud, and from r16: world/registry,
world/airlock, engine/ledger).

**Verified three 0.186.1 facts** (checked in node_modules 2026-10-18; do not re-derive):
- Import paths: three/examples/jsm/loaders/GLTFLoader.js · KTX2Loader.js ·
  libs/meshopt_decoder.module.js (exports MeshoptDecoder with useWorkers(count)).
- KTX2Loader: setTranscoderPath('/basis/') · setWorkerLimit(1) · detectSupport(renderer) (sync;
  detectSupportAsync deprecated r181) · parse(buffer, onLoad, onError).
- GLTFLoader: setMeshoptDecoder · parse(data, path, onLoad, onError) — callback-style, wrap in a
  promise; `path` resolves external texture URIs. renderer.initTexture(t) forces GPU upload.
- @types/three 0.186.0 covers examples/jsm.

**Budget gates (CI contracts — fixed by art/tier, never by loosening).**
JS gzip total ≤350,000 (budget.mjs counts EVERY dist/assets/*.js — lazy room chunks included;
round-16 target: total ≤225,000). Per-room payload caps from each manifest (≤8,000,000 ceiling);
exterior ≤4,000,000; shared basis ≤600,000. HUD data-draws ≤250, data-tris ≤1,000,000 asserted by
CI smoke; the toolchain draws gate counts UNIQUE primitives (naive node draws are info-only).
Goldens local-only (ADR-0012); CI smoke on SwiftShader asserts contracts, never cadence; device
numbers headed only; chromium on macOS 13.7 via PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14;
locator screenshots fail element-stability on rAF-canvas — page-level capture with clip,
expect timeout 60 s.

**Per-round read map (read only what the brief will quote; full reads only at wiring time).**
Design doc: docs/design-staircase.md. r16: §1.1, §2, §8, §10 (+src/main.ts at wiring).
r17: §4, §5, §7 + tools/asset.mjs + ADR-0013. r18: §6 + src/ui/hud.ts + src/sky/arrival.ts.
r19: §9 + docs/architecture.md (room contract) + ROADMAP.

**Ops.** Session start: `cd ~/Documents/hermitage-3d && /usr/bin/git pull --ff-only origin main`,
then read this file. Network git ops via /usr/bin/git only (local /usr/local/bin/git is broken for
network — known, do not diagnose). Stage own files by name; never .DS_Store, dist, probes/.
