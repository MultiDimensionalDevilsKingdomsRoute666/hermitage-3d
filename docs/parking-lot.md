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

Adding an item requires a "why parked" line; promoting one requires a phase slot and charter compatibility.
