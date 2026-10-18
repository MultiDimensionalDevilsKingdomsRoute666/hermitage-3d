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
- Round 17 **in flight**. **17a integrated and COMPLETE** (`60ef9b4`, `7b8399c`): bake
  pipeline + both rooms fully baked and committed (gallery 1024², jordan 2048² + probes),
  byte-identity proven on both rooms (jordan night run-2 == run-1 byte-for-byte under
  different machine loads). **17b integrated** (`cfeab8d`): the blend runtime —
  src/world/blend.ts (pure two-state selection) + src/assets/blend-gl.ts (technique A via
  onBeforeCompile; stock lightMap = state A, B fetch on the shared vLightMapUv, always-bound
  lmB fallback — no recompiles at crossings) + decodeRoomTextures additive + room/main wiring
  under the frozen §8 weights; e2e walk green with the blend on SwiftShader; 264 tests;
  238,616 gzip. **17c next**: PMREM probe (ADR-0013) + interior exposure constant + ledger
  VRAM rows (format×mips) + the §4.4 measurement harness (B-RT/B-discrete vs A, headed
  reference device, det plateau times from §8) + goldens at the three plateaux (J1/J4 ×3 +
  G1-night, local-only) + ROUNDS row 17 + ADR/DEC verdicts. No 17c brief written yet.
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
