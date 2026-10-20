# Design — the Russian voice, the type, the /notes face (Round 22)

Status: design complete, delivered for the owner's disposition; code rounds 23–26 implement (§6). The full RU inventory of the real strings arrived on the second continuation (the first continuation's reconstructed rows are discarded); C12/C13 verified against the committed data; the dispositions list is §7. The r22 brief and both continuations are deleted after integration — this document carries everything.
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
- The clock line: REVISED by §4.E (the second continuation) — `HH:MM` + the RU genitive month via
  `Intl.DateTimeFormat('ru-RU')` («19 октября 2026 г.»); the original rejection («a twelve-word table») died
  with Intl — no hand month table, ISO stays the fallback. The owner confirms at §7.6.
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

## 4. Text inventory (EN → RU) — the full set of the real strings

Legend: `N` = a runtime number; `{n}` = the template token (R5); paths/identifiers/source tags
stay Latin. The HUD is excluded (EN-only, E3). A4/A9 keep the ADOPTED variants. C12/C13's
semantics are verified against the committed data (see §7).

### A. Chrome (index.html + notes.html)
| EN | RU |
|---|---|
| Winter Palace in the browser | Зимний дворец в браузере |
| A stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg), lit by the real Petersburg sky. | Стилизованная 3D-реконструкция Зимнего дворца (Эрмитаж, Санкт-Петербург), освещённая настоящим петербургским небом. |
| Winter Palace | Зимний дворец |
| How it's built → | Как это устроено → |
| Petersburg time, ±24 hours around the scene time | Петербургское время, ±24 часа от времени сцены |
| Arrow keys step a minute; PageUp and PageDown step an hour; Home and End pick the window bounds; Escape cancels; N returns to now. | Стрелки — шаг в минуту; PageUp и PageDown — шаг в час; Home и End — границы окна; Escape — отмена; N — вернуться к текущему моменту. (N = the KEY; the handler uses event.code === 'KeyN') |
| Scroll, drag, or use the arrow keys to move along the rail from stop to stop. | Прокручивайте, перетаскивайте или нажимайте стрелки, чтобы двигаться по маршруту от остановки к остановке. |
| Winter Palace walkthrough | Прогулка по Зимнему дворцу |
| How the south facade is built | Как устроен южный фасад |
| How the south facade of the Winter Palace is generated: the frozen spec, sourced and declared numbers, the kit of parts and the budget projection. | Как генерируется южный фасад Зимнего дворца: замороженная спецификация, числа из источников и принятые значения, набор деталей и проекция бюджета. |
| ← Palace Square | ← Дворцовая площадь |
| Numbers need JavaScript: the page re-runs the facade solver at load. | Для чисел нужен JavaScript: при загрузке страница заново запускает решатель фасада. |
| Toggle visible text (RU UI / EN UI) | EN / RU |
| Toggle accessible name (RU UI / EN UI) | English / Русский |
| Open question (the callout label) | Открытый вопрос |
| Sources and documents (the links heading) | Источники и документы |

### B. Stop captions (lowercase kept; announced as `<stop id> · <caption>`)
| EN | RU |
|---|---|
| the facade and the hour | фасад и час |
| the arch opens | арка раскрывается |
| dark; the square behind | темно; площадь позади |
| compression | сжатие |
| the door (airlock) | дверь (шлюз) |
| looking up into light | взгляд вверх, к свету |
| the flight | лестничный марш |
| portholes mirror the windows | иллюминаторы вторят окнам |
| the gallery above | галерея наверху |
| arrival; the portal (landing airlock) | прибытие; портал (шлюз на лестничной площадке) |

### C. /notes content
| EN | RU |
|---|---|
| Every number on this page is produced at load by the same pure solver the app runs over its frozen facade specification (decisions.md, DEC-004). It is not a survey. Three kinds of numbers are kept apart by the type system and labelled here: | Каждое число на этой странице вычисляется при загрузке тем же чистым решателем, который приложение запускает над своей замороженной спецификацией фасада (decisions.md, DEC-004). Это не обмер. Три рода чисел разведены системой типов и помечены здесь: |
| Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use"). | Источник — число несёт ключ атрибуции в ATTRIBUTIONS.md («нет строки — нет использования»). |
| Declared — a photo-derived working target registered in docs/artistic-license.md; checked against measured elevation drawings during Phase 1 and corrected in both places if the record differs. | Принято — рабочее целевое значение, снятое с фотографий и зарегистрированное в docs/artistic-license.md; на этапе 1 сверяется с обмерными чертежами фасадов и, если чертежи с ним расходятся, исправляется в обоих местах. |
| Derived — solver arithmetic over sourced and declared inputs (docs/design-facade-grammar.md); recomputed on every load, never registered. | Расчёт — вычислено решателем из чисел двух предыдущих родов (docs/design-facade-grammar.md); пересчитывается при каждой загрузке, никогда не регистрируется. |
| Shell | Каре |
| Quadrangle numbers as the sources give them. Where two sources disagree both counts are kept, each under its own key. | Числа каре — такими, как их дают источники. Там, где два источника расходятся, сохраняются оба подсчёта, каждый под своим ключом. |
| North (Neva) facade length | Длина северного (Невского) фасада |
| West (Admiralty) facade length | Длина западного (Адмиралтейского) фасада |
| Windows, conservative count | Окна, нижняя оценка |
| Windows, generous count | Окна, верхняя оценка |
| Rooms, conservative count | Комнаты, нижняя оценка |
| Rooms, generous count | Комнаты, верхняя оценка |
| Staircases | Лестницы |
| Height to the cornice | Высота до карниза |
| Total height with roof band | Полная высота с кровельным поясом — a HEIGHT (~24 m) verified against the data |
| Principal facade incl. roofline statuary | Главный фасад, включая скульптуру по линии кровли — a LENGTH (215 m) verified against the data |
| Corners incl. every projection | Углы, включая все выступы |
| Roof statuary figures | Скульптуры на кровле |
| Window, decor and order system | Окна, декор и ордер |
| The sourced catalogue (Alekseeva via wiki-ru) is reproduced as a module system and a column rhythm, not one-for-one: the counts below are catalogued, the kit models a smaller stylized set (artistic-license register, "Window/decor catalogue"). | Каталог из источника (Алексеева через wiki-ru) воспроизведён как система модулей и ритм колонн, а не один к одному: числа ниже — каталожные, а набор деталей моделирует меньшее стилизованное множество (реестр художественных допущений, «Каталог окон и декора»). |
| Window width modules | Модули ширины окон |
| Window types | Типы окон |
| Surround types | Типы наличников |
| Sculptural decor types | Типы скульптурного декора |
| Capital varieties | Разновидности капителей |
| Cartouche kinds | Виды картушей |
| Order system (table caption) | Ордерная система |
| Fact · Value | Факт · Значение |
| Engaged colonnade tiers | Ярусы приставной колоннады |
| Column arrangement | Расстановка колонн |
| Capital family | Семейство капителей |
| Wall colour | Цвет стен |
| Window rows, bottom to top (table caption) | Ряды окон, снизу вверх |
| Row · Tier · Module · Declared head height | Ряд · Ярус · Модуль · Принятая отметка верха окна |
| South elevation — Palace Square, west → east | Южный фасад — Дворцовая площадь, запад → восток |
| Main facade line | Основная линия фасада |
| Crease line incl. risalit creases | Ломаная линия, включая изломы ризалитов |
| Declared working bay pitch | Принятый рабочий шаг осей |
| Derived bay pitch | Расчётный шаг осей |
| Derived crease line | Расчётная ломаная линия |
| Sections, west → east; notes verbatim from the frozen spec (table caption) | Секции, запад → восток; примечания — дословно из замороженной спецификации |
| Section · Kind · Declared axes · Declared protrusion · Note | Секция · Тип · Принятые оси · Принятый вынос · Примечание |
| Window axes | Оконные оси |
| Window slots | Оконные слоты |
| Windows | Окна |
| Portal void cells | Пустые ячейки портала |
| Column shafts | Стволы колонн |
| Crease callout (static part) | Ломаная линия: в спецификации стоит N м (источник — wiki-en, «principal facade», со ссылкой на Budberg, Great Palaces: The Winter Palace, 1969; русскоязычная традиция читает ту же кромку как 210 м); решатель выводит N м из основной линии и принятых выносов ризалитов. Две длины из источников, скорее всего, измеряют одну и ту же уличную кромку в разных конвенциях источников, а не линию плана против ломаной; принятый ритм осей (7 + 20 + 8 + 20 + 7) и расчётная величина не имеют оцифрованного подтверждения (поиск по литературе закрыт 2026-10-17). Разрешить вопрос могут только обмерные чертежи — РГИА ф. 485, скан из Альбертины или Пилявский через НЭБ, — поэтому до тех пор это предупреждение остаётся в силе, а спецификация и реестр художественных допущений («Приближения размеров») будут исправлены, если документы разойдутся. |
| Solver: <warning message> (the dynamic tail) | Решатель: <сообщение предупреждения> |
| derived crease length N m differs from declared N m (the solver's warning) | расчётная длина ломаной N м отличается от принятой N м |
| Instanced kit | Набор деталей |
| Parts the solver placed on the south facade; kit slots with no placements are omitted. Triangle ceilings are per-instance kit maxima, so part totals are ceilings, not measured counts. | Детали, которые решатель разместил на южном фасаде; слоты набора без размещений опущены. Потолки треугольников — максимумы набора на один экземпляр, поэтому итоги по деталям — это потолки, а не измеренные количества. |
| Part · Instances · Triangle ceiling per instance · Part total | Деталь · Экземпляры · Потолок треугольников на экземпляр · Итого по детали |
| Total — N active parts | Итого — активных деталей: N |
| Instances · Active parts · Kit triangle ceiling (the footer row) | Экземпляры · Активные детали · Потолок треугольников набора |
| Budget projection | Проекция бюджета |
| Facade draw calls | Вызовы отрисовки фасада |
| Frame draw calls | Вызовы отрисовки за кадр |
| Frustum triangles | Треугольники в пирамиде видимости |
| Submitted triangle ceiling | Потолок отправляемых треугольников |
| JavaScript gzip | JavaScript gzip |
| pending CI measurement | ожидает замера в CI |
| Budget callout: Contract ceilings enforced in CI: ≤ N draw calls per frame, ≤ N frustum triangles, ≤ N B JavaScript gzip. Projected: N draws (margin N), N triangles (margin N), N. An overrun is removed by changing art or level of detail, never the number. | Контрактные потолки, проверяемые в CI: вызовов отрисовки за кадр — не более N, треугольников в пирамиде видимости — не более N, JavaScript gzip — не более N Б. Проекция: вызовы — N (запас N), треугольники — N (запас N), N. Превышение устраняют изменением арта или уровня детализации — и никогда изменением числа. |
| Scene allowance — declared working estimates of what the rest of the frame costs (Round 7 massing: 12 boxes + ground plane; sky dome; one shadow pass; other draw calls). They are inputs to the projection, not measurements. | Резерв на сцену — принятые рабочие оценки того, во что обходится остальной кадр (массинг раунда 7: 12 боксов + плоскость земли; небесный купол; один теневой проход; прочие вызовы отрисовки). Это входные данные проекции, а не измерения. |
| Scene allowance (table caption) | Резерв на сцену |
| Allowance · Value | Статья · Значение |
| Shadow passes | Теневые проходы |
| Other frame draw calls | Прочие вызовы отрисовки за кадр |
| Massing triangles | Треугольники массинга |
| Sky triangles | Треугольники неба |
| Sibling facades — not shipped in Phase 1 | Соседние фасады — не входят в Фазу 1 |
| North, west and east reuse the kit later. Their axis counts are declared only (artistic-license register, "Facade axis counts"), kept so the plan arithmetic closes in tests; main-line lengths are the shell numbers above. | Северный, западный и восточный фасады позже переиспользуют тот же набор деталей. Их числа осей только приняты (реестр художественных допущений, «Число осей фасадов») и хранятся затем, чтобы в тестах сходилась арифметика плана; длины основных линий — это числа каре, приведённые выше. |
| Facade · Sections — kind · declared axes · Declared axes · Character | Фасад · Секции — тип · принятые оси · Принятые оси · Характер |
| N (±1 per section) | N (±1 на секцию) |
| main line + inner risalit creases from the declared protrusions (solver) | основная линия + внутренние изломы ризалитов из принятых выносов (решатель) |
| Σ declaredAxes over the five sections | Σ declaredAxes по пяти секциям |
| windowSlots − portalVoidCells | KEEP (a formula, code only) |
| slots displaced by the entrance and portal arches (solver) | слоты, вытесненные арками входа и портала (решатель) |
| Σ KIT.shaftCount × instances over column parts (solver) | Σ KIT.shaftCount × instances по деталям-колоннам (решатель) |
| counts.byPart × KIT.triangleCeiling | KEEP |
| Σ over placed parts | Σ по размещённым деталям |
| Σ counts.byPart | KEEP |
| parts with ≥ 1 instance | детали с ≥ 1 экземпляром |
| Σ instances × triangleCeiling | KEEP |
| CI gzip measurement passed through allowance.measuredJsGzipBytes | замер gzip в CI, переданный через allowance.measuredJsGzipBytes |
| projectBudget: instanced draws of the active parts over all passes | projectBudget: инстансированные вызовы отрисовки активных деталей по всем проходам |
| facadeDrawCalls + N other draw calls | facadeDrawCalls + прочие вызовы отрисовки (N) |
| frustumTriangles × (1 + N shadow pass) | frustumTriangles × (1 + N) за счёт теневых проходов |
| Chip kinds: sourced · declared · derived | источник · принято · расчёт |
| Dimension approximations | Приближения размеров |
| Facade axis counts (Phase 1 spec) | Число осей фасадов (спецификация Фазы 1) |
| Window/decor catalogue | Каталог окон и декора |
| Budget allowance (Phase 1 /notes) | Бюджетный резерв (Фаза 1, /notes) |
| unregistered: <id> | не зарегистрировано: <id> |
| displayed number <id> has no provenance register entry | у отображаемого числа <id> нет записи в реестре происхождения |

### D. Data strings rendered as text — the display-map decision
- Section kinds: cornerRisalit → угловой ризалит · stretch → прясло (alt. «участок стены» — the owner picks) · centralPortal → центральный портал. The tokens stay in the data and the DOM (`data-kind`), the map renders.
- Arrangement tokens: bunch-at-corners → пучки на углах · pair-at-portals → пары у порталов · pair-piers-between-window-groups → пары на простенках между группами окон.
- Capital family: the token `corinthian-composite` stays; the display «коринфско-композитная» + «(стилизованная, единый архетип)».
- Wall colour note: бледно-зелёные стены, белые ордер и обрамления — решение владельца по палитре (decisions.md).
- Facade characters (the full sentences): Фасад на Дворцовую площадь: три ризалита, трёхарочный проезд (wiki-ru, visit-petersburg). · Сплошная колоннада к Неве (visit-petersburg). · Композиция загородного дворца со стороны Адмиралтейства (visit-petersburg). · Массивные крылья вокруг служебного двора (visit-petersburg). The owner's short-label proposal: парадный · речной · усадебный (west — the sourced word) · дворовый — wait, the specialist's catch: BOTH «служебный» and «дворовый» map the east; the west gets «усадебный» (the sourced «усадебная композиция»). Adopted: парадный · речной · усадебный · служебный (east = the service court).

### E. Runtime-formatted strings
- The clock line: HH:MM + the RU genitive month via `Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long', year:'numeric'})` → «19 октября 2026 г.» — SUPERSEDES the fragment's §1.4 ISO decision (the «twelve-word table» objection dies with Intl; no hand month table). ISO stays the fallback.
- The scrub's aria-valuetext: the ru-RU formatter feeds `<date> <time> (UTC+03:00)`; «(МСК, UTC+3)» is the owner's optional call.
- The HUD: EN-only confirmed; excluded from the parity test.

## 5. Risks

- **R1 Inflection:** any future template with N before a noun breaks for N ending in 1 or 2–4 («22 вызовов» is wrong). The RU column is noun-first; enforce in review or add Intl.PluralRules.
- **R2 Gzip:** Cyrillic is 2 bytes/char; the RU strings ≈ 5–7 kB gzip — ship them as a lazy chunk; the CI budget job measures the EN bundle and the RU chunk separately.
- **R3 Text expansion 20–35%:** the table headers and the chips overflow at 360 px — wrap or abbreviate; screenshot fixtures at 360/768/1280.
- **R4 Number formatting:** ru-RU = NBSP thousands + the decimal comma («1,786» reads as a decimal in RU); units B/kB → Б/кБ; the formatter is locale-driven everywhere, callouts included.
- **R5 Placeholder collision:** a bare `N` collides with the N key (A6) and «N (±1…)»; the templates use a real token (`{n}`).
- **R6 Keyboard:** the N shortcut is dead on ЙЦУКЕН unless the handler checks `event.code === 'KeyN'`.
- **R7 Register titles:** the quoted RU titles (C83–C85, «Приближения размеров») must resolve to the EN headings in docs/artistic-license.md — the EN title is the key, the RU is the label, or «нет строки — нет использования» breaks.
- **R8 Data keys:** translating keys inside the data changes spec hashes and tests — display maps only, with a test that every key has a display entry in both locales.
- **R9 Glossary drift** with rounds 1–21 (маршрут/рельс, массинг/блок-модель, прясло/участок) — the glossary above is the freeze candidate; the owner reconciles.
- **R10 Mixed-script lines** (the citations stay Latin) — optional `lang="en"` spans for the screen readers.
- **R11 C12/C13 semantics** — RESOLVED against the committed data (see §7).

## 6. Implementation plan (rounds 23–26; the file names map to the repo's real ones at integration)

- **r23 — Inventory freeze (docs only).** This doc carries the table, the glossary, the D/E decisions, the placeholder rule; a DEC line for the locale strategy (RU default; `?lang=`/persisted/toggle; the HUD EN-only; display maps; the RU chunk's budget rule). Exit: every string keyed + translated; the owner settles §7's forks; zero invented rows.
- **r24 — Extraction, EN only (behaviour-preserving).** `src/i18n/keys.ts` (the typed key union), `src/i18n/en.ts`, `src/i18n/format.ts` ({n} interpolation, the Intl number/date wrappers, the unit map); the view-model and the stops switch to keys; the static HTML strings via keys; a literals fence test + a DOM snapshot test byte-identical to the pre-refactor. Exit: the snapshot identical; the solver outputs unchanged; the gzip delta within noise.
- **r25 — RU runtime.** `src/i18n/ru.ts` (this column), `src/i18n/locale.ts` (the resolution law, the lazy import, `<html lang>`), the ru-RU Intl formatters; the a11y RU test; the CI budget job measuring the EN bundle + the RU chunk. Exit: no EN leak on the RU pages (the HUD, the citations and the identifiers excepted); the parity test (equal key sets, equal placeholder sets per key); the crease callout renders both parts in RU.
- **r26 — Native review and layout.** The RU fixes from the owner's read-through; the 360 px wrapping; the screenshot fixtures en/ru × 360/768/1280; the doc frozen. Exit: the owner signs the copy; no clipping at the three widths; the gates in CI.
- **The travel hint (added 2026-10-20, the owner's discoverability report: «I didn't know at first how to move closer»):** the only movement help today is sr-only — a VISIBLE hint (one line, auto-fade, dismissed by the first travel) is added to the r23–r26 scope; the SPECIALIST decides its text (RU+EN), design and fade law in the r23 freeze; implemented with r25. The full touch-travel gesture stays Phase 4 (mobile tier + touch rail).

## 7. Owner dispositions (the forks, each with a default)

1. **прясло vs участок стены** (D1, stretch) — default: **прясло** (precise; the alt if it reads too specialist).
2. **резерв vs поправка** (allowance) — default: **резерв**.
3. **Б vs B** (the units) — default: **Б** (R4; the RU page keeps Б, the identifiers stay Latin).
4. **C86/C87 RU vs EN** (the failure strings) — default: **RU** (they render; the grep-ability loss is acceptable).
5. **The /notes full RU vs EN-only** (the CHALLENGE's credible alternative) — default: **full RU** (the owner's original ask; the mixed-script caveat accepted).
6. **E1 the genitive month via Intl vs ISO** — default: **Intl ru-RU** (supersedes the fragment's §1.4; no hand table).
7. **The facade characters' short labels** — default: **парадный · речной · усадебный · служебный** (the sourced «усадебная композиция» resolves the west; «служебный» takes the east).
8. **The T1 dpr-2 raise** (ADR-0015's open part — not r22's, pending in parallel) — the numbers: jordan 16.8–16.9 idle; the owner picks sharp-always vs `?q=2`-on-demand.

Verified against the committed data (the specialist's R11): `Total height with roof band` is the ~24 m HEIGHT (the roof band over the ~22 m cornice), `Principal facade incl. roofline statuary` is the 215 m LENGTH — both labels sit next to metre values and the translations read correctly for those dimensions.

## 8. CHALLENGES (the specialist's, adopted into the record)

- The noun-first RU templates are the only inflection-safe form; the interpolation points moved in C49/C56/C80/C81 — the orchestrator accepts moved placeholders.
- The credible alternative «/notes stays EN» was weighed (§7.5) and rejected by the owner's original ask.
- The data keys stay raw; the render-time maps keep the spec hashes stable (R8).
- The digits arrived unmasked and plausibility-cross-checked (210 m = the ru tradition; 7+20+8+20+7 = 62 axes).
