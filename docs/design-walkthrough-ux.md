# Design — the walkthrough UX pass («compose the seams»)

Status: direction adopted from the relay reply (2026-10-22, zero-steering dossier
`docs/briefs/walkthrough-ux-dossier.md`), near-wholesale with the orchestrator's
verification deltas; **owner dispositions D1–D8 pending.** No code yet; the
implementation plan is §12. Provenance labels: **verified** (checked against the
committed tree/captures this session) · **reply** (the specialist's decision text,
adopted as written) · **declared** (a number to re-declare at implementation).

The thesis (the reply's, adopted): every one of the four owner complaints is the same
defect seen from four sides — **the frames that matter most (the door, the arrival, the
pause, the climb) are the frames nobody composed.** Stops are composed and
golden-pinned; everything between and across them is interpolation or a default. The
direction is to compose the seams: light at a threshold is the invitation, dark at a
threshold is the pause, a subject the camera keeps looking at is the intention. The
chrome stays nearly absent; two text lines change; no icons, no spinner.

---

## 1. Verified root causes (each observed complaint → mechanism → fact)

1. **The invitation is invisible or lies** (obs 1): the one-shot hint names DRAG
   («Потяните, чтобы подойти ближе») while drag only rotates — the first wheel event
   dismisses the hint, so the correct verb is never shown (verified: main.ts wheel
   handler calls `hintTravel()` first; rail drag → `lookTarget`). The bottom-centre
   prompt appears only when the glide has fully died at the exact rail end, is
   ~12 px ~55%-white text, says "Keep scrolling to enter" while being a click-button,
   and needs a sustained wheel pass (three thresholds) with **zero visible feedback**
   during the pass. After every arrival the same line shows «Keep scrolling to enter»
   in a room just entered (the boundary law is directional; verified in captures).
2. **The approach and the arch void are uncomposed** (obs 2): S1 stands ~6.5 m from
   the gate pavilion's columns (massing outer face z 93.5, S1 z 100); the arch
   openings are kit recesses with nothing modelled behind while the gallery is
   unmounted (verified: massing has no arch hole; the gallery GLB owns the passage).
   ~40% of the frame under luminance 10/255 in the day-instant capture; the caption
   says «the arch opens» while the frame shows a void.
3. **The pause is an empty slot** (obs 3): the transit is hold → hard cut. The hold
   is max(declared 1500 ms, load) and the frame freezes exactly (no pose advance, no
   dimming, no indication; the §2.3 choreography that was meant to occupy the hold
   never shipped; the §1.3 prefetch table never shipped). beginTransitTo → ensureRoom
   starts the whole chain serially at transit start (manifest → chunk → fetch →
   transcode → mount → compileAsync + PMREM), so an un-prefetched neighbour costs
   seconds on the owner's network. A frozen frame with dead inputs reads as a hang.
4. **The corridor's day state is the divergence, not the design** (obs 4a): the day
   bake's wall light is nearly absent in bytes (recorded bisect); the restore chain
   (manifest white points day 0.03 × gain 4 ≪ dusk 0.2 × 3) makes DAY the darkest
   state of the room. The committed day golden is ~99% black at G1; night reads
   brighter. The declared beat was «low, dim, long… differ little… timeless».
5. **The corridor path cuts its own corner** (obs 4 movement): G0's default gaze
   targets G1's position — the ray exits the arch passage through its east wall
   (verified: (0,86)→(24,73) crosses x=4 at z≈83.8, inside the passage
   z 63.5..87.5 — into unlit/unmodelled shell); the G0→G1 glide carries the camera
   through that same wall band for several metres. The L-turn passage→gallery axis
   has no stop (the end-phantoms adjudication leaves it uncomposed).
6. **The stair arrival stands inside a doorway box** (obs 4b): the destination
   portal is the declared under-stair vestibule; J0 (79, 1.7, −64) sits inside the
   vestibule box — verified against the build script: the vestibule spans x 78..84,
   z −68..−62, **height 3.0 m** (ceiling 1.3 m over the eye), door x 79.5..82.5
   (h 2.6) in its north face. The arrival gaze points at its interior wall; the
   back-prompt shares the first frame.
7. **The stair stop set does not touch the built stair at all** (obs 4c — the
   salvage's deepest find, deeper than the reply's chain): the committed stops carry
   the §6.1 DECLARED guesses; the built stair (r15 bpy, sourced) sits elsewhere
   entirely. Verified against `tools/bpy/jordan.py`:
   - Hall tract x 66..92, z −86..−62; the **north wall (z −86) is the Neva front —
     the window tiers**; small portholes on the south wall.
   - Flight 1 hugs the **west wall**: x band 66..67.6, runs z −68.12 → −79.0
     (climbs NORTH), y 0 → 5 (35 risers, rise 0.143, going 0.32, run 10.88).
   - Mezzanine lane: x 66..69.12, z −84.4..−79, **y 5**.
   - Flight 2 runs along the **north window wall**: z band −84.4..−82.8 (1.6 m clear
     of it), climbs EAST x 69.12 → 80, y 5 → 10.
   - First-floor landing slab: x 80..92, z −84.4..−64, **y 10**; chandelier over its
     centre (86, −74).
   - J1 (79, 5.2, −70), J2 (79, 6.7, −80), J3 (73, 9.7, −76), J4 (73, 11.7, −66) all
     hover mid-air away from flights/landing; J4 is WEST of the landing's west edge
     (x 80) and 6.7 m above the mezzanine. The camera path cuts the well void
     diagonally — the pull that the owner named «random flying». The gaze law
     (stop i → stop i+1's position, shortest arc) compounds it: gaze chases the
     camera's own future positions across two near-reversals per climb.
8. **G2 faces away from the door it stands at** (the pose law's «last stop looks
   back»): the corridor's east-door stop gazes into the gallery behind it, not at
   the door the visitor must push through (verified in rail.ts committedTarget).

---

## 2. The invitation (reply §2.1, adopted)

- PRIMARY: composed light. From the approach stop the doorway reads as a lit
  opening with depth (§3). A visitor walks toward light.
- The chrome line becomes a **door label** naming what lies through the door,
  sourced from the room `title` keys the contracts already carry and never render
  (the phase-2 "stored, not rendered" note ends): EN "Enter · Rastrelli Gallery" /
  RU «Войти · Галерея Растрелли»; at an entry stop facing back: EN "Back out ·
  Palace Square" / RU «Назад · Дворцовая площадь».
- Appearance law: the label is the door's answer to a push — it shows when settled
  at a rail end with an airlock AND (a push into the clamp in the door's direction
  OR a settle at the far end u=1). It never shows at an entry stop until a backward
  push. Click, arrows and wheel-through all pass through the same law.
- The sustained-wheel pass gets **feedback**: the camera leans toward the portal by
  a small fraction of a metre ∝ budget/EDGE_BUDGET_PX, springs back when the pass
  resets, and the lean continues seamlessly into the departure glide (§4). Thresholds stay declared constants; re-tune against a measured time-to-fire
  (target: a calm two-finger roll fires ≤ ~0.7 s; a flick never fires) [declared].
- The travel hint copy fixes its verb: EN "Scroll to walk · drag to look around" /
  RU «Прокрутите, чтобы идти · потяните, чтобы осмотреться» [declared; D1].
- Reduced motion: the lean is absent; the enter still fires.
- Keyboard stays silent chrome (nearly-absent). Touches: DEC-031 amended (copy,
  appearance law, feedback — an amendment, its minimap/sidebar rejection stands);
  the travel-hint inventory is owner-ruled → D1.

## 3. The gate composition (reply §2.2, adopted)

- S1 moves back so the gate pavilion composes as architecture; S1's gaze becomes an
  authored point inside the arch opening at about two-thirds of its height. Working
  range for the stop: z ≈ 118–125 [declared — framed by capture, not by number].
- A **resident throat**: procedural vault interior belonging to the square, from the
  facade plane inward, dark in its middle and lit at its far end by a warm slab —
  the corridor's lamp light promised through the arch (D2: warm vs cool). Few
  hundred triangles, vertex-shaded, no texture (no basis row, no boot-path cost);
  hidden the frame the gallery mounts (the gallery's true-coordinate passage
  replaces it at black). The throat is what «the arch opens» describes and the
  invitation itself.
- Early-mounting the real gallery passage outdoors is rejected for now (couples
  the room's lightmap-only exposure to the sky, sun/hemi leak, extra draws).
- Touches: the S1 golden re-baselines (deliberate re-composition, recorded); new
  square-resident geometry → owner disposition D2.

## 4. The pause is a threshold (reply §2.3, adopted with verified deltas)

Verdicts on the standing decisions: the §2.3 doorway choreography was RIGHT in
intent, wrong in one detail (the camera must KEEP MOVING through a light-fade; a
frozen fade still reads as loading); the §1.3 prefetch was RIGHT and overdue, its
rail-keyed trigger unnecessary; DEC-017's "never a spinner" is RIGHT and becomes THE
threshold rule for every transit (progress bars stay rejected).

The transit beat, in order:
1. **Departure glide** (~700 ms, STEP-glide easing; declared): the camera leaves the
   door stop along the rail's end tangent toward the portal centre for the last few
   metres (never reaching the plane) while the scene's light drains: ramp
   `renderer.toneMappingExposure` → 0 over the glide (indoors from
   INTERIOR_EXPOSURE, outdoors from E(h)). No overlay, no extra draw.
   **NEED CLOSED (orchestrator):** the renderer runs AgX tone mapping and the sky
   dome's shader includes `<tonemapping_fragment>`/`<colorspace_fragment>` with
   toneMapped true (src/sky/rig.ts; main.ts line ~182) — exposure drains every
   visible pass. The B-RT dev quad is toneMapped:false — dev-only, not in the
   product path.
2. **Blackout + title card**: at black, the caption region shows the destination's
   room title (the words clicked on the door label) with the entry-stop caption
   beneath, in the existing dwell slot. Minimum dwell ~250–400 ms [declared: the
   cinema cut-to-black; the hold constant is repurposed as the minimum]. If data is
   not ready the card holds — black with a room name is a title card, not a hang.
   No spinner/percentage ever; the ">2 s on device" clause stays a fix-not-hide
   item, attacked by prefetch.
3. **Swap at black**: applySwap / upload / compile / PMREM inside the black.
4. **Arrival glide** (~900 ms; declared): the camera starts a few metres back toward
   the destination portal (inside its doorway) and glides into the entry stop while
   exposure ramps to the room constant. The arrival frame is REACHED, not cut to;
   the title card fades on the first lit frame; the entry caption stays (the
   caption law's zero-change hand-over holds).
5. Reduced motion: cut to the black card → cut to the entry stop; the card's
   minimum dwell still applies. det: identical beats driven through the FSM deltaMs
   (hold phases become depart → card → arrive); goldens capture at stops, so pinned
   pixels do not move.
6. **Prefetch** (the pause's real fix): at every arrival-settle, fetch
   manifest + lazy chunk + GLB + KTX2 rows of every non-resident neighbour and
   transcode ahead (staggered, one row per idle frame — the 2-core stutter guard);
   per-session cache keyed by room id, never evicted in-session (≈ 10 MB RAM
   declared; the §8.3 ledger still registers only on load). The black card then owns
   only GPU upload + compile + PMREM. Never prefetch while the current chain is
   pending; also unserialise manifest ∧ chunk. Cold deep links keep today's shape:
   card first, then the arrival glide.
7. Beats: the doorway persists as depart ~700 + card ≥ ~300 + arrive ~900 [declared]
   — a warm-cache wait becomes ~2 s of continuous MOTION with a title. The landing
   airlock's 600 ms dead-end beat stays untouched until DEC-025 retargets it.
- Touches: DEC-017 rewritten («dark title card, every transit, min dwell, no
  spinner»), §2.3 recorded as implemented (exposure instead of overlay), §1.3
  recorded as implemented (simpler trigger), the hold constants re-declared. Owner
  dispositions D3 (title card) and D4 (prefetch bytes).

## 5. The corridor's light (reply §2.4, adopted)

- Art rule: **a museum's lamps are ON by day.** The three states differ by the
  daylight spill at the arch mouth and the east door, not by the lamps — the
  declared «differ little» intent; the shipped day bytes are the divergence.
- **Fast path first**: at the ENCODE, composite day = daylight bake + lamp bake × k
  (byte-deterministic re-encode from the surviving EXRs via tools/reencode.mjs; no
  re-bake); then re-tune per-state white points so the G1 mean luminance across
  states stays within ~1.5× of each other and the brightest state is ≤ ~⅓ of the
  stair mid-flight mean (the compression→release beat survives). Look gains lift
  the floor/pilaster reading without clipping the sconces. Guard: inspect the vault
  for banding at the new white points before accepting.
- **Slow path** only if the composite cannot bring the pilaster rhythm and the vault
  line to legibility at G1: re-bake with higher lamp power and daylight portals at
  the arch mouth + east door (logged, slow).
- G0's arrival black is fixed jointly by §8 (G0 gazes down the passage at the lit
  junction, not into the wall).
- Touches: the G1 day golden re-baselines (recorded). Owner disposition D5.
- Open authoring fact: what the east door shows when faced (whether a lit slab must
  be baked there for G2's new gaze) — closed by capture at implementation.

## 6. The stair arrival (reply §2.5, adopted + geometry)

- J0 moves OUT of the vestibule box to the hall at the foot of the first flight; the
  arrival glide carries the visitor from the doorway (the vestibule's north door,
  x 79.5..82.5) through into the hall so the doorway is passed, not stood in. The
  departure glide still ends inside portalFrom (the e2e portal-box observation
  holds); the portalTo box moves with J0 or the glide start derives from it.
- J0 gets an AUTHORED gaze: up the first flight toward the north window light over
  the mezzanine. With the real geometry (§1/§8), flight 1 climbs NORTH along the
  WEST wall from z −68.12 — a correct J0 sits near x ≈ 68, z ≈ −68.5, gazing north
  up the flight [declared — capture frames it].
- Touches: contract data + the gaze field (§8); the J0 golden re-baselines
  (re-composed). Covered by D6.

## 7. The corridor path fix (reply §2.6b for the gallery)

- A **junction stop** where the arch passage meets the gallery axis (near
  (1.5–2, 1.7, 73); gaze east down the gallery toward the east door's light) —
  four stops; the G0→G1 wall-pass disappears. The G0 gaze re-authors as «down the
  passage toward the lit junction»; G2 (the door) gets an authored subject (the
  door's light) replacing the look-back law there; G1 keeps the lock-on east.
- The end-phantoms adjudication does NOT reopen: these are stops with captions,
  not helpers.

## 8. The movement law — authored subjects, corner stops, feet on treads
(reply §2.6, adopted; the stop re-authoring is one pass, capture-framed)

Verdict: the rail stays; free roam stays rejected; the two defect laws are fixed
inside the promise.
- **Gaze law**: every stop may carry an authored SUBJECT (a world-space point);
  between stops the TARGET POINT interpolates in world space (smootherstep over the
  segment), not the angles. Consecutive stops sharing a subject lock on it — a dolly
  with a subject. The angle-blend default stays as fallback (nothing unauthored
  changes; the square's SQUARE_GAZE was the precedent, now generalised). «Last stop
  looks back» survives only where an authored subject does not replace it.
- **Corner stops**: the path turns only at stops. Corridor: the junction stop (§7).
  Stairs: a stop on the REAL mezzanine turn — near (67.5, 6.7, −81.7) between the
  flights [declared] — the switchback becomes two right-angle turns on the mezzanine
  land/edge, which centripetal CR rounds like a person turning.
- **Feet on treads**: every stair stop's y = the flight_datum/flank at its (x,z)
  + 1.7 (the build script's `flight_datum()` is the source of truth);
  flight-1 stops sit on the west band (x 66..67.6), flight-2 stops on the north
  band (z −84.4..−82.8); the landing survey stop sits on the slab (x ≥ 80).
- Sketch of the authored set (all within capture framing at implementation):
  J0 foot of flight 1 → subject: north window light over the mezz; J1 mid-flight-1
  (same subject, locked climb); J2 mezz turn → subject: flight 2's foot / window
  wall; J2b mid-flight-2 → subject: upper landing / ceiling; J3 upper flight or
  landing approach → subject: the ceiling painterly / landing light; J4 landing
  survey → subject: back across the well. Corridor: G0 → lit junction; Gj → east
  door's light (locked with G1); G2 → the door's light.
- Look limits: raise pitchUp where the subject is above (declared per stop).
  Speed laws untouched. Look limits re-clamp unchanged.
- Touches: the committed gaze law (owner D6), the Stop type gains an optional
  authored-gaze field (src/world/registry.ts — a type extension; DEC-013
  unaffected), stop counts (new stop ids + captions in both languages — the RU
  dictionary ceiling counts bytes), e2e stop-id walks extend; goldens by stop id
  keep bit-identical poses where the authored target equals the old implicit one
  (parameter shifts at stops keep poses exact), re-baseline only where
  re-composed (S1, G0, G1-day, J0 + any newly composed views).
- D8 (the reply's fork): scroll travel stays CONTINUOUS (not stop-stepped) — with
  authored subjects the between-frames stop being random; control is part of the visit.

## 9. Felt-experience acceptance criteria (the reviewer script; reply §4 verbatim)

- **Invitation:** a first-time visitor at S0 who reads the hint and scrolls arrives
  at the gate; the door label appears as the camera settles and names the room;
  clicking it enters. No frame shows the label while the camera moves or during a
  threshold. At any entry stop after arrival, the first settled frame shows the
  caption only; a backward push shows "Back out"; forward scroll walks in silently.
  A calm two-finger roll visibly leans the camera and enters within ~0.7 s; a hard
  flick leans and springs back, never entering. Reduced motion: no lean, enter
  still fires.
- **Approach:** the S1 day capture shows the gate as a whole (arch, flanking
  columns, entablature) with the arch reading as a receding vault with light at its
  far end; ≤ 15% of the frame below luminance 10/255 (today ~40%), the darkest band
  INSIDE the arch.
- **Threshold:** from click to the first lit frame on a warm cache, the camera is
  in motion except the black card; nothing frozen; no chrome besides the title
  card. The card shows the room title + entry caption; never a spinner/bar. A cold
  cache holds the card longer, title readable. Warm-cache card ≤ 0.5 s on the
  reference device; cold deep-link first frame not worse than recorded. Reduced
  motion: two cuts, title readable. det stop captures unchanged where the pose is
  unchanged. The hash updates at the first lit frame of the destination.
- **Corridor light:** at G1 day: pilaster rhythm and vault line readable; ≤ 60% of
  pixels below luminance 10/255 (today ≈ total); sconces remain the brightest
  thing; day/dusk/night G1 means within ~1.5×; night never brighter than day.
  Arrival at G0: a vault leading to a lit junction; «dark; the square behind» is
  true-dark, not black.
- **Stair arrival:** the first lit frame shows the first flight rising toward a lit
  window wall; no single wall > ~30% of the frame; the vestibule behind the camera.
- **Movement:** G0→G2 never passes through geometry; J0→J4: the default gaze never
  swings > ~90° in one glide; the window light stays in frame from J0 through the
  climb; the eye stays 1.7 ± 0.3 m over the tread/landing under it at every frame;
  the path turns only on the mezzanine/land corners. Free look still returns
  bit-identical poses when never dragged (golden fence).

## 10. Dispositions (RULING — owner, 2026-10-22: **all eight defaults accepted**)

- **D1 — Chrome copy:** door label «Enter/Back out · <room title>» replacing the
  DEC-031 prompt copy + the hint verb fix. RULED yes.
- **D2 — The throat's far light:** warm lamp glow. Rec: warm (foreshadows the
  corridor's lamps; light-is-the-feature). Default: warm.
- **D3 — The title card:** room title on the black threshold for human transits,
  min dwell ~300 ms. Rec: yes (the only indication that is also a museum object: a
  room label). Default: yes.
- **D4 — Prefetch:** neighbour fetch + staggered transcode at arrival-settle
  (bytes ahead of need; ≈ 10 MB RAM worst case). Rec: yes — the budget law calls
  >2 s a failure to fix; this is the fix. Default: yes.
- **D5 — Corridor day light:** (a) composite day/dusk at the encode + white points
  first; (b) re-bake with lamp power + daylight portals; (c) accept the cave.
  Rec: (a), escalate to (b) only if the pilaster rhythm stays unreadable. Default: (a).
- **D6 — Camera gaze law + stop sets:** authored per-stop subjects with world-space
  target interpolation; corridor junction stop; real mezzanine turn stop;
  feet-on-treads heights; J0 at the flight's foot; on-rails + free look kept, free
  roam still rejected. Rec: yes, as one authoring pass with captures. Default: yes.
- **D7 — S1 re-composition:** move back to frame the gate pavilion (its golden
  re-baselines). Rec: yes. Default: yes.
- **D8 — Wheel travel:** keep continuous scroll travel (vs stop-to-step). Rec:
  keep continuous. Default: keep.

## 11. How each touch re-baselines the gates

- Goldens: the deliberate re-compositions (S1, G0-arrival class, G1-day, J0 and any
  newly composed views) re-baseline once, recorded; everything else
  pixel-stable. The room goldens seeded by stop id stay bit-identical where the
  stop pose is unchanged (parameterisation at stops is id-exact).
- e2e: the r18 stop walk extends to the new stop ids; any test pinning ?cam=
  numbers or stop INDICES (not ids) audits list at implementation.
- Unit fences: the purity gate (rail/look/wheel-edge/edge-prompt stay pure); the
  new throat + beat machinery live on the host/three-free law modules it needs.
- Budgets: throat = a few hundred triangles (declared ≤ ~500), zero textures, zero
  custom slots; the beat/glides add no per-frame allocations; the RU chunk counts
  the two new/diffing captions + two title renders against its 12,000 ceiling.
- det/transit FSM: the beats drive through the FSM deltaMs; the reduced-motion cuts
  ride the existing cut law.

## 12. Implementation plan (split never widen; post-disposition)

- **R-UX1 — the threshold beat + prefetch** (world/airlock phases depart/card/arrive
  + exposure law + prefetch chain + DEC-017 rewrite; the pause becomes motion).
- **R-UX2 — the door label + hint copy + wheel-pass lean** (DEC-031 amendment; i18n
  keys; the lean law pure + host wiring).
- **R-UX3 — the throat + S1 re-composition** (procedural throat on the square,
  authored S1 gaze; golden re-baseline S1).
- **R-UX4 — the corridor light** (encode composite + white points/gains or the slow
  bake by D5; goldens G1; banding inspection).
- **R-UX5 — the stop authoring pass** (gaze field + authored subjects + corner
  stops + feet-on-treads + J0/vestibule; capture-framed; goldens + e2e updated).
- **R-UX6 — close-out** (DEVICE PASS: per-phase transit timing split logged via
  perfLog — the last open NEED; devlog; STATE/ROUNDS sync; the acceptance script of
  §9 executed headed on the reference device).
- Forbidden in all: the §8 weight law, the URL grammar, tier semantics, budgets
  (fixed by art/tier only), Blender-in-CI, the basis row.
