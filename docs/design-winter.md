# The winter mode — snow on the cornices; the facade-surface slot

Phase 4 · Reach, round R8 (2026-10-27). Design by the CREATIVE relay (docs/briefs/r8-winter-announcement.md, retired at integration); the design's ten factual uncertainties resolved against the tree at 000fa1a (§7). DEC-033 records the decision. The v1 announcement prose landed in the same round (README.md).

## §1 The season law (wSnow)

- A pure module beside the night-facade law: `snowWeight(instant)` in [0,1] — the climatological probability of persistent snow cover on the calendar date, NOT snow depth: a cornice saturates after the first persistent snowfall, so the curve ramps fast to a plateau; snow lags the sun, so the plateau centres ~6 weeks past the solstice (a declination-based curve would be wrong).
- Four calendar anchors, smootherstep seams (the easing imported from the weight law's module, never re-derived): accumulate Nov 10 → Dec 15 (0 → 1); full Dec 15 → Mar 10; melt Mar 10 → Apr 20 (1 → 0); zero otherwise. The anchors are the owner's taste parameters, defensible against the cited climatology (first snow ~early November; stable cover 110–145 days, ~early December to late March; melt ~mid-April) — tune against the first dec-noon render.
- Evaluated on a season axis starting Aug 1 (days since) — no year-wrap discontinuity; the seams are weeks wide, so UTC-vs-local day and leap days are immaterial; continuous across Dec 31 → Jan 1 by construction.
- The law reads the CLOCK'S INSTANT (the same parsed instant the sun uses — `at=`/`det=`), never Date.now(): under det the season is fully pinned by the URL — no new machinery, two renders at one at= stay bit-identical.

## §2 The cornice cap (the signature element)

- ONE merged mesh following the solver's UPPER cornice-run paths — 9 runs (5 section fronts + 4 risalit returns; the upper band is acrossPortal). The 8 LOWER cornice-runs (baseY 10.2) carry the slot term only — the cap belongs to the crown (~22 m).
- The settled-snow profile: 6–8 segments — a convex bulge rounding over the crown's outer edge with a small overhang. (TUNED R9.1 — the owner's first look verdict FAIL «no hint of snow»: the design's 10–15 cm lip is ~0.6 px from S0 at 230 m, ~0.19 m/px — sub-pixel; raised to the cornice-drift scale, SNOW_THICKNESS 0.5 m ≈ 2.6 px at S0 / 4.7 px at S1, SNOW_OVERHANG 0.1, SNOW_DROOP 0.08; the slot's SNOW_FACING band lowered 0.45→0.3 to catch the pediment rakes. LESSON: the metres-per-pixel visibility math belongs in every visual design review.)
- The morph law: the base geometry is the profile collapsed onto the crown's top edge (sunk ~1 cm so no face is coplanar), the target is the full lip, the per-frame morph influence is wSnow — snow grows through November, melts through March–April, no custom GLSL, one built-in deterministic path.
- Hidden outright at wSnow = 0 (the night lattice's mirror law): out of season the cap costs nothing and the frame is pixel-identical to today.
- The cap's own MeshStandardMaterial: near-white, slightly cool albedo (linear ~0.82/0.86/0.92), roughness ~0.9, metalness 0, no texture. Free consequence of the existing law: at night hemi's ground warm-up (by wNight) draws a faint warm underline under the lip's cold sky-lit top.
- Resolved fact: the crown geometry's normals are SMOOTH (ExtrudeGeometry computes vertex normals; steps 1, bevel off; no flatShading anywhere in the builder) — the mask threshold handles most fascia bleed; if the render shows bleed, the fallback is a solver-emitted per-vertex snow-catch attribute (testable in TS) instead of the normal mask.

## §3 The facade-surface slot (the shared material term; the Floodlit reservation)

- Resolved fact: the kit has EXACTLY ONE material — the shared MeshLambertMaterial 'FacadeKit' (vertexColors, white base); the massing carries its own massingMaterial (never shared) — the slot is ONE injection point and cannot snow the roof by accident. The only onBeforeCompile/customProgramCacheKey uses in src/ are the interiors' blend-gl — the repo's patch-pattern precedent; the kit material is unpatched today.
- The patch: one onBeforeCompile on 'FacadeKit', ONE shared uniform object written once per frame, a custom program cache key (patched and unpatched programs never share — the classic bug).
- The snow term: coverage = wSnow × smoothstep(dot(shadingNormal, worldUp), ~0.45, ~0.8), with a soft lower cutoff below ~1.5 m world height (the cleared, trampled zone — the same varying the floodlight will need). Where covered: albedo toward the snow albedo, roughness toward ~0.9, metalness toward 0 (gilt capitals get dusted).
- No hash, no noise (the DEC-019 discipline): coverage edges come from geometry (normals) and the smoothstep — deterministic across runs on the reference GPU.
- At wSnow = 0 every term is an exact identity (mix with 0, multiply by 1): out-of-season frames are analytically unchanged. Fence fallback if ≤1-LSB drift appears out of season: a compile-time define so the out-of-season program is literally today's source.
- THE SLOT'S CONTRACT (fixing DEC-019's «material height gradient sharing a slot with Phase 4 snow» for the 5+ Floodlit item): inputs are world height, world normal and clock scalars; composition order is SURFACE TERMS BEFORE LIGHT TERMS (snow alters albedo/roughness/metalness before lighting; the floodlight later adds irradiance after) — floodlit snow glows warm without either term knowing the other; the cap's material registers in the same set (the cap is floodlit automatically later); no Light objects (light counts frozen); the world-height varying snow adds today is the one the gradient will use. Reserve the name and the order; ship NO dead flood uniform.

## §4 The mode surface: NO mode

- Winter is a law of the existing clock — the date drives snow the way elevation drives the lattice. No chrome control (principle 3; DEC-019's must-not-touch UI list), no new URL grammar, nothing persisted. at= is already the way to see any hour; it is now the way to see any season (a shareable winter link is an at= in January).
- Rejected: a chrome toggle (violates principle 3 outright); a URL flag as the primary surface (a hidden feature nobody finds; a snowless December Petersburg as the default is incoherent with the thesis). A dev-only ?snow= override under the ?lm= precedent is acceptable LATER if the fence or art direction needs an out-of-season snow render — not in base scope.
- Real weather via an API: a backend AND non-deterministic — doubly excluded by the charter.

## §5 Budget accounting

- Payload: exterior +0 B (stays 0 of 4,000,000); shared basis +0 B (stays 584,862 of 600,000); rooms +0. No KTX2, no texture of any kind.
- JS bundle: ≈3 KB gzip expected (law ~0.4 + cap builder ~1.5 + slot patch ~1 + wiring ~0.2); the DEC-033 ceiling: +6,000 B gzip → ≤ ~277 KB of 350,000.
- RU i18n chunk: +0 B (no user-facing strings; README is never bundled).
- Frame: +1 draw call in season, +0 out of season; +~300 triangles (ceiling +1,000) against the 1,000,000 cap; the interiors untouched (their tighter contracts unaffected); +1 material; +1 shader-program variant (compiled at first render); lights +0 (frozen).
- CPU per frame: one season evaluation + three writes (uniform, morph influence, cap visibility) — beside the wNight writes, same rhythm.

## §6 Tests and goldens

- Unit tests on the season law (mirroring the weight-law tests): range [0,1]; exactly 0 out of season; exactly 1 on the plateau; monotone on the seams; continuous across Dec 31 → Jan 1; leap years; pinned values at the golden instants (2026-12-21 → 1.0; the June instants → 0).
- Solver/fixture: the cap's path length and segment count equal the upper cornice-run's (9 runs); the cap base sunk into the crown.
- Scene goldens — ALL by the winter DEC (DEC-033 names every file):
  - RE-BASELINE golden-dec-night (2026-12-21T18:00Z): full lattice + full snow (wSnow = 1 on the plateau). Git history keeps the DEC-019 exit image.
  - ADD golden-dec-noon — the same camera as dec-night, at 2026-12-21T10:00Z (solar noon at 30.3°E; the day's maximum ~6.6°): wNight = 0 (the lattice hidden), snow full, the low sun raking the lips. THE winter exit gate — the point of snow is that December becomes legible in daylight.
  - ADD golden-oct-night at 2026-10-15T20:00Z: wNight = 1, wSnow = 0 — restores an isolated lattice fence now that dec-night fences two things. Recommended; droppable if the golden budget concerns.
  - NO partial-season golden: the half-grown morph is covered by a smoke assertion (renders; caps respected; no degenerate warnings).
- Pixel-identity proofs: the 8 interior goldens (jordan ×3, gallery ×2, 1812 ×3) unchanged — the kit, lattice and throat ride the palace group and `palace.visible = visible && !indoor` hides them all indoors; the room modules add nothing exterior. The out-of-season square goldens (noon, white-night, s1-noon — all June instants) unchanged — only dec-night falls inside Nov 10–Apr 20. Fence fallback: §3's compile-time define.
- Smoke: at a winter instant, draw calls and triangles under the caps; at a summer instant, the cap invisible and the uniform 0.
- Re-baseline procedure: --update-snapshots overruns into every scene baseline — re-baseline filtered to the one scene (or stage the one PNG and revert the rest); name every touched file in the DEC.

## §7 The resolved facts (the round's uncertainty record)

1. Kit materials: ONE ('FacadeKit', MeshLambertMaterial, vertexColors) — facade-builder.ts:579-582; the massing's material is its own (massingMaterial, green, transparent) — no shared slot, no accidental roof snow.
2. The massing roof: a 2 m horizontal-top band per wing (y 22→24, set back 1 m) on massingMaterial — main.ts:329-336; from the square stops (S0 [0, 1.7, 230], S1 [0, 1.7, 124] — both eyes 1.7 m) the upward faces above the cornice line are never seen; the bare roof is invisible from the route (recorded in the license register).
3. The square stops' eyes: both 1.7 m (square-rail.ts) — flat cornice tops are never seen from the rail; the lip's silhouette + the material term carry the effect (the design's visibility challenge confirmed).
4. The square goldens' instants: noon 06-21T12:00Z · white-night 06-20T21:45Z · s1-noon 06-21T12:00Z (+stop=S1) · dec-night 12-21T18:00Z — exactly ONE re-baseline. The 13 snapshot files = 4 square + 9 generated room baselines, 1:1 with the tests (the spec's «26 → 29» comment is stale arithmetic).
5. The interior goldens see NO exterior: the kit/lattice/throat groups are children of the palace group (main.ts:345-354); applyPresentation flips palace.visibility indoors; the rooms add nothing that shows the exterior.
6. The climatology cited: ru.wikipedia «Климат Санкт-Петербурга» (first snow ~early November; stable cover 110–145 days, ~early December–late March; melt ~mid-April) + pogodaiklimat.ru station 26063 (snow-cover days: Nov 13 / Dec 24 / Jan 28 / Feb 25 / Mar 23 / Apr 4). The anchors sit inside these bands; the tuning stays the owner's.
7. The crown normals: smooth (ExtrudeGeometry, steps 1, bevelEnabled false; no flatShading/computeVertexNormals/toNonIndexed in the builder) — §2's fallback applies.
8. onBeforeCompile/customProgramCacheKey exist only in src/assets/blend-gl.ts (the interiors) — the kit is unpatched; the patch-pattern precedent is in-repo.
9. /notes bundles no docs/*.md (its chain: facade-spec + solver + i18n) — a new design doc costs 0 bundle bytes.
10. The cornice-runs turn the risalit corners: 17 runs (8 lower + 9 upper; fronts + returns; the upper acrossPortal) — confirmed by tests/facade-solver.test.ts; the cap needs NO synthesized returns.

## §8 The implementation map (a later mechanical round)

- src/world/snow-season.ts (pure): snowWeight + the named anchors.
- src/procedural/snow-cap.ts: the cap builder from the solver's upper runs.
- The slot patch: with the kit builder's material (facade-builder.ts).
- main.ts: the per-frame writes beside the wNight block (uniform, morph influence, cap visibility).
- Tests: the season-law unit file; the golden additions/re-baseline per DEC-033; the smoke lines.
- Docs at ship: devlog 0006; the ROADMAP tick.

## §9 Residuals for the owner

- The four anchor dates: taste; tune against the first dec-noon render. (DONE R9.1: the owner's verdict tuned the constants — see §2.)
- The prose's closing «Дальше — зима» line: removable if the owner prefers not to promise.
- The ?snow= dev override: deferred, not in base scope.
