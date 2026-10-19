# State — orchestrator's one-file pack

One file a new relay session reads at start. Two sections: **Live state** (update in the same
integration that changes the facts — same session, never later) and **Standing protocol** (rarely
changes). Detail lives in `docs/briefs/ROUNDS.md` rows and the design docs; this file is the index,
not the archive. If a number here contradicts a fresh measurement, the measurement wins — fix this
file in the same session.

## Live state

- Updated: 2026-10-19 · measured on the round-19 close.
- **Round 19 CLOSED — the phase-2 exit** (orchestrator docs round, no relay — owner-approved mode; the payloads are number-dense, exactly what the transport masks): all §9 rows re-marked measured and the round-19 device gate green. Headed device pass (Chromium 156, det, T1 1280×720, 10-s HUD median windows, 20 samples): medians 16.5–16.8 ms on ten scenes (six room goldens + J1 + the square-noon re-check at 31 draws / 49 807 tris — byte-identical to the phase-1 pass, so the r18 rail/caption DOM costs nothing measurable), T0 floor at the same medians, zero post-settle long tasks. The §9 first-frame device gate on deep links: dark card 454–617 ms warm (first page after browser launch 1 018 ms = cold process start, recorded honestly, gate scoped to the warm browser), first frame 1 713–1 867 ms unthrottled · 2 860 ms (jordan) / 1 869 ms (gallery) under a 10 Mbps + 40 ms CDP profile — the fetch finishes inside the declared 1 500 ms hold beat, so the gate is hold-dominated, not network-dominated. Ledger walk: 0 → 4 708 151 (gallery) → 7 044 854 (jordan) → peak 11 753 005 during the gallery→jordan hold (exactly the two mounts' sum) → 0 back home; the CI smoke asserts the same contract. §9 re-marks: draws row measured 114/96/27/31 vs ≤250 (the ≈60 estimate was low); texture VRAM row measured (ledger totals; ETC1S stays compressed on the GPU); payload 228 982 / 1 172 871 / basis 584 862 — **basis is the tight line now**; initial JS 243,239 of 350,000. architecture.md synced (ADR-0014 verdict inline, T2 bloom reserved-not-wired, 8 goldens, the phase-2 room-contract check line — both rooms satisfy every field, every check live). ROADMAP Phase 2 marked complete 2026-10-19; devlog #0002 written with the hero = the jordan-day golden baseline (owner-chosen); ATTRIBUTIONS gained the two phase-2 sources (saint-petersburg.com + the hermitagemuseum.org 1917 virtual visit); artistic-license gained the baked-opaque-windows line + the portal-niche vases and closed the r18 portal-box verify marker; design §2's «[verify r15 against a plan]» orientation marker closed by attestation (the enfilade runs west from the staircase ⇒ the staircase at the east end of the north wing's Neva front — the derivation stood; a measured plan remains a scan target); rooms/index.ts marker resolved (comment-only edit, zero behavior). README status → Phase 2 shipped.
- Round 17 **closed** (gate met): the interior light pipeline, three relay slices. **17a**
  (`60ef9b4`, `7b8399c`): the bake pipeline (Cycles CPU per state, compositor-OIDN denoise, toktx
  ETC1S linear, sha256 gates, all-or-nothing publish) + both rooms fully baked, byte-identity
  proven. **17b** (`cfeab8d`): the blend runtime (pure blend payload; the onBeforeCompile A+B
  patch on the stock lightmap path; the lm rows decoded via ktx2.parse; the rooms wired). **17c**
  (this commit): the technique hub `applyTechnique/disposeTechnique` (mode 'a' = §4.1 patched A;
  'b-discrete' = stock argmax floor; 'b-rt' = the per-frame ceiling), the `?lm=` and `?stop=`
  dev switches, the PMREM probe in loaders (one bake per hold) + the honest VRAM ledger rows,
  `RoomScene.setEnvironment` + `RoomLoadContext {lmMode, renderer}`, `blend.ts environmentScalar`
  (ADR-0013 1.0/0.6/0.35), the interior exposure constant 1.0, and the light seam (sun/hemi
  hidden indoors, restored by applyEpoch on exit — re-enabled for good).
- **The round-17c bisect** (the reported «black interiors»): the runtime chain exonerated layer
  by layer — the GPU ktx2 decode ≡ the stage PNG row-by-row, ETC1S killed only 0.7% of the
  surviving samples, uv1 alive and in range, all three techniques consistent, the material
  bindings correct. The cause: the day bake's indirect light is nearly absent at the walls
  (56% of the day EXR < 0.001 linear; the visible J0 view = the under-stair vestibule the bake
  legitimately leaves dark) + ONE night-tuned white point per room quantising the remaining
  field to 8-bit codes 0–2, which ETC1S finished off. The fix (the r17c scalar law, §4.4):
  per-state white points in the manifests' `lightmaps.intensity` record (jordan 0.1/0.1/3.0,
  gallery 0.03/0.2/0.2 — from the covered-percentile sizing policy; gallery night = a
  field-preservation adjudication over the bimodal distribution) + the declared per-room
  per-state look gain (`src/content/lightmap-look.ts`: both rooms day 4 / dusk 3 / night 1)
  + `tools/reencode.mjs` re-encoding all six atlases from the surviving denoised EXRs
  (determinism byte-verified on the pinned toolchain). Highlights clip flat at bake — declared,
  owner-accepted. The earlier «lightmap avg 93/255» probe reading was bogus (measured the wrong
  thing; no atlas averages that).
- b-rt had never actually worked (the channel-1 maps sampled the plane geometry's missing uv1
  attribute → a black RT) — fixed: HalfFloat target, stock-colour scaling (w·eff, One/One onto a
  black-cleared target; opacity cannot carry scale > 1), the shared uv1 attribute, the target
  texture on channel 1, the consuming lightMapIntensity = 1, the loud renderability check
  (WebGL2 + EXT_color_buffer_float). Amendments recorded in §4.2.
- **The §4.4 measurement ran (ADR-0014 keeps technique A)**: headed, reference device, T1, jordan
  J1, det day plateau, 10-s HUD medians: A 16.70 ms · b-discrete 16.70 · b-rt 16.70 (the vsync
  floor; +2 draws +4 tris; the ceiling re-blends every frame = the mid-seam worst case for free),
  the b-rt ledger 40.6 MB < 128 MB. The flip thresholds unmet. Honest limitation: the medians
  pin at 60 Hz — sub-vsync differences are below the resolution of this measurement.
- Gate MET — the goldens: 8 scenes green (noon + white night + the 6 room scenes
  jordan-J4/gallery-G1 × day/dusk/night; the det times day 2026-06-22T03:18:00Z, dusk
  2026-06-20T21:50:00Z, night 2026-02-17T16:25:00Z; the roomReady pattern = data-room +
  data-ledger-bytes ≠ '0' + data-hold-ms = '0' + ~300 ms; page-level clip, headed real GPU,
  baselines under `tests/e2e/golden.spec.ts-snapshots/`, local-only per ADR-0012). The owner
  reviewed and accepted the looks; parked with the acceptance: J0's dark entry (an honest unlit
  vestibule — framing rides r18's rail), the interior panes' constant night emission (Phase 2b,
  DEC-019), the visible 64² lightmap cell structure (an art call, r19+ menu).
- validate green: **280** tests, 20 files (vitest node) · build 6 js chunks, **240,486** gzip of
  350,000 · e2e smoke green locally (SwiftShader, 3 tests incl. the graph walk) · golden 8/8.
  Payload rows (budget.mjs, all ok): _check 62,161 of 500,000 · jordan 1,172,871 of 7,000,000 ·
  rastrelli-gallery 228,982 of 2,000,000 · exterior 0 of 4,000,000 · basis 584,862 of 600,000
  (**basis is tight — never add anything to /basis/**).
- Room manifest budgets: gallery tris ≤110,000 / draws ≤25 / tex ≤1,000,000 B · jordan
  tris ≤380,000 / draws ≤60 / tex ≤4,000,000 B. Measured r15: gallery 2,106 drawn (6 unique
  prims), jordan 15,110 (12 unique prims).
- Next: **Phase 2b** — DEC-019's lit night facade (one emissive pane per window hashed into three stock levels, intensity = kLevel × wNight imported from §8; `hemi.groundColor` warm lerp; night goldens re-baselined once, day/dusk bit-identical; +≤3 draws, +≤~4k tris). Then Phase 3 planning (the Military Gallery). Parked, owner-accepted, not blockers: scroll-only travel clamps at the rail ends (a scroll-past-end affordance is an owner product call); the landing lit «to be continued» card waits for phase-3 position portals; J0's dark entry framing; interior pane glow (DEC-019, Phase 2b); the 64² lightmap cell structure (an art call on the re-bake menu — the manifest intensity record stays the single source of truth for rebakes: edit manifest, then `tools/reencode.mjs`). The shared basis row is tight (584,862 of 600,000) — never add anything to `/basis/`.
- **Round 18b delivered** (this commit): captions + a11y — the pure presentation core
  `src/ui/captions.ts` (precedence dwell > suppressed > gliding > rest; the glide fades out
  holding the departure text and swaps only on landing — CAPTION_FADE_MS 240 < the
  shortest glide 320; the dwell shows the destination's seed-stop caption and hands over to
  the rest frame with zero changes; the announcement `<id> · <caption>` is sticky and
  rewrite-on-change; malformed committed data fails loud), the caption overlay `#caption`
  (aria-hidden, mirrored by the `role="status"` live region #caption-live), the focusable
  canvas (tabindex 0, aria-label, describedby → sr-only #scene-help + the live region;
  no role="application" — argued), the caption bound per frame with write-on-change, the
  dwell caption single-sourced from the seed law (seedInputs shared by seedRail/dwellStop).
  e2e: every walk landing asserts its beat text (the §6.1 beats verbatim off the committed
  data), the live region tracks the walk's ends (J4 forward, S0 backward), the graph walk
  asserts the dwell hand-over text, goldens hide #caption. validate green: **326** tests,
  243,239 gzip of 350,000 · e2e 12/12.
- **Round 18a delivered** (this commit): the camera rail — the pure core `src/camera/rail.ts`
  (centripetal Catmull-Rom α=½ through the stops + end phantoms only; stop-snapped parameters
  bit-identical to the committed data; the committed pose law exact at stops, angle-blended
  between; per-stop look limits blended linearly; glide (step 1400 ms / scroll 320 ms,
  smootherstep) with in-flight retarget/extend and reduced-motion cuts; wheel/drag/arrow
  INTENTS — the host owns the DOM; boundary intents only from arrow steps), `square-rail.ts`
  (S0/S1, §6.1 declared values) and `cam-param.ts` (?cam= parser mirroring ?stop=). Wired in
  main.ts: seed precedence ?stop= > ?cam= > entry, far-stop seed on backward entries,
  wheel (travels, preventDefault) / pointer drag (grab-the-world signs) / arrows (step +
  boundary→airlock via the §1.1 chain), the pose applied per frame from samplePose. HUD +
  `data-stop` (nearest stop id) — the e2e instrument, since a cut transit's data-hold-ms
  reads 0 by the r16 contract. e2e: the keyboard walk observes EVERY stop landed forward and
  backward across both airlocks (§10 r18 gate), the far end inert, the ledger back to boot
  values; press-during-open-transit is dropped by design → press-and-poll with a change-wait
  that outlasts the data-bound dwell. playwright workers=1 unconditionally (two WebGL
  contexts saturate the 2-core reference device — CI's old rule is now local law too).
  validate green: **310** tests, 242,635 gzip of 350,000 · e2e 12/12 (smoke 4 + goldens 8,
  un-rebaselined).

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
4. Same-base `page.goto` is a FRAGMENT navigation (no reload), and a mounted room keeps its
   technique until the next exit disposes it — measurement/e2e configs must open a FRESH page
   per configuration (the round-17c measurement's first run silently re-measured config 1).

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
Applies to every pure module (sky/*, engine/tier, ui/hud, world/registry, world/airlock,
engine/ledger, world/blend, world/lm-mode, world/stop-param, content/lightmap-look).

**Verified three 0.186.1 facts** (checked in node_modules 2026-10-18; do not re-derive):
- Import paths: three/examples/jsm/loaders/GLTFLoader.js · KTX2Loader.js ·
  libs/meshopt_decoder.module.js (exports MeshoptDecoder with useWorkers(count)).
- KTX2Loader: setTranscoderPath('/basis/') · setWorkerLimit(1) · detectSupport(renderer) (sync;
  detectSupportAsync deprecated r181) · parse(buffer, onLoad, onError).
- GLTFLoader: setMeshoptDecoder · parse(data, path, onLoad, onError) — callback-style, wrap in a
  promise; `path` resolves external texture URIs. renderer.initTexture(t) forces GPU upload.
- @types/three 0.186.0 covers examples/jsm.
- `capabilities.isWebGL2` is kept hardcoded true in r186 (backwards compat) — the half-float
  renderability check works, but the extension check is the real gate.
- A KTX2Loader CompressedTexture carries `mipmaps.length === 1` + the LinearMipmapLinear
  minFilter and still samples correctly (three/ANGLE keeps mip 0); the albedo chain ships mips.

**Budget gates (CI contracts — fixed by art/tier, never by loosening).**
JS gzip total ≤350,000 (budget.mjs counts EVERY dist/assets/*.js — lazy room chunks included).
Per-room payload caps from each manifest (≤8,000,000 ceiling); exterior ≤4,000,000; shared basis
≤600,000. HUD data-draws ≤250, data-tris ≤1,000,000 asserted by CI smoke; the toolchain draws gate
counts UNIQUE primitives (naive node draws are info-only). Goldens local-only (ADR-0012); CI smoke
on SwiftShader asserts contracts, never cadence; device numbers headed only; chromium on macOS
13.7 via PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14; locator screenshots fail element-stability on
rAF-canvas — page-level capture with clip, expect timeout 60 s.

**Per-round read map (read only what the brief will quote; full reads only at wiring time).**
Design doc: docs/design-staircase.md. r16: §1.1, §2, §8, §10 (+src/main.ts at wiring).
r17: §4, §5, §7 + tools/asset.mjs + ADR-0013. r18: §6 + src/ui/hud.ts + src/sky/arrival.ts.
r19: §9 + docs/architecture.md (room contract) + ROADMAP.

**Ops.** Session start: `cd ~/Documents/hermitage-3d && /usr/bin/git pull --ff-only origin main`,
then read this file. Network git ops via /usr/bin/git only (local /usr/local/bin/git is broken for
network — known, do not diagnose). Stage own files by name; never .DS_Store, dist, probes/.
