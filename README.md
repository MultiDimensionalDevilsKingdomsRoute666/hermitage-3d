# Zimny — the Winter Palace in the browser

A stylized 3D recreation of the Winter Palace (the Hermitage, Saint Petersburg) for the web. You walk into a 215-metre Baroque facade and the palace is lit by the real Saint Petersburg sky at the moment the page opens — white nights in June, a six-hour day in December.

Status: **Phase 0 · Mass & Sky — not started.** Plan: [ROADMAP.md](ROADMAP.md). Every phase ends at a public URL.

## What this is

- **Scale** — a repetitive classical facade generated from a typed grammar and instanced, so the palace's defining quality costs almost nothing to download.
- **Light** — a sun/sky model driven by the real clock at 59.9°N; interiors lit by blended baked states, not by UI sliders.
- **Composition** — a "museum visitor" camera on rails with free look, so every frame is a composed frame and modelling is bounded by what the camera can see.
- **Engineering in the open** — budgets enforced by CI, ADRs, deterministic golden-frame tests, deep-linkable state, an in-app "how it's built" page.

Four principles every decision serves:

1. **The room is the unit of planning, budgeting and shipping.** Each phase ends with a room (or facade) a visitor can experience at a public URL.
2. **Procedural where the architecture repeats; handmade only where the camera gets close.**
3. **Light is the feature; UI is nearly absent.**
4. **The least machinery a senior reviewer would still respect.**

## Documentation

- [ROADMAP.md](ROADMAP.md) — phases, exit criteria, definition of done
- [docs/architecture.md](docs/architecture.md) — runtime, streaming, camera, lighting, budgets
- [docs/decisions.md](docs/decisions.md) — decisions with rejected alternatives, resolved owner inputs
- [docs/charter.md](docs/charter.md) — non-goals, risks, parking lot
- [docs/artistic-license.md](docs/artistic-license.md) — declared deviations from the real palace
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md) — every source, one line each
- [docs/briefs/ROUNDS.md](docs/briefs/ROUNDS.md) — design relay log

## Stack

vanilla three.js (WebGL2) · TypeScript strict · Vite · pnpm · Blender (scripted, headless) → glTF / Meshopt / KTX2 · Vitest · Playwright · Biome · GitHub Actions → Cloudflare Pages

## Working title

Petersburgers call it Зимний. Zimny is the codename; the public launch name may differ.
