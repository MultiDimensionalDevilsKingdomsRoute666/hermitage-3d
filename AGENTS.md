# AGENTS.md

**Zimny** — a stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg) for the web. Every phase ends at a public URL. Work is done by AI agents under the owner's direction: write for agents — checklists over vibes, tests over "should work".

Read order before touching anything: `README.md` → `ROADMAP.md` → `docs/charter.md` → `docs/decisions.md` → `docs/architecture.md`.

## Operating rules

1. **The room is the unit.** Plan, budget and ship per room; a phase ends only when its URL is live.
2. **Phases split, never widen.** Lifetime cap: ≤ 7 rooms. Charter non-goals are binding; changing them requires an ADR.
3. **Budgets are CI-enforced contracts.** A failing budget is fixed by changing art or tier — never by quietly loosening the number.
4. **Assets are code.** Every committed binary in `public/assets/` must regenerate from a committed script in `tools/`. Never hand-edit built artifacts.
5. **Relay briefs.** `docs/briefs/` holds only open briefs; delete after integration and log the round in `docs/briefs/ROUNDS.md`.
6. **Licensing.** No photography of real interiors as textures; every source cited in `ATTRIBUTIONS.md`; every artistic deviation recorded in `docs/artistic-license.md` in the phase it appears.
7. **Git hygiene.** Stage only files you authored; never commit `.DS_Store`, build junk or `probes/` scratch.
8. **Core stays core.** Adding a room never touches `src/engine/` or `src/world/`; if it feels like it must, stop and raise the question instead of hacking through.
