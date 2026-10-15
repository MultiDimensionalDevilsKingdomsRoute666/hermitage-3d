# Charter — non-goals, risks, parking lot

Binding on every phase. A change to the charter requires an ADR.

## Explicit non-goals

- No free roam or collision
- No people, figures or character animation
- No VR/XR
- No audio in v1 (a subtle soundscape is a parking-lot item, never a phase requirement)
- No backend, accounts or CMS
- No survey-grade accuracy
- No photographic textures of the real interiors
- No mobile parity before Phase 4
- Never more than 7 rooms, lifetime

## Risk register

| # | Risk | Mitigation built into the phasing | Early-warning signal |
|---|---|---|---|
| 1 | **Asset workload explosion** — the 1 500-room palace swallows the project | Procedural exterior; one room per phase; camera-envelope rule; per-room budget contract in CI; two kits + ≤ 12-material library; v1 picks the two most repetitive interiors | A room's part list grows past its contract; a phase has no deployable midpoint |
| 2 | **Performance on weak hardware** | Budgets enforced in CI from Phase 0; instancing; baked light; streaming; tiers; reference device tested every phase; WebGL2 baseline | Frame time drifts on the 2017 MacBook; draw calls creep in the HUD |
| 3 | **Scope creep** — one more hall, free roam, VR, audio | Charter above; ≤ 7 rooms lifetime; one signature feature, never a second; `docs/parking-lot.md` for ideas | A PR that touches `src/engine/` while a room is unfinished |
| 4 | **Reference material & licensing** | Public-domain drawings and 1820s portraits; Commons photos for reference only; procedural and tileable textures; stylized by declaration; `ATTRIBUTIONS.md` | Any texture whose provenance cannot be written in one line |
| 5 | **Momentum loss** in a part-time, months-long project | Small phases that always end in something visible; devlog as public accountability; one-command dev + green CI so returning after a gap is cheap; ADRs and types as externalised memory; every "boring" infrastructure item paired with a visible payoff in the same phase | A long stretch with no deploy; dread when opening the repo |
| 6 | **Slow machine for heavy steps** (bakes, CI goldens) — 2017 MacBook, 8 GB | Bakes capped (≤ 3 states/room, ≤ 2 K, denoised) and cached; Blender out of CI; golden frames may run locally; borrowed hardware is a menu item, not a dependency | A bake exceeding its logged time budget; CI goldens proving flaky |
| 7 | **Audience reachability** — regional ISP blocks (confirmed 2026-10-15: Rostelecom intercepts `*.pages.dev` TLS; site opens only via VPN) | Custom domain on the same Pages project — SNI differs, block does not apply; decide and attach **before the v1 announcement** (Phase 3) | The site unreachable from a mainstream connection without a VPN |

Secondary (tracked, not top): three.js churn — pinned per phase, bumped deliberately; browser fragmentation — WebGL2 baseline, feature-detected tiers; mobile parity — explicitly Phase 4.

## Parking lot

See [parking-lot.md](parking-lot.md). Anything not in the current phase belongs there, with a "why parked" line.
