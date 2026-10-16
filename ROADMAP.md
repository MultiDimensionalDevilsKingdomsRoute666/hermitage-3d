# Roadmap

Phases are defined by exit criteria, not dates. A phase that stalls is **split, never widened**. Every phase ends at a deployed, publicly visitable URL — never an invisible foundation.

Lifetime cap: **≤ 7 rooms, ever** (charter — [docs/charter.md](docs/charter.md)).

## Principles

1. The room is the unit of planning, budgeting and shipping.
2. Procedural where the architecture repeats; handmade only where the camera gets close.
3. Light is the feature; UI is nearly absent.
4. The least machinery a senior reviewer would still respect.

## Reference device

One machine: **MacBook Pro 2017 — 2-core i5 2.3 GHz, 8 GB RAM, Iris Plus 640.** It is both the development box and the performance gate: if it holds a steady frame on T1 and never breaks the T0 floor, the palace holds everywhere. Discrete-GPU (T2) checks are opportunistic, on borrowed hardware. Lightmap bakes in Blender are the known slow spot on this machine — bake times are logged per room and bakes are constrained accordingly ([docs/architecture.md](docs/architecture.md)).

## Phases

### Phase 0 · Mass & Sky — **in progress — pure part landed; remaining: rig (dome shader), coordinator, devlog #0**

Pure modules complete and gate-green: solar (NOAA, four contract vectors at 1e-5°), exposure, frozen lightmap weights, appearance palette, URL/scrub/det parsing, arrival beats — 55 node tests, JS gzip budget enforced in CI (129 KB of 350 KB). Contract: [docs/design-sky-time.md](docs/design-sky-time.md).

- **Ships:** Palace Square with the palace as a true-scale white massing (an architect's card model) under the live Petersburg sky; title with the real time; hairline time control; shareable URL.
- **Builds underneath:** repo, CI/CD with PR previews (Cloudflare Pages), typed store + app state machine, sky/solar module with tests, URL state, perf-budget doc, initial ADRs.
- **Exit:** URL live · CI green · devlog #0.
- *Split rule: if it stalls, split 0a (repo/CI/sky module) from 0b (massing + time UI). Never widen.*

### Phase 1 · The Facade — **not started**

- **Ships:** the Palace Square facade fully articulated, hundreds of window surrounds catching low sun; the Alexander Column as a simple scale prop; the General Staff building as massing; walk or fly the square.
- **Builds underneath:** facade grammar + solver + kit of parts (~25 scripted pieces); instancing; shadows; quality tiers + boot microbenchmark; debug HUD; golden-frame tests; `/notes` page v1 with the facade spec viewer.
- **Exit:** budgets met on the reference device · grammar documented and tested.

### Phase 2 · The Staircase — **not started**

- **Ships:** enter through the arches, pass the dim compressed Rastrelli Gallery, ascend the Jordan Staircase while light changes with the hour.
- **Builds underneath:** Blender → glTF → KTX2 pipeline; baked lightmap states + runtime blend; interior kit; first airlock; camera rail; post stack; resource disposal ledger (asserted).
- **Exit:** room meets its contract ([docs/architecture.md](docs/architecture.md)) · disposal verified · devlog.

### Phase 3 · The Gallery — **v1** — **not started**

- **Ships:** the Military Gallery of 1812: 332 frames under skylights; room index; the full route (Square → portal → Rastrelli Gallery → Jordan Staircase → airlock → Gallery) works end to end.
- **Builds underneath:** instanced frames + portrait atlas; second airlock; golden frames for every room; README and architecture polish.
- **Exit: v1 announced** · all budgets green · license register complete.

### Phase 4 · Reach — **not started**

- **Ships:** works on a phone (T0); a keyboard-only tour; winter mode — snow on the cornices; the Neva facade (cheap: same kit).
- **Builds underneath:** mobile tier + touch rail; accessibility pass; snow-mask material; WebGPU evaluation ADR.
- **Exit:** Lighthouse accessibility ≥ 95 · mobile floor met on low-end hardware stats.

### Phases 5+ · v2 menu — one feature per phase

- [ ] **The Cut** — pull out of any room and the shell slices open like a dollhouse; interiors sit at true coordinates (a standing constraint since Phase 2), so this composes with Petersburg Time.
- [ ] **Pavilion Hall** — with the Peacock Clock as its single hero prop; first v2 phase once the pipeline is proven.
- [ ] **Malachite Room**
- [ ] **Rotunda** — as an airlock between wings
- [ ] **Neva embankment approach**

## Definition of Done — every phase

1. production URL updated;
2. budgets met on the reference device;
3. CI green, including budget checks;
4. ADRs for any new decisions;
5. one devlog entry with one hero frame;
6. license register and artistic-license register updated.
