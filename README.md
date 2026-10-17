# Winter Palace in the browser

A stylized 3D recreation of the Winter Palace (the Hermitage, Saint Petersburg) for the web. You walk into a 215-metre Baroque facade and the palace is lit by the real Saint Petersburg sky at the moment the page opens - white nights in June, a six-hour day in December.

Status: **Phase 1 · The Facade - shipped** (Phase 0 · Mass & Sky shipped; Phase 2 · The Staircase is next). Plan: [ROADMAP.md](ROADMAP.md). Every phase ends at a public URL.

## What this is

- **Scale** - a repetitive classical facade generated from a typed grammar and instanced, so the palace's defining quality costs almost nothing to download.
- **Light** - a sun/sky model driven by the real clock at 59.9°N; interiors lit by blended baked states, not by UI sliders.
- **Composition** - a "museum visitor" camera on rails with free look, so every frame is a composed frame and modelling is bounded by what the camera can see.
- **Engineering in the open** - budgets enforced by CI, ADRs, deterministic golden-frame tests, deep-linkable state, an in-app "how it's built" page ([/notes](https://hermitage-3d.pages.dev/notes) - the facade spec viewer).

Four principles every decision serves:

1. **The room is the unit of planning, budgeting and shipping.** Each phase ends with a room (or facade) a visitor can experience at a public URL.
2. **Procedural where the architecture repeats; handmade only where the camera gets close.**
3. **Light is the feature; UI is nearly absent.**
4. **The least machinery a senior reviewer would still respect.**

## Development

- `pnpm validate` - typecheck, Biome lint, Vitest unit tests, production build and the gzip bundle budget. This is exactly what the CI `checks` job runs.
- `pnpm exec playwright install chromium` - once per machine; downloads the browser the e2e tests drive. On macOS 13 hosts the download needs an override, because recent Chrome-for-Testing builds no longer declare a macOS 13 slot (the binary itself runs on macOS 12+): `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 pnpm exec playwright install chromium`.
- `pnpm e2e` - Playwright end-to-end tests against a fresh production build served by `vite preview` on 127.0.0.1:4173. Two projects:
  - `chromium` - smoke: deterministic T1/T0 boots, HUD budget assertions from the `#hud` data-* contract (draw calls ≤ 250, triangles ≤ 1.0 M), clean console. CI runs only this project, on software GL.
  - `golden` - pixel goldens of the `#scene` canvas in deterministic mode (noon, white night). Baselines are rendered on the dev machine's GPU, are platform-specific and are committed under `tests/e2e/golden.spec.ts-snapshots/`; CI never runs them. Refresh after an intentional visual change with `pnpm e2e --project=golden --update-snapshots`.

## Documentation

- [ROADMAP.md](ROADMAP.md) - phases, exit criteria, definition of done
- [docs/architecture.md](docs/architecture.md) - runtime, streaming, camera, lighting, budgets
- [docs/decisions.md](docs/decisions.md) - decisions with rejected alternatives, resolved owner inputs
- [docs/charter.md](docs/charter.md) - non-goals, risks, parking lot
- [docs/artistic-license.md](docs/artistic-license.md) - declared deviations from the real palace
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md) - every source, one line each
- [docs/briefs/ROUNDS.md](docs/briefs/ROUNDS.md) - design relay log

## Stack

vanilla three.js (WebGL2) · TypeScript strict · Vite · pnpm · Blender (scripted, headless) → glTF / Meshopt / KTX2 · Vitest · Playwright · Biome · GitHub Actions → Cloudflare Pages
