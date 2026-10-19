# Round 22 fragment — the specialist's delivered material (verbatim, for the continuation)

The transport cut the reply mid-table (§4.C, the «Declared —» row). Reproduced verbatim below;
the continuation brief points the specialist here.

# Design — the Russian voice, the type, the /notes face (Round 22)

Status: design for the owner's disposition; code rounds 23–26 implement. Scope: the language model,
the typography, the /notes redesign, the complete RU copy. No code in this round. Static digits in the
supplement arrived intact (210 m, 7 + 20 + 8 + 20 + 7, 2026-10-17, 12 boxes, ф. 485, 1969) — nothing masked.

## 0. Decisions at a glance

- Russian is the default and canonical language; English stays one click away. `lang=ru|en` joins the
  hash-query grammar: URL wins → persisted override → RU. `navigator.language` seeds nothing.
- One toggle, two letters: the chrome shows «EN» inside the Russian UI and «RU» inside the English one —
  the name of the language you would switch to, in its own script.
- One superfamily: IBM Plex Sans 400/500 everywhere, IBM Plex Serif 400 for the wordmark and the /notes
  titles. Three self-hosted woff2 subsets (latin + cyrillic), ≈ 150–180 KB total, OFL.
- /notes becomes a ledger: one column, hairline rows, tabular numerals, three tinted provenance chips,
  no cards, no boxes, no zebra. Nothing load-bearing is cut; duplicates are merged.
- Russian strings are built noun-first («деталей: N»), so no plural engine; «ё» is written; «» and the
  spaced — throughout; decimal comma in RU numbers; thin-space thousands stay in both languages.
- Captions and data strings become bilingual records `{ ru, en }` validated at import — the fail-loud law.

## 1. Language model

### 1.1 Default and precedence
- Default RU. Rejected: EN default (the owner's report, the subject and the sources are Russian; a
  non-Russian visitor sees «EN» in the chrome at first glance). The portfolio concern is solved in the
  URL: links the owner sends abroad carry `?lang=en`; the default is one constant and the model is symmetric.
- Precedence: `lang` in the hash-query → the persisted override → `ru`. Invalid values are ignored
  (URL input is not committed data; no throw). The persisted key follows the `?q=` lifecycle verbatim
  (URL wins, written to the override, auto-cleared on the same rule) — the orchestrator aligns the helper.
- Rejected: seeding from `navigator.language`. It is hidden state (the URL would not reproduce the view),
  it doubles the test matrix, and the owner opening the site in an English-locale browser would conclude
  the change never landed.
- Determinism: under `?det` (and the golden scenes) the persisted override is ignored; `?lang=` is still
  honored; otherwise RU. The overlays are hidden there anyway, so pixels cannot move.
- The e2e rule: every e2e navigation appends `lang=ru` or `lang=en` explicitly — no spec relies on the
  default or on storage — and reads the expected caption from the committed data's column of that
  language. One dedicated spec covers the toggle (§6, Round 23 gate).

### 1.2 The toggle
- A text button, last item of the chrome row that holds the notes link on the main page; on /notes, the
  right end of the header row opposite «← Дворцовая площадь». Visible text «EN» / «RU»; accessible name
  «English» / «Русский»; `lang` attribute set to the target language so screen readers pronounce it.
- Click: writes `lang=` into the hash-query (replaceState, no history entry), persists it, flips
  `<html lang>`, `<title>`, the meta description, every overlay string, the live region's future
  announcements and, on /notes, re-renders the page from the view-model (stateless, cheap). Focus stays
  on the button; its new name is announced — no extra live-region message (rejected as noise).
- Rejected: flags (languages are not countries); a `<select>` (heavy for two values); a segmented
  «Русский | English» (crowds the chrome at 360 px).

### 1.3 Where the strings live
- `src/i18n/strings.ts`: `const STRINGS: Record<Lang, Record<Key, string>>` — the type system forces an
  identical key set in both languages; a node test asserts non-empty values, no Cyrillic in EN (allowlist:
  РГИА, НЭБ, ф.), no Latin prose in RU (code identifiers and paths allowed), and the RU typographic lint
  (no `"`, no ` - ` as a dash, no `...`).
- Stop captions: `caption: { ru, en }` in `src/camera/square-rail.ts` and `rooms/*/contract.ts`; a
  validator at module load throws on a missing or blank language — static content, not runtime
  degradation. The announcement template `<stop id> · <caption>` stays code; stop ids are identifiers.
- Data strings rendered as text (section kinds, arrangement tokens, capital family, wall colour note,
  facade characters): tokens stay tokens in data and tests; the view-model maps them to display labels per
  language (`data-kind="cornerRisalit"` keeps the token in the DOM for tests). Prose notes in data become
  `{ ru, en }` under the same validator. Rejected: showing raw camelCase to a reader.
- The view-model signature grows a `lang` argument and emits localized blocks; node tests snapshot both
  languages. The HUD (`?hud=1`) stays English — a developer tool with no audience to serve (confirmed).

### 1.4 Runtime-formatted text
- The clock line stays `HH:MM` + ISO date in both languages: it is a readout, not a sentence, and it keeps
  the same width on toggle. Rejected: a genitive-month date («19 октября 2026») — warmer, but a twelve-word
  table and a wider line for a readout.
- The scrub `aria-valuetext` template `<date> <time> (UTC+03:00)` stays code, numbers only.
- `formatNumber(n, lang)`: thin-space thousands in both; decimal «,» in RU, «.» in EN; a no-break space
  between number and unit («210 м», «3,47 м», «N байт»).
- Plurals: every RU string with a runtime count puts the counted noun first in the genitive plural —
  «активных деталей: N», «вызовов отрисовки за кадр ≤ N» — grammatical for any N. Rejected: an ICU/plural
  helper (three forms per noun, more code in a pure module).
- The `N` key shortcut: the handler must compare `event.code === 'KeyN'`, not `event.key`, or the Russian
  layout (physical N → «т») silently breaks the help text's promise.

### 1.5 Static HTML, `<html lang>`, titles
- `index.html` and `notes.html` carry the RU strings statically with `lang="ru"`; the runtime overwrites
  for EN. Rejected: EN static + RU runtime (a flash of the wrong language for the default audience); two
  HTML trees per language (the URL-grammar law wants a parameter, not a tree).
- Crawlers therefore index RU; EN is runtime-only. Acceptable for a portfolio; prerender later if needed.

### 1.6 Russian typographic conventions (authoring-time, not a runtime typograf)
«» quotes (nested „“); spaced em dash with a no-break space before it; en dash for ranges; «ё» always;
sentence-case headings; key names (PageUp, Escape, N) and code identifiers in Latin; paths untranslated;
ISO dates in both languages; «±24» unspaced, «≤ N» spaced; proper names: «Зимний дворец», «Дворцовая площадь».

## 2. Typography

### 2.1 Faces, files, fallbacks
- IBM Plex Sans 400 and 500; IBM Plex Serif 400. Cyrillic is native to the family (since v2), the Latin and
  Cyrillic share one voice, and Plex reads as a deliberate engineering choice rather than a default.
  Rejected: Inter (the new system-ui); Golos/Onest (Cyrillic-first but anonymous in Latin); Geist (Cyrillic
  coverage of the shipped release unverified — not a gamble for the first gate); a Didone display face
  (Oranienbaum/Prata — on-theme, but it pulls the site toward a museum brochure; the sky scene supplies
  the romance). If the owner wants the quieter version, drop the serif file; nothing else changes.
- Files under `public/fonts/`: `plex-sans-400.woff2`, `plex-sans-500.woff2`, `plex-serif-400.woff2`;
  subset = Basic Latin + Latin-1 punctuation + full basic Cyrillic (U+0400–045F, incl. Ё/ё) + U+00A0 00AB
  00B1 00B7 00BB 00D7 2009 2013 2014 2019 201C–201E 2026 202F 2116 2190 2192 2212 2264 2265 03A3; layout
  features kept: `kern, liga, locl, tnum, pnum, ccmp, mark, mkmk`. Expected ≈ 50–60 KB each.
- Reproducible build: `scripts/fonts/subset.mjs` (dev dependency `subset-font` or `pyftsubset`; the source
  release tag pinned; outputs committed). If the OFL carries a Reserved Font Name, the subsets' internal
  names become «WP Sans» / «WP Serif»; the CSS families are project-local regardless. `OFL.txt` ships beside
  the files; two lines in `ATTRIBUTIONS.md` («No line, no use» applies to fonts).
- Loading: `@font-face` with `font-display: swap`, `<link rel="preload" as="font" crossorigin>` for the
  three files on both pages; metric-override fallbacks (`size-adjust`, `ascent-override`) on Arial/Georgia
  so the swap shifts nothing visible. The exterior payload row moves from 0 to ≈ 170 KB of 4 MB.
- Stacks (every fallback carries Cyrillic): sans `"WP Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial,
  sans-serif`; serif `"WP Serif", Georgia, "Times New Roman", serif`; mono (no file) `ui-monospace,
  "SF Mono", Menlo, Consolas, "Liberation Mono", monospace` for code identifiers and formula strings.
- Coverage gate: a node test computes the code-point set of every string in both dictionaries, every caption
  and every data label, and asserts the three files' cmaps cover it (space characters excepted) — no tofu
  for «», —, ±, ≤, Σ.

### 2.2 Where each applies
- Main page overlay: wordmark serif 400, 26/30 (22/26 under 480 px), tracking −0.01em; clock sans 400 15
  with `tnum`; notes link and toggle sans 500 14, tracking +0.02em, underline on hover/focus. Sizes and
  colours of the overlay otherwise unchanged.
- /notes: H1 serif 400 40/44 (30/34 mobile); H2 serif 400 26/32 (22/28); body sans 400 17/26, measure
  68ch; ledger and tables sans 400 15/22 with `tnum`; captions and table heads sans 500 13/16 uppercase
  +0.06em muted; chips sans 500 12/16 lowercase; `hyphens: auto` on prose only (never in tables or labels).

## 3. The /notes redesign

### 3.1 Layout and hierarchy
- One column, 880 px container, prose at 68ch, page padding 24 px (48 px from 768 px), an 8 px rhythm:
  72 px between sections, 20 px after an H2, 10 px ledger-row padding, 8×12 px table cells. No sidebar,
  no sticky elements. Rejected: a two-column layout with a sticky TOC (reads as documentation software).
- Header: back link left, toggle right. H1, then the intro paragraph, then the three-kind list rendered as
  the chip legend (each item opens with its chip) — the legend for every chip below. Under it a one-line
  anchor list of the section headings (navigation, not decoration; headings gain ids).
- Section order unchanged: Каре · Окна, декор и ордер · Южный фасад · Набор деталей · Проекция бюджета ·
  Соседние фасады · Источники и документы.

### 3.2 Palette tokens (derived from the scene: sky, pale-green walls, white order, ochre)
`--paper #F7F8F7` (cool off-white, the white-night sky), `--ink #1B1F1D`, `--muted #646B67`,
`--rule #D8DCD9`, `--green #3C6A4E` / tint `#E4EEE7` (palace walls → «источник»), `--ochre #87651C` /
tint `#F4EAD2` (→ «принято»); «расчёт» uses ink on `#ECEEEC`. Five hues; colour is spent only on
provenance, which is the page's one load-bearing distinction. Contrast ≥ 4.5:1 verified in the a11y gate.
No dark mode (the scene is daylight), no motion.

### 3.3 Components
- Ledger row (every NUMBER row): grid `label | value | chip`; value right-aligned in a fixed column, unit
  muted, chip 12 px; 1 px `--rule` between rows; on narrow screens the label takes the line and value+chip
  drop below. Rejected: per-number cards; a zebra key-value table.
- Table: `<caption>` styled as the small uppercase label above; numeric columns right-aligned `tnum`;
  hairline row rules only; overflow container with `tabindex="0"` on mobile.
- Chip: lowercase kind word in its tint, 2 px radius, no icon; a declared chip carries its register-line
  title as muted text after the kind («принято · Приближения размеров») — provenance is data, so it stays
  visible, just quiet.
- Callout: no box. A 13 px uppercase label in `--ochre` («Открытый вопрос») above the paragraph, indented
  to the ledger's value column; the budget policy sentence gets the same treatment in `--muted`.
- Footer «Источники и документы»: the links block as a plain list, 15 px.

### 3.4 Cuts and merges
- The three «Kit row labels» (Экземпляры · Активные детали · Потолок треугольников набора) fold into the
  kit table's footer row — the same numbers printed twice today.
- The budget callout's repeated «Проекция: …» numbers move onto the budget rows as a muted «запас N»
  suffix; the callout keeps the three ceilings and the policy sentence.
- «ожидает замера в CI» renders as an em dash value with the note muted beside it.
- The siblings section stays visible (a ledger hides nothing) but last and compact.

## 4. Text inventory (EN → RU)

Legend: `N` = runtime number; `<…>` = runtime text; grouped labels are `·`-separated in both columns.

### A. Chrome
| EN | RU |
|---|---|
| Winter Palace in the browser | Зимний дворец в браузере |
| A stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg), lit by the real Petersburg sky. | Стилизованная 3D-реконструкция Зимнего дворца (Эрмитаж, Санкт-Петербург), освещённая настоящим петербургским небом. |
| Winter Palace | Зимний дворец |
| How it's built → | Как это устроено → |
| Petersburg time, ±24 hours around the scene time | Петербургское время, ±24 часа от времени сцены |
| Arrow keys step a minute; PageUp and PageDown step an hour; Home and End pick the window bounds; Escape cancels; N returns to now. | Стрелки — шаг в минуту; PageUp и PageDown — шаг в час; Home и End — границы окна; Escape — отмена; N — вернуться к текущему времени. |
| Scroll, drag, or use the arrow keys to move along the rail from stop to stop. | Прокручивайте, тяните или нажимайте стрелки, чтобы идти по маршруту от точки к точке. |
| Winter Palace walkthrough | Прогулка по Зимнему дворцу |
| How the south facade is built (notes title, H1) | Как устроен южный фасад |
| How the south facade of the Winter Palace is generated: the frozen spec, sourced and declared numbers, the kit of parts and the budget projection. | Как генерируется южный фасад Зимнего дворца: замороженная спецификация, числа по источникам и принятые числа, набор деталей и проекция бюджета. |
| ← Palace Square | ← Дворцовая площадь |
| Numbers need JavaScript: the page re-runs the facade solver at load. | Числам нужен JavaScript: при загрузке страница заново прогоняет решатель фасада. |
| Toggle visible text (shown in EN UI / in RU UI) | RU / EN |
| Toggle accessible name (in EN UI / in RU UI) | Русский / English |
| Open question (new callout label) | Открытый вопрос |
| Sources and documents (links heading — EN not in supplement; proposed) | Источники и документы |
| index noscript — EN not in supplement | orchestrator supplies; translated in Round 26 |

### B. Stop captions (announced as `<stop id> · <caption>`)
| EN | RU |
|---|---|
| the facade and the hour | фасад и час |
| the arch opens | арка раскрывается |
| dark; the square behind | темно; площадь позади |
| compression | сжатие |
| the door (airlock) | дверь (шлюз) |
| looking up into light | взгляд вверх, к свету |
| the flight | марш |
| portholes mirror the windows | иллюминаторы вторят окнам |
| the gallery above | галерея наверху |
| arrival; the portal (landing airlock) | прибытие; портал (шлюз на площадке) |

### C. /notes content
| EN | RU |
|---|---|
| Every number on this page is produced at load by the same pure solver the app runs over its frozen facade specification (decisions.md, DEC-004). It is not a survey. Three kinds of numbers are kept apart by the type system and labelled here: | Каждое число на этой странице получено при загрузке тем же чистым решателем, который приложение прогоняет над своей замороженной спецификацией фасада (decisions.md, DEC-004). Это не обмер. Три рода чисел разведены системой типов и помечены здесь: |
| Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use"). | Источник — число несёт ключ атрибуции в ATTRIBUTIONS.md («нет строки — нет использования»). |
| Declared — a photo-derived working target registered in docs/artistic-license.md; checked against measured elevation drawings during Phase 1 and corrected in both places if the
