# Design — Phase 3 · The Gallery (v1)

The design document for Phase 3 (ROADMAP.md): the Military Gallery of 1812 as room three, the full route end to end, the room index, and the v1 exit. Produced by the design relay (docs/briefs/ROUNDS.md), integrated and fact-verified by the orchestrator 2026-10-21.

Marker legend: **[sourced]** — verified against a cited source at integration; **(verify)** — a declared design value to check against sources before/at the build round that consumes it; **(re-measure)** — a declared number the reference device owns at the light or exit round. Sources: en.wiki + ru.wiki "Military Gallery / Военная галерея" (both retrieved 2026-10-21), ATTRIBUTIONS.md rows to land with the license round.

## 0. Overview

Phase 3 ships room three, the Military Gallery of 1812 (route `#/1812`), and with it the first complete route of Zimny: Palace Square → arch portal → Rastrelli Gallery → Jordan Staircase → landing airlock → Military Gallery, ending at the closed doors to St George's Hall. It builds the gallery kit (shell, barrel vault, three skylight lanterns, doors, pilasters), a merged-geometry frame kit carrying 332 bust-length stand-in portraits plus the three monarch stand-ins on the end wall, one deterministic portrait atlas, the retargeted landing airlock, a registry-driven room index with deep links, three new room goldens (every room then golden in all three states), and the v1 README/architecture pass. The one signature idea: the gallery is a single long perspective of gilt rows lit only from above — the three skylight lanterns are the room's sole daylight [sourced: "потолок с тремя световыми фонарями", ru.wiki], so the three lightmap states are not three weathers but three positions of the sun over the same roof; the portraits are honest stand-ins, one atlas slot each, so v2 can swap the atlas for Dawe's canvases without moving a single vertex.

## 1. Script and beats

1.1 Route extension. The graph gains one edge: `jordan ⇄ 1812` via the existing landing airlock. The square stays resident; rastrelli-gallery and jordan are untouched modules. Adding the room is one folder under `rooms/1812` plus one registry line (DEC-013; rule 8 "core stays core").

1.2 Airlock: retarget, not new. The landing airlock already owns a portal box at true coordinates on the jordan landing and a declared hold beat; its far side changes from `null` to `1812` with a portal box at the gallery's north door. Rejected: a second airlock beside the first — it would leave an orphan seam and a second dispose path on the same landing (DEC-014: one seam per neighbour edge).

1.3 Transit kind: cut. The real walk from the staircase runs through the state rooms and reaches the gallery from the Armorial Hall: the rooms the gallery replaced sat "between the Armorial Hall and St George's Hall, in the middle of the main block" [sourced: ru.wiki], the tour order ends Armorial → Military Gallery → St George's [sourced: the Hermitage tour sequence], and the Field Marshals' and Petrovsky halls lie further west [sourced: Montferrand's 1833 western suite]. None of these halls are built. A doorway glide would claim an adjacency that does not exist; the cut is the same honest compression precedent as the arch-to-staircase cut (theatre-set compression). Reduced motion already forces cuts, so one path serves both.

1.4 Cold-load beat. A cold arrival at `#/1812` opens on the dark caption card with the room name and the compression note, never a spinner, for the declared hold beat: card text «Через Гербовый зал — в Военную галерею» / "Through the Armorial Hall into the Military Gallery" [sourced: the gallery's rooms sat between the Armorial Hall and St George's; the key joins the flat i18n union at the code round].

1.5 Prefetch policy. One new prefetch row: when the visitor reaches the jordan landing stop (the stop owning the portal box), fetch the 1812 manifest, geometry, atlas and the dusk probe; lightmaps load in order of current blend weight (highest first); the zero-weight state defers to idle. The warm path then needs only the hold beat; the cold path shows the card until the first two textures are resident.

1.6 The "to be continued" card retires. It was a parked placeholder at a null edge (r18b); the edge now has a neighbour. The card module is deleted (git remembers); the gallery's own far end is a closed door with an ordinary stop caption, no card. Rejected: moving the card to the St George's door — a palace should not announce its own unfinishedness inside the frame; v1 is a complete route, not a preview (the owner may reverse via Q2(b)).

1.7 Beats in order: landing stop → card (cut) → M0 threshold long view → M1 west wall close → M2 under the middle lantern → M3 the monarch wall → M4 the St George's doors, closed. Backward travel reverses through the same airlock (cut back to the landing).

## 2. Set design

2.1 The real hall (sourced unless marked): a top-lit, barrel-vaulted memorial gallery designed by Carlo Rossi (built June–November 1826, opened 25 December 1826), rebuilt by Stasov after the 1837 fire "exactly as it had been", lengthened then by almost six metres with choirs (хоры — an обходная галерея) added above the cornice. It sits between the Armorial Hall (north) and St George's Hall (south), in the middle of the palace's main block, a few steps from the Grand Church; long axis north–south; entered from the north end; five rows of bust-length portraits per long wall; three skylight lanterns in the vault; large equestrian portraits of Alexander I (Kruger), Friedrich Wilhelm III (Kruger) and Franz I (Kraft) at the far end wall, added in the 1830s.

2.2 Placement (declared at true coordinates; parametric pending the photo check). The committed location plan (en/ru.wiki "1812Gallerylocation.jpg", own read) shows the gallery as a narrow north–south strip continuing the stair-hall tract southward, with the palace church ("a few steps away", sourced) between, and St George's Hall as the big east–west hall along its east side — the declared placement follows that read. Declared bounds: x from 82.0 to 90.5 (width 8.5 m; inside the committed stair hall's x band, directly south of it), z from −40.0 to +15.0 (length 55.0 m; Stasov's lengthened hall (verify)), floor y equal to the committed jordan landing floor height (continuity across the cut), vault springing at floor+6.5, crown at floor+8.5, lantern ridges at floor+9.6 — all below the committed cornice. Portal box: north door, centred on x=86.25, z=−40, a 2×2×3 m box; the jordan portal box does not move (golden protection, §9). Open verify for the R1 photo check: whether the north door reads from the staircase's own tract or from the Armorial side (the sourced tour order says the Armorial) — either answer moves bounds, portal boxes and lantern z's only; no law changes.

2.3 Compression declared. The real walk from the staircase through the state rooms (Field Marshals', Petrovsky, Armorial [sourced tour order]) and the halls along the gallery's east side (St George's Hall) are not built; they exist as the card note and the closed doors. Register row: "the state-room walk compressed to one cut; neighbours implied by the card note and the closed east doors."

2.4 Materials palette (five, stock materials only — the last custom slot is not spent): PLASTER off-white matte (walls, vault, pilaster shafts) · GILT (frames, capitals, mouldings, door trim — the shared gold MeshStandardMaterial with committed constants) · PARQUET oak tile (floor; reuse the committed parquet tile if one exists, else one new 512² ETC1S tile) · PANE dark glass (lantern glazing, baked opaque per DEC-018 with the per-state sky colour baked in) · CANVAS (the portrait atlas on MeshStandardMaterial with map + lightMap). Every surface takes the blended lightmap through the adopted technique-A patch (ADR-0014).

2.5 Hero meshes (three, the DEC-005 cap): H1 the frame kit (merged frames + canvases per wall; the camera gets within 2.2 m at M1) · H2 the skylight lantern (one modelled lantern with glazing bars, placed three times and merged [sourced: three lanterns]) · H3 the monarch group on the south end wall: three large equestrian gilt frames [sourced: Kruger ×2, Kraft ×1, the end wall] (verify the sizes/composition against photographs before R1; H3's law is parametric). The closed St George's doors sit in the EAST wall, in the bay nearest the monarch end [sourced: the location plan shows St George's Hall along the gallery's east side] (verify the bay/door count against photographs). Everything else is procedural kit: shell, vault coffers, pilasters, doors, skirting, sconce brackets.

2.6 Inventory. Floor: parquet, one declared herringbone orientation. Doors: one double door north (entry), the closed St George's doors in the east wall (verify count/bay), four blind doors in the long walls at bay piers (declared). Dressings: paired pilasters with gilt capitals at each pier, a continuous gilt cornice band at the vault springing, sconce brackets on each pier at 2.4 m (twelve per wall; the real count is unsourced — declared from the night-state need). Declared omissions recorded for the license register: the Stasov choirs above the cornice (the camera's pitch limits stop below them), the four Palace Grenadiers portraits and the two Hess battle paintings (Soviet-era additions to the ensemble).

2.7 Portrait-wall layout law (declared, verify; parametric so the integration pass re-fits constants without touching code): rows five [sourced]; per long wall eleven blocks of five rows × three columns = 165 portraits, block pitch 5.0 m along z, block width 1.86 m, piers between blocks carry pilasters/doors; the two remaining portraits flank the north door at row 2 height; total 2×165+2 = 332. The pitch arithmetic closes: eleven blocks at 5.0 pitch span ~52 m of the 55 m wall. Frame outer 0.49×0.57 m around a 0.35×0.43 m canvas [sourced canvas size], column pitch 0.62 m, row pitch 0.70 m, bottom row centre at 1.6 m, top row centre at 4.4 m (verify spacing against photographs). South end wall: Alexander I centred, Prussia west, Austria east — large equestrian frames 1.6×2.2 m at centre height 3.6 m [sourced: large equestrian canvases, the end wall; sizes declared] (verify).

2.8 Only the union of rail frusta plus margin is modelled (DEC-005): the vault's far quarter-spans beyond the stops' pitch limits drop coffering; the backs of H3 and the door reveals are single quads.

## 3. Set construction

3.1 Kit list. K1 shell (walls, floor, end walls) — procedural boxes with a baked UV2 chart · K2 vault — extruded segmental profile with coffer grid, UV2 charted per span · K3 lantern (H2) — one authored low-poly glazed lantern, ~10×3 m footprint, pitched glazing, placed three times at the declared z's (verify spacing symmetric about mid) · K4 doors — one authored double-door panel reused six times, open/closed variants by rotation only · K5 pilaster + capital + cornice band — one authored pier module instanced along both walls then merged · K6 sconce bracket — low poly, merged with K5 · K7 the frame kit (H1): frame profile + canvas quad, generated · K8 the monarch group (H3): three authored frames and a pediment.

3.2 The frame kit is generated, not committed. One module (`layout.ts`-style law in the room's tools) holds the layout constants (ROWS, BLOCKS_PER_WALL, COLS_PER_BLOCK, BLOCK_PITCH, COL_PITCH, ROW_PITCH, CANVAS_W, CANVAS_H, BAR_W) and emits, deterministically, the frame positions. The same module feeds the bake rig and the runtime, so bake-time and run-time geometry are identical by construction (DEC-006 assets as code). Runtime builds one BufferGeometry per long wall (frames + canvases as two material groups) and one for the north-door pair; the end-wall group lives with H3. Rejected: a committed GLB of 335 frames — payload for data the law already states; rejected: InstancedMesh with a per-instance UV offset attribute — it needs onBeforeCompile and would spend the last custom material slot (the only one left after DEC-009 and ADR-0014).

3.3 Frame geometry. Four mitred bars, each a bevelled box of sixteen triangles → 64 triangles per frame, two per canvas; 335 frames ≈ 22 k triangles, ≈ 0.7 k for canvases. The gilt bars take the shared GILT material and lightmap UVs from a per-frame UV2 rectangle in the frame-kit lightmap chart; canvases take CANVAS with UV1 = atlas slot rectangle and UV2 = their own strip in the same chart. Draw calls: west wall 2, east wall 2, north pair 1, end-wall group 2 — seven draws for every portrait in the room.

3.4 Portrait atlas. One KTX2 ETC1S texture 2048×2048 (power of two, mipmapped, through the existing KTX2 loader; nothing added to the basis decoder row — the tight budget line is untouched). Slot 96×120 px (aspect 0.80 against the canvas 0.81), grid 21×17 = 357 slots. Allocation: slots 0–11 are three 2×2 monarch blocks (192×240 each) at the top-left; slots 12–343 are the 332 generals in roster order; slot 356 is the neutral "missing" slot; the rest reserved. Canvas UVs inset 3 px inside the slot; a 2 px dark gutter is painted into every slot edge; far-mip bleeding is accepted because stand-ins are painterly, and v2 inherits the same inset law. Slot index is the only contract between atlas and geometry: SLOT(i) = (i mod 21, floor(i / 21)).

3.5 Stand-in generator law (build-time script, the only producer of the atlas). For slot i: h = hash32(SALT_1812, i) using the committed deterministic hash (Math.random is forbidden). From h's bit fields: silhouette class ∈ {frontal, three-quarter-left, three-quarter-right}; shoulder width ∈ three named widths; head offset ±3 px; uniform colour from PALETTE_UNIFORM (six entries: infantry green, guards dark green, cuirassier white, hussar dark blue, artillery black, general's dark green with red); facing colour from PALETTE_FACING (four); epaulettes on/off; background from three dark umbers with ±8 % value from a second hash; face tone from four; two octaves of hash-based value noise as brush texture; a soft vignette. Monarch blocks use a fixed equestrian-suggestion field (horse mass, rider, sky) with hashed tone only. The rasteriser is pure JS writing RGBA (no node-canvas: platform anti-aliasing differences would break byte-identity), then the committed PNG→KTX2 ETC1S step under the DEC-016 toolchain pins (single-threaded toktx; byte-identity is the r15/r17 precedent). Output is byte-identical on rerun; CI hashes it.

3.6 Upgrade path to real portraits (v2, out of phase): replace the generator with an importer that places a public-domain image per roster key into the same slot, same inset; geometry, UVs, lightmaps and goldens untouched; the register row "stand-in portraits" is then closed. Roster: v1 keys slots by index only; a names roster (332 keys, display maps) is v2 content. Two sourced v2 details recorded now so the register can carry them: thirteen of the 332 places belong to generals with no surviving image — their frames are stretched green silk in the real gallery [sourced: ru.wiki]; v1 paints all 332 slots as stand-ins (picking the thirteen without a roster would misname them), and the v2 roster turns exactly those slots silk. The four Palace Grenadiers portraits and the two Hess battle paintings [sourced] are declared v1 omissions (§2.6), returning with the roster if the owner wants them.

3.7 Lightmap charts. Architecture (K1–K6, K8) shares one 2k² chart; the frame kit (K7, both walls and the door pair) gets its own 1k² chart generated by the layout module — ordered by slot, as deterministic as the geometry.

## 4. Light

4.1 Daylight sources are the three lantern openings only [sourced: three lanterns; top-lit hall]; no side windows exist, so the bake has no wall-level daylight and the room reads as a top-lit vault with a bright floor and dim lower rows — the look that makes the gilt rows legible.

4.2 States (shared manifest keys, per-room display meaning). day: cool-neutral skylight wash, floor the brightest surface, vault soft, portrait rows graded top-bright to bottom-dim; white point neutral, look gain unity (declared content rows). dusk: lantern panes baked to the dusk sky colour, low blue-grey wash from above, sconces at a third of night intensity so gilt starts to glint; white point warm-shifted by the committed per-room row. nightChandeliers: the gallery has no chandeliers; its night is the pier sconces (twenty-four, warm, ~2700 K look declared) and the lanterns baked as dark glass with a faint sky memory; the key stays `nightChandeliers` (data keys are raw tokens; this room's display map says "sconces"). Rejected: inventing chandeliers to match the key name.

4.3 Expected deltas between states are large here, unlike Rastrelli's timeless artificial light: floor luminance drops by an order of magnitude from day to night while the upper frame rows invert from brightest to dimmest. This is the room where the frozen §8 weight function is most visible; it is not re-opened.

4.4 Resolution: architecture 2k² (the largest surface area of the three rooms, and M2 looks straight into the vault), frame kit 1k² (335 small rectangles need texel density on gilt, not area), three states each → six lightmaps. Rejected: packing frames into the 2k (frame texels fall below the gilt's bevel pitch); rejected: 4k (VRAM line and bake time on the reference device).

4.5 Bake discipline on the two-core reference device (charter risk 6): preview bakes at quarter resolution for layout checks; one full bake per light round, three states sequentially, fixed seeds and sample counts under the committed baker's determinism contract; declared ceiling 40 min per state, 2.5 h total (re-measure); bake artefacts committed and regenerate byte-identically.

## 5. Environment

The adopted probe law applies unchanged (ADR-0013): one static dusk environment cube probe for the room, baked from the gallery's midpoint at eye height with the lantern panes in their dusk colour, loaded once in the airlock hold and disposed with the room; it feeds the gilt's specular and nothing else. No sky dome is visible from inside (opaque panes), so the probe is the only environment the gilt ever sees.

## 6. Cinematography and the room index

6.1 Rail: five stops over 55 m, glides of 12–15 m at the committed glide duration, scroll/drag/arrows as everywhere, reduced motion cuts. Stop ids follow the committed one-letter pattern (S0/S1 square, G0–G2, J0–J4): **M0–M4**. M0 Threshold (x 86.25, z −38, eye 1.65, looking south along the axis; yaw ±30°, pitch −10/+25°) — the signature long view and the golden stop. M1 West wall (x 84.3, z −25, looking west at a block; yaw ±25°, pitch ±20°, never closer than 2.2 m to the canvases so stand-in texels stay painterly). M2 Lantern (x 86.25, z −12.5, looking up 35°; yaw ±40°, pitch 0/+55°) — vault and glazing bars. M3 Monarchs (x 86.25, z +9, looking south at H3; yaw ±20°, pitch ±15°). M4 Doors (x 88.5, z +13, looking east-south at the closed St George's doors; yaw ±20°, pitch ±10°) — end of route; the stop caption carries the sentence the retired card used to carry ("за дверями — Георгиевский зал", Q2). Captions are i18n keys `caption.m0`–`caption.m4` (committed grammar), Russian canonical.

6.2 Room index — what it is. A deep-link list: an in-app overlay listing the built rooms in route order with their Russian/English names and a marker for the current room. Its data source is the room registry itself — no second list exists ("the registry is the index"); unbuilt rooms do not appear, nothing says "coming soon".

6.3 Where it lives. One small text button in the DOM chrome corner opposite the language toggle, label `index.open` → «Залы» / "Rooms", rendered at the chrome's resting opacity and fading with the captions on idle. It opens a native `<dialog>` (focus trap, Escape, backdrop for free), centred, dark, typographic — a list, no thumbnails, no map. Rejected: a persistent sidebar or minimap (light is the feature; UI nearly absent); rejected: hidden-until-Tab (an invisible control fails keyboard users and discovery alike).

6.4 Behaviour. Activating an entry is a jump: it closes the dialog and runs the airlock cold-entry path to that room's stop 0 (cut with caption card) — the same path a deep link takes, one code path for URL entry and index entry. Jumping to the current room just closes; jumping to the square cuts to its stop 0 (the square is resident). Keyboard: arrows move, Enter jumps, Escape closes, focus returns to the button; aria-labelledby `index.title`, role list, aria-current on the current room; no single-letter shortcut (arrows are the rail's). i18n keys join the flat union in the committed grammar: `index.open`, `index.title`, `index.current`, plus the room names as `data.title*` keys (the committed data-key pattern; `data.title1812` → «Военная галерея 1812 года» / "Military Gallery of 1812").

6.5 Routes: `/gallery`, `/jordan`, `/1812` (short, language-neutral hash paths; rejected `/military-gallery` as English-first). Note: these are HASH paths — the server always serves `index.html` and the hash carries the route, so no hosting rewrites are involved (the relay's SPA-rewrite concern does not apply); the R6 hosting experiment verifies content types and speed only.

## 7. Streaming and housekeeping

7.1 Prefetch rows: add 1812 to the landing-stop row (manifest, geometry, atlas, probe, lightmaps by weight); add the reverse row on M0 of 1812 so a backward cut to jordan is warm.

7.2 Disposal ledger expectations on leaving 1812: geometries −5 (two wall kits, door pair, architecture, H3 kit), textures −8 (six lightmaps, atlas, probe) and −1 if a new parquet tile ships, materials −1 (the CANVAS instance; GILT/PLASTER are shared), programs: at most +2 new stock variants compiled on first entry (Standard with map+lightMap, and the pane variant) and retained by the three.js program cache as the committed ledger already tolerates. The ledger must return to boot values after square → gallery → jordan → 1812 → jordan → gallery → square.

7.3 Smoke walk extension: the walk covers the new edge in both directions, plus two deep-link starts (cold `#/1812`, then index-jump to `#/gallery`, then to the square) with the ledger back at boot. The manifest-verified payload rows for 1812 join the existing room-cap check.

## 8. Box office

All 1812 values are declared and marked (re-measure); committed sibling values are restored by the orchestrator at integration. Whole-frame peak is the jordan→1812 swap, when both rooms are briefly resident.

| Row | rastrelli | jordan | 1812 (declared) | peak at swap | cap |
|---|---|---|---|---|---|
| Triangles | committed | committed | 48 k (22 k frames) | jordan + 48 k | committed frame cap |
| Draw calls | committed | committed | 19 (7 for portraits) | jordan + 19 | committed frame cap |
| VRAM textures | committed | committed | ~14 MB (3×2k, 3×1k, atlas, probe) | jordan + ~14 MB | committed VRAM cap |
| VRAM geometry | committed | committed | ~3 MB | jordan + ~3 MB | committed VRAM cap |
| Payload (room) | committed | committed | ~3.8 MB (lightmaps 2.7, atlas 0.5, kit 0.4, probe, parquet) | n/a | 8 MB per room |
| JS gzip delta | committed | committed | +9 KB (room 3, layout+kit 2.5, index 2, i18n 1, misc 0.5) | n/a | 350 KB cap; ~90 KB headroom |
| First lit frame, cold | committed | committed | ≤ hold beat + 2.5 s on the reference device and committed network | n/a | committed |
| Bake time (3 states) | committed | committed | ≤ 2.5 h | n/a | discipline only |

Tight line: VRAM at the swap — jordan's 2k set plus the gallery's six lightmaps and atlas on integrated graphics. If it fails, the fix is art or tier (frame-kit lightmap to 512², atlas mips trimmed by content — never the number). The basis decoder row does not move: zero new loaders.

## 9. Golden frames plan

9.1 New: three goldens for 1812 at M0 (day, dusk, nightChandeliers) under the committed capture rig and frozen clock values — room goldens go six → nine, scene goldens nine → twelve; M0 sees both walls, all three lanterns and the end wall, so one stop pins every material.

9.2 Existing nine scene goldens stay bit-identical. Guarantees: the jordan portal box and landing stop do not move; the retired card is DOM, never in the canvas; no shared shader, the lightmap-blend patch, the sky dome, the weight function or the capture rig is touched; the shared GILT material constants are not edited (if the gallery wants different gold it declares a room-level look gain, not a material change). Any golden drift outside 1812 fails the round.

9.3 Goldens regenerate only when a law changes, by an explicit DEC; this phase proposes none.

## 10. Production schedule

Split-never-widen: a round that overruns is split, its scope is not widened. Each round ends with budgets green and goldens unchanged outside 1812.

| Round | Scope | Exit gate | Must not touch |
|---|---|---|---|
| R1 Asset A — kit | layout law + constants; frame-kit generator with UV1/UV2; K1–K6, K8 authored/procedural kit; UV2 charts; placeholder atlas slot colours | kit renders in the bake rig; frame count 335; chart hashes stable across two runs | `src/engine`, `src/world`, other rooms, shared materials |
| R2 Asset B — atlas | pure-JS rasteriser, generator law, PNG→KTX2 step, slot allocation, "missing" slot, license register row for stand-ins | atlas byte-identical on rerun; ≤ 0.7 MB; mips inspected at M1 distance | decoder/loader rows, R1 geometry |
| R3 Runtime | `rooms/1812` module + manifest + registry line; landing airlock retarget (cut); card retirement; prefetch rows; ledger; smoke walk extension | smoke walk passes both directions and deep links; ledger at boot; payload rows verified | `src/engine`, `src/world` beyond the additive hooks, rastrelli/jordan modules |
| R4 Light | three bakes (2k arch, 1k kit), probe, per-state white points/look gains, pane colours; three new goldens; VRAM swap-peak measurement on the reference device | goldens captured; the nine old scene goldens bit-identical; swap peak measured (the 512² kit fallback rehearsed here if the line is close) | shader patch, weight function, capture rig |
| R5 Camera + index | five stops with look limits and captions; room index dialog + button; i18n keys RU/EN; a11y pass | keyboard walk of index and rail; captions complete in both languages; JS delta ≤ +9 KB | rail engine, chrome layout of existing controls |
| R6 Exit | re-measure every row of §8; license register complete; README and architecture.md (route, airlock graph, atlas law, device gate); v1 tag; hosting reachability experiment (cold-load `https://…/`, `#/jordan`, `#/1812` from a remote network; record first lit frame; confirm content types; hash routes need no rewrites) | all budgets green; public URL serves `#/1812` cold on the reference device within budget; v1 announced in README (RU first, EN) | everything else |

The (verify) placement block (§2.2) and the layout-law constants (§2.7) close before R1 constants freeze — the plan check and the photo check are integration work, not a relay round.

## 11. ADR/DEC candidates

One line each, unnumbered; the orchestrator writes the numbered entries after owner disposition (DEC-021… / ADR-0016… continue the registers).

- **Portrait consumption: merged canvas quads with baked atlas UVs on one stock material.** Rejected: InstancedMesh with per-instance UV offsets — spends the last custom slot.
- **The frame kit generated at build and run time from one layout law, zero committed frame geometry.** Rejected: a committed GLB of all frames.
- **Portrait atlas law: 2048², 96×120 slots, 21×17 grid, slot index as the only atlas–geometry contract, 3 px inset.** Rejected: one texture per block (draw and payload explosion); rejected: 4k atlas (VRAM line).
- **Stand-in generator: pure-JS deterministic rasteriser keyed by hash(SALT, slot).** Rejected: node-canvas (non-reproducible anti-aliasing).
- **Retarget the landing airlock to 1812; transit kind cut with the compression note on the card.** Rejected: a new airlock beside it; rejected: doorway glide implying false adjacency.
- **Retire the "to be continued" card entirely.** Rejected: relocating it to the St George's door (Q2).
- **Night state is sconces; the key remains `nightChandeliers` with a per-room display map.** Rejected: renaming the key; rejected: invented chandeliers (Q6).
- **Lightmaps 2k architecture + 1k frame kit.** Rejected: single 2k; rejected: 4k; the 512² kit fallback is pre-declared for the VRAM line (Q7).
- **Room index = registry-driven native dialog behind one chrome button, jumps via the airlock cold-entry path.** Rejected: sidebar/minimap, hidden-until-Tab, bespoke modal (Q4).
- **Route slug `#/1812`.** Rejected: `#/military-gallery` (Q3).
- **Three monarchs as 2×2 atlas blocks on the end wall as the third hero.** Rejected: single slots (illegible at M3) (Q5).
- **Stand-in portraits declared in the license register this phase, with the v2 swap path recorded** (the owner's ruling — cited, not re-opened).

## 12. Open questions — owner dispositions

Each: decision · blocks · options · recommendation · default if silent. **Dispositions (owner, 2026-10-21): all twelve defaults accepted** — cut+card (Q1), the card module deleted with the M4 caption carrying the sentence (Q2), `#/1812` (Q3), the always-present dim index button (Q4), three 2×2 monarch blocks (Q5), sconces-only night (Q6), 2k+1k lightmaps with the 512² kit fallback pre-declared (Q7), the M0 golden stop (Q8), the roster deferred to v2 (Q9), the parametric layout law with the integration re-fit (Q10), README banner + git tag v1 (Q11), and the tier plan R2-strong / R1+R3-cheap / R4–R6 by disposition (Q12). The DEC entries DEC-021…030 are written in decisions.md.

- **Q1 Transit kind for landing→1812.** Blocks R3. (a) cut with compression card · (b) doorway glide. Recommend (a) — the intermediate halls do not exist. Default (a).
- **Q2 The "to be continued" card.** Blocks R3. (a) delete the module; the M4 caption carries the sentence · (b) move the card to the St George's door. Recommend (a). Default (a).
- **Q3 Route slug.** Blocks R3/R5. (a) `#/1812` · (b) `#/military-gallery` · (c) transliterated Russian. Recommend (a). Default (a).
- **Q4 Room index exposure.** Blocks R5. (a) dim always-present text button · (b) appears only on Tab/idle · (c) key-only, no button. Recommend (a). Default (a).
- **Q5 Monarch stand-ins.** Blocks R2 slot allocation. (a) three 2×2 blocks · (b) single slots. Recommend (a). Default (a).
- **Q6 Night light of the gallery.** Blocks R4. (a) sconces only · (b) lanterns lit from within (attic-lamped) · (c) both. Recommend (a) — unsourced historic night lighting; the declared look is the memorial dusk. Default (a).
- **Q7 Lightmap split.** Blocks R1 charts and R4. (a) 2k + 1k · (b) single 2k · (c) 2k + 512². Recommend (a); (c) is the pre-declared fallback if the VRAM line fails. Default (a).
- **Q8 Golden stop.** Blocks R4. (a) M0 only · (b) M0 and M1. Recommend (a) — M0 pins every material. Default (a).
- **Q9 Names roster now or v2.** Blocks nothing in v1. (a) v2 · (b) commit the 332-key roster now. Recommend (a). Default (a).
- **Q10 Layout law fit.** Blocks R1 constants. (a) accept the declared law pending the plan check, integration re-fits constants · (b) hold R1 until sources are checked. Recommend (a). Default (a).
- **Q11 v1 announcement form.** Blocks R6. (a) README banner + git tag v1 · (b) README only. Recommend (a). Default (a).
- **Q12 Tier declaration.** Blocks nothing (process). (a) R2 (the generator law) runs on the strong specialist; R1/R3 on the cheaper fast model; R4/R5/R6 by disposition per round · (b) every relay round on the strong specialist. Recommend (a) per the relay-routing rule. Default (a).
