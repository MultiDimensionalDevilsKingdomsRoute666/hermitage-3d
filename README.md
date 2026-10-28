# Winter Palace in the browser

A stylized 3D recreation of the Winter Palace, Saint Petersburg, for the web. You walk into a 215-metre Baroque facade and the palace is lit by the real Saint Petersburg sky at the moment the page opens - white nights in June, a six-hour day in December.

Status: **v1 · Phase 3 · The Gallery — shipped 2026-10-27** (Phase 0 · Mass & Sky, Phase 1 · The Facade, Phase 2 · The Staircase and Phase 2b · Night Windows shipped before it). Plan: [ROADMAP.md](ROADMAP.md). Every phase ends at a public URL.

**v1.** Зимний дворец: первый полный маршрут — Дворцовая площадь → галерея Растрелли → Иорданская лестница → Военная галерея 1812 года. | Winter Palace v1: the first complete route — Palace Square → the Rastrelli Gallery → the Jordan Staircase → the Military Gallery of 1812.

### Зимний дворец · v1

Большинство реконструкций выбирают один выгодный час и останавливают его. Эта — не выбирает: она берёт тот час, в который вы пришли. Это не игра и не «виртуальный тур» — один маршрут по четырём пространствам Зимнего дворца, собранный так, чтобы главным в нём был свет, настоящий свет Петербурга.

Сцена живёт по петербургскому времени. Солнце в ней стоит там, где оно стоит сейчас на 59,9° северной широты: в июне — белые ночи, когда небо так и не гаснет и окна дворца остаются тёмными под светлым небом; в декабре — день в шесть часов, солнце в полдень не поднимается и на семь градусов, а в долгой тьме окна зажигаются сами. Внутри каждый зал запечён в трёх состояниях света — день, сумерки, ночь с люстрами, — и высота солнца решает, в какой пропорции они смешаны. Одни часы ведут и фасад, и интерьеры: снаружи и внутри всегда один и тот же час.

Маршрут — одна линия, без свободного блуждания. Он начинается на Дворцовой площади — с фасада и часа, — проходит галерею Растрелли, поднимается по Иорданской лестнице и через портал, шлюз между улицей и дворцом, входит в Военную галерею 1812 года. Восемнадцать остановок, у каждой своя подпись. Последняя: двери закрыты; за ними — Георгиевский зал. Здесь v1 и заканчивается.

Проект держали четыре правила. Зал — единица работы. Процедурное — там, где архитектура повторяется; ручное — только там, куда камера подходит близко. Свет — это и есть содержание, интерфейс почти отсутствует. Механики ровно столько, сколько уважил бы строгий рецензент. И всё сделано открыто: реестр из шестнадцати допущенных вольностей и семнадцати источников, шесть дневников разработки — от «Массы и неба» до «Галереи · v1», — и страница /notes прямо в приложении: как это устроено. Без бэкенда — статический сайт, который просто открывается в браузере.

[hermitage-3d.pages.dev](https://hermitage-3d.pages.dev). Приходите в разное время суток и в разное время года — дворец будет другим. Зима — снег на карнизах — выбирается в часах рядом с датой, а зимний полдень открывается сразу: [ссылка в январь](https://hermitage-3d.pages.dev/#/?at=2026-01-15T10:00:00Z).

### Winter Palace · v1

Most reconstructions pick one flattering hour and freeze it. This one does not choose: it takes the hour you arrive in. It is not a game and not a "virtual tour" — one route through four spaces of the Winter Palace, built so that the main thing in it is light, the real light of Saint Petersburg.

The scene runs on Petersburg time. Its sun stands where the sun stands right now at 59.9° north: in June, the white nights, when the sky never quite goes out and the palace windows stay dark under a still-luminous sky; in December, a six-hour day, a noon sun that does not clear seven degrees, and a long dark in which the windows light themselves. Inside, every room is baked in three states of light — day, dusk, night with the chandeliers lit — and the height of the sun decides the proportion in which they are mixed. One clock drives the facade and the interiors alike: outside and inside, it is always the same hour.

The route is a single line; there is no free roaming. It begins on Palace Square — with the facade and the hour — passes through the Rastrelli Gallery, climbs the Jordan Staircase and, through the portal, an airlock between the street and the palace, enters the Military Gallery of 1812. Eighteen stops, each with its own caption. The last: the doors are closed; beyond them, St George's Hall. That is where v1 ends.

Four rules held the project. The room is the unit of work. Procedural where the architecture repeats; handmade only where the camera gets close. Light is the feature, and the UI is nearly absent. Exactly as much machinery as a strict reviewer would respect. And all of it in the open: a register of sixteen artistic licenses and seventeen attributions, six devlogs — from "Mass & Sky" to "The Gallery · v1" — and a /notes page inside the app: how it is built. No backend — a static site that simply opens in a browser.

[hermitage-3d.pages.dev](https://hermitage-3d.pages.dev). Come at different hours and in different seasons — the palace will be different. Winter — snow on the cornices — is one click away in the clock beside the date, and a winter noon opens directly: [a link into January](https://hermitage-3d.pages.dev/#/?at=2026-01-15T10:00:00Z).

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
