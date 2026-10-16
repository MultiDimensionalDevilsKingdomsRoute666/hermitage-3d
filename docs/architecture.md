# Architecture

## Runtime overview

```
URL #/jordan?at=2026-06-21T23:30&cam=3&q=1
        │
        ▼
AppState (FSM: boot → arriving → exploring → transit → idle)
        │
        ▼                ▼                  ▼
RoomRegistry        Clock & Sky        CameraRig
load / unload       solar position     rail + free look
prefetch            sky env (PMREM)    stops & framings
disposal ledger     exposure           reduced-motion → cuts
                    lightmap weights   input: pointer / touch / keys
        │                │                  │
        └──────────────► three.js Scene ◄────┘
                         │
                 Renderer + Post (quality tier)
                         │
     DOM overlay: wordmark · index · time line · hints · /notes · debug HUD
```

## Key properties

- **The URL is the state.** Room, time, camera stop and quality tier round-trip through the hash. "Share this view" is copying the address bar; reviewers can deep-link an exact frame.
- **Rooms are lazy chunks.** A room = a module (rail, metadata, lighting blend) + an asset bundle (glTF, KTX2, lightmap states). Entering an airlock prefetches the neighbour; leaving disposes the previous room through a **resource ledger**, asserted empty in dev and in tests. Adding a room never touches the core.
- **Deterministic mode** (`?det=1`): fixed clock, fixed seeds, no temporal effects — the basis of golden-frame tests.
- **No spinner.** The sky is procedural and renders instantly; the title and the real time appear on the sky; the palace arrives into it.

## Room contract (data, not code)

| Field | Meaning | Who checks it |
|---|---|---|
| `id`, `title`, caption per stop | Doubles as the accessible description | a11y tests |
| `bounds` at true coordinates in the shell | Enables The Cut later; keeps scale honest | unit test vs. footprint |
| `assets` manifest | glTF + KTX2 + lightmap states, content-hashed | budget script in CI |
| `rail` spline, stops, look limits | Defines the camera envelope and therefore the modelling scope | golden frames |
| `lighting.states` + blend function | 2–3 baked states, weights from the sky clock | unit test (weights sum to 1, monotone) |
| `neighbors` with airlock portals | The streaming graph | smoke test walks the whole graph |
| `budget` | Triangles, draw calls, bytes, texture memory | CI fails the PR |

## Camera: the museum visitor

A spline rail with composed stops; scroll, drag or arrow keys move along it; pointer/touch gives ±35° of free look; `prefers-reduced-motion` turns glides into cuts. Eye height 1.7 m. Every frame is composed, the asset envelope is bounded, and it works on trackpads, phones and keyboards. *(Rejected: free FPS roam — collision, full surface coverage, uncomposed frames.)*

## Lighting model

- **Exterior:** analytic sun/sky from real date, time and the palace latitude — the binding contract is [design-sky-time.md](design-sky-time.md): a hand-written analytic dome under the frozen blend rules. **Phase 0 runs without PMREM and without shadow maps** (DEC-010); a fitted directional shadow and baked AO return with the facade kit (Phase 1); PMREM returns with interiors by ADR.
- **Interior:** lightmap states blended by clock weights; emissive chandeliers + restrained bloom; one cube probe per room.
- **Colour:** linear workflow, AgX tone mapping, exposure driven by sky luminance — dusk is dim and white night is luminous, not "night = blue filter".
- Lightmap blending (custom material vs. per-room pre-blend) is **decided by measurement in Phase 2**; both options are bounded by the ≤ 3 custom materials rule. The weight function itself is frozen now — day/dusk/night-chandeliers with a dusk plateau −7…−4°, white-night minima wholly dusk ([design-sky-time.md](design-sky-time.md) §8).

## Asset pipeline: assets as code

No manual modelling exists in this project — every asset is produced by committed scripts:

- `tools/` holds **bpy (Blender Python) scripts** that generate each kit part and room shell, plus `gltf-transform` optimisation steps. A single command regenerates a part deterministically.
- Lightmaps are baked with Cycles **locally** (headless): ≤ 3 states per room, ≤ 2 K, denoised; bake times logged per room — the reference machine makes bakes the known slow spot, so bake-once-and-cache is the norm. If a bake genuinely outgrows the machine, that is a menu item for borrowed hardware, never a blocking dependency.
- Built outputs (glTF/Meshopt, KTX2 textures) are committed under `public/assets/`, small by design and guarded by budgets. **Blender never runs in CI** — CI validates the committed artifacts.

## Quality tiers & performance budget

Tiers: **T0** (low: DPR 1, no bloom, 1 K shadow, near-LOD instancing) · **T1** (default) · **T2** (discrete GPU: DPR ≤ 2, full post, 2 K+ shadow). Auto-selected at boot from a ~1 s GPU microbenchmark plus heuristics; overridable via `?q=`, persisted.

| Metric | Budget | Enforced by |
|---|---|---|
| First frame, exterior, T1, ~10 Mbps | ≤ 3 s | CI timing test |
| Initial JS | ≤ 350 KB gzip | size-limit |
| Exterior payload | ≤ 4 MB | asset budget script |
| Per-room payload | ≤ 8 MB | asset budget script |
| Draw calls, any frame | ≤ 250 | HUD + Playwright assertion |
| Triangles in frustum (T1) | ≤ 1.0 M | same |
| GPU texture memory | ≤ 256 MB | resource ledger |
| Frame time (T1) | 16.7 ms @ 1080p where achievable on the reference device | device itself, every phase |
| Frame time (T0) | ≤ 33 ms — the floor that must never break | same |
| Long tasks after load | none > 50 ms | Playwright trace |
| Accessibility | Lighthouse ≥ 95 · full keyboard · reduced-motion honoured | CI |

**Reference device:** MacBook Pro 2017 (2-core i5, 8 GB, Iris Plus 640) — the only machine. T1 is the goal on it; T0 is the hard floor. Budget numbers are hypotheses until Phase 1 measures them; reneging on a budget requires an ADR, not a quiet change.

**Unproven (flagged honestly):** golden-frame tests run in CI on software GL. If they prove flaky there, goldens run locally on the reference Mac and CI keeps smoke + timing. Prove in Phase 0/1.

## Delivery & security

Hashed asset URLs with immutable caching · strict CSP, no inline scripts · no third-party scripts; the debug HUD is client-only · no COOP/COEP needed (no SharedArrayBuffer).

## Repository layout

```
├─ src/
│  ├─ app/        bootstrap, state machine, URL state
│  ├─ engine/     renderer, loop, tiers, resize, resource ledger
│  ├─ world/      shell, room registry, airlocks, streaming
│  ├─ procedural/ facade grammar: spec types, solver, instancing builder
│  ├─ sky/        solar position, sky model, exposure, lightmap weights
│  ├─ camera/     rail, stops, input, reduced motion
│  ├─ materials/  library + the ≤ 3 custom materials
│  ├─ post/       effect stack per tier
│  ├─ ui/         DOM overlay, /notes page, debug HUD
│  ├─ assets/     manifests, loaders, prefetch policy
│  └─ content/    facade specs, room metadata, captions
├─ rooms/         one folder per room: module + asset manifest
├─ tools/         asset pipeline (bpy scripts, gltf-transform), budget checks
├─ public/assets/ built glTF / KTX2 (committed, budget-checked)
├─ tests/         unit (Vitest) · e2e + golden frames (Playwright)
└─ docs/          architecture · decisions · charter · artistic-license · briefs/
```

## CI on every PR

typecheck → Biome → Vitest → build → size-limit → asset budget script → Playwright smoke (+ golden frames, deterministic mode — see the caveat above) → preview deploy on Cloudflare Pages. `main` deploys production.
