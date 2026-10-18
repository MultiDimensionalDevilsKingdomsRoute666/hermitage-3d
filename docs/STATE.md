# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Detail lives in `docs/briefs/ROUNDS.md` rows and the design docs; this file is the index,
not the archive. If a number here contradicts a fresh measurement, the measurement wins — fix this
file in the same session.

## Live state

- Updated: 2026-10-18 · measured on the r16a integration commit `268e277`.
- Round 16 **in flight**. **16a integrated** (`268e277`): registry + airlock FSM + loaders +
  rooms list/scaffolds + manifest fetcher + main.ts wiring. Adjudications: contract static on
  the room entry (list = single source, graph fences whole); airlock `to` derived relative to
  `from` (one def serves both directions, cold entry lands on the def's `to`); boot deep link
  resolves as a cold entry; dispose-from unmounts synchronously (a same-tick chained entry
  must not see stale roomWork); gallery bounds cover the committed passage+gallery model
  (bpy constants). **16b brief open**: `docs/briefs/BRIEF-round-16b-ledger-hud.md` —
  specialist: src/engine/ledger.ts (pure, §8.3 layer 1) + HUD rows (data-room, data-hold-ms,
  data-ledger-bytes) + node tests. Orchestrator after the reply: RoomLoadContext gains
  `ledger` + rooms register/release in load/unmount + main.ts ledger wiring + dev assertion
  (renderer.info.memory ±0 vs post-boot baseline) + e2e smoke graph walk + ROUNDS row 16 +
  brief deletion. Gate: smoke walks #/ → gallery → jordan → gallery → #/ with the ledger back
  to the boot baseline and a clean console.
- validate green: 237 tests, 14 files (vitest node) · build 6 js chunks, **235,960** gzip of
  350,000 — cap untouched; the ≤225,000 r16 projection is re-marked measured in §9 (the loader
  stack GLTFLoader+KTX2+Meshopt cost more than the +60 KB estimate; headroom 114,040). e2e
  smoke green locally (SwiftShader). ⚠ ROUNDS row 15 / git log say «204 tests» — undercount;
  corrected numbers: 208 pre-16a → 237 now; note in the round-16 ROUNDS row.
- Payload rows (budget.mjs, all ok): _check 62,161 of 500,000 · jordan 526,735 of 7,000,000 ·
  rastrelli-gallery 123,749 of 2,000,000 · exterior 0 of 4,000,000 · basis 584,862 of 600,000
  (**basis is tight — never add anything to /basis/**).
- Room manifest budgets: gallery tris ≤110,000 / draws ≤25 / tex ≤1,000,000 B · jordan
  tris ≤380,000 / draws ≤60 / tex ≤4,000,000 B. Measured r15: gallery 2,106 drawn (6 unique
  prims), jordan 15,110 (12 unique prims); jordan fixed 64² lightmap grid carries 2,474 of
  4,096 cells.
- r16 interim simplifications still standing: deep-link cold load renders sky until the room
  is ready (dark-card choreography r17/r18); camera snaps to the entry stop / S0 (rail r18);
  the r16 ledger registers payload bytes only (VRAM-from-format×mips fidelity and RT
  registers are r17).

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
