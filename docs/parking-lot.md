# Parking lot

Ideas parked on purpose. Each carries a "why parked" line.

- **The Cut (dollhouse section)** — first v2 feature; parked until ≥ 2 interiors exist. The enabling constraint (true-coordinate room placement) is active since the room contract.
- **Rastrelli's Line (ink drawing ⇄ building transition)** — may become an intro flourish if a phase finishes under budget; parked because it risks reading as a shader demo.
- **Subtle soundscape** — never a phase requirement; revisit only after Phase 4.
- **Winter snow** — actually scheduled (Phase 4); listed here only to record that a *full seasonal system* beyond that is out of scope without an ADR.
- **Runtime tier watchdog** — downgrade tiers automatically when sustained fps breaks the floor; parked until golden frames exist (ADR-0011): a watchdog multiplies boot compositions the tests must reproduce, before there is device evidence it is needed.
- **Sharpness by default via probe calibration** — the reference device holds the 4 MP surface idle while graded T1 (ADR-0015's resolved-KEEP disposition); a probe redesign (or a T1.5 tier) could give retina-class devices dpr-2 sharpness without the T1 raise; parked until a measured probe-redesign proposal exists.
- **§4.6 stageUnit's abort seam** (R-UX1 slice 2, the specialist's challenge): the prefetch units
  are not abortable — the pinned `stageUnit(unit, manifest)` signature has no `AbortSignal`, and a
  visitor who walks through a door mid-stage leaves one unit's fetch running against the 2-core
  budget. The host's only lever today is to stop calling `planPrefetch` (in-flight units finish).
  Menu: a fourth `signal?: AbortSignal` parameter, or an internal per-room AbortController exposed
  via `cancelStaging(roomId)`. Worth wiring before or during R-UX6's device pass.
- **Momentum-tail accumulation vs the quiet gap** (R-UX2, the specialist's challenge): a decaying
  momentum tail of sub-`EDGE_MAX_EVENT_PX` events at ~16 ms cadence can still accumulate the full
  budget inside the sustain window — `EDGE_QUIET_MS` does not address this; a tail that looks like
  a deliberate press can fire. The §2 «re-tune against a measured time-to-fire» item stands;
  re-tune (or add a per-event count gate) with the R-UX6 device-pass numbers.
- **The door label's em-dash convention** (R-UX2): `roomName()` reads the name as the title's head
  before « — »; a future room title without an em dash would put the whole sentence on the door
  (the test pins the convention, not the data). If sentence titles are retired or reworded, move
  the name into its own dictionary key.
- **The RU travel-hint's nowrap at 360 px** (R-UX2): «Прокрутите, чтобы идти · потяните, чтобы
  осмотреться» is ~2.5× the old copy under `white-space: nowrap` at `--hint-size`; the hint's CSS
  was untouched this round. If the new RU copy clips at 360, allow a two-line wrap (or
  `text-wrap: balance`) for it — the R007 mobile corner law holds either way.
- **The full v1 announcement prose (R6)** — LANDED in R8 (the README prose, RU first + EN); this item retires.
- **The rooms' finishing pass (the gallery + the staircase)** — a design round (CREATIVE): how the two middle rooms get enriched toward «finished» — content, detail, light — then the implementation rounds. Owner's steer 2026-10-27: SEPARATE from the vision round; rides after the Phase-4 queue (the mobile tier / a11y / the Neva facade / the WebGPU ADR). Why parked: the current state is the accepted v1 bar (the license register's declared omissions); the round needs the owner's specifics (what reads unfinished — bare walls / missing statuary and handrails / the light) and a phase slot; the budgets hold headroom (rastrelli 239 K of 2 M, jordan 1.17 M of 7 M payload), so a content pass fits without new caps.
- **The vision round (the conspectus + the new phases)** — when the current plan runs out (Phase 4 + the v2 menu): the orchestrator composes the full project conspectus (the ROUNDS history + STATE + the registers + the engineering laws → a ~2-page «what was built») and a CREATIVE relay proposes the project's next phases/directions from it, zero-steering. Why parked: the plan's end is the v2 menu's emptying; a vision before that would speculate past the committed direction (the owner's steer, 2026-10-27). Note: the charter's ≤ 7 rooms cap means the v2 menu's three room items exhaust the room budget — the vision round is where «what after» gets decided (more rooms need a charter ADR; non-room directions do not).

Adding an item requires a "why parked" line; promoting one requires a phase slot and charter compatibility.
