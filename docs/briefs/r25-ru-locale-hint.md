# r25 — RU-колонка + закон языка + подсказка (бриф релея)

РОЛЬ. Ты — специалист релея. У тебя нет инструментов, нет доступа к репозиторию и нет
предшествующего контекста; оркестратор интегрирует твой ответ в репозиторий и проверяет его
тестами, сборкой и CI. Пояснения и CHALLENGES пиши по-русски; код, имена ключей,
идентификаторы и пути — на английском; литералы словаря ru.ts — на русском.

## Что уже есть (контекст r24a/r24b/r24t, всё в main)

Репозиторий — hermitage-3d, стилизованная 3D-реконструкция Зимнего дворца (three.js +
vite + строго типизированные чистые модули). Международизация уже извлечена и переключена:

- `src/i18n/keys.ts` — плоский union из ~110 ключей с префиксами chrome. / caption. /
  notes. / data. и тип `Dictionary = Readonly<Record<Key, string>>`. Новые ключи этого
  раунда добавляю я (оркестратор) — тебе их только стоят в таблице ниже; ru.ts ссылается
  только на тип `Dictionary`.
- `src/i18n/en.ts` — EN-колонка, байт-в-байт корпус рабочего дерева (полностью цитируется
  ниже). Её существующие значения ты НЕ меняешь.
- `src/i18n/format.ts` — закон форматирования: интерполяция {name} (громкая ошибка и на
  пропущенную, и на лишнюю переменную), группировка тысяч, две цифры в дроби, арифметические
  петербургские настенные часы (без конструирования Date). Все «позднейшие RU-выборы»
  изолированы в именованные константы — твой текущий файл цитируется ниже целиком.
- `src/i18n/index.ts` — аксессор `t(key): string`, сейчас читает en.
- Чистый забор (purity fence) сканирует ВСЕ `src/i18n/*.ts`: после снятия комментариев и
  строковых литералов запрещены /from\s+['"]three/, node:, document, window, globalThis,
  self, localStorage, sessionStorage, indexedDB, navigator, /\bDate\b (Intl.DateTimeFormat
  безопасен — границы слов), Math.random, performance, requestAnimationFrame, setTimeout,
  setInterval, fetch, console. Твой код в src/i18n/ и src/ui/hint.ts обязан оставаться
  чистым: DOM, таймеры и хранилище — сторона хоста (моя).
- Вид-модель /notes и остановки рельса уже резолвят текст через t(); фикстура модели
  байт-идентична; ограда литералов держит строковые модули без прозы.
- Шрифты (r24t): self-hosted WP Sans/WP Serif с полной кириллицей и знаками «»—±≤Σ№…→←−·×,
  tnum-цифры табличные по умолчанию — любая строка RU покрыта, gate cmap проверяет.
- Решение DEC-020: RU — язык по умолчанию и канонический; `lang=ru|en` входит в грамматику
  hash-запроса; тумблер один, показывает ЦЕЛЕВОЙ язык его письмом; от navigator.language
  ничего не сеется; HUD остаётся EN (инструмент разработчика).

## Задача r25 — ровно пять файлов

1. `src/i18n/format.ts` — полная обновлённая версия (языковой закон чисел и даты).
2. `src/i18n/index.ts` — полная обновлённая версия (внутренности сменяемого словаря).
3. `src/i18n/locale.ts` — НОВЫЙ чистый модуль: закон разрешения языка + ленивая загрузка.
4. `src/ui/hint.ts` — НОВЫЙ чистый модуль: закон подсказки о перетаскивании (§9).
5. `src/i18n/ru.ts` — НОВЫЙ словарь: полная RU-колонка (самый большой файл — в ответе последним).

Всё остальное — моя работа: добавить 14 новых ключей в keys.ts и EN-значения в en.ts
(они запинены ниже), перевернуть статический HTML на RU, привязать тумблер, хост-таймеры
подсказки, Intl-часы, e2e-контракт, job бюджета для RU-chunk, тесты паритета и типографики.

## Законы раунда (приняты дизайном; флагуй противоречия в CHALLENGES)

1. **Разрешение языка (DEC-020, §1.1).** Преобразование: валидный `lang` из hash-запроса
   → персистентный override → `ru`. Невалидные значения игнорируются (URL — не закоммиченные
   данные; без throw). Персистентный ключ следует жизненному циклу `?q=` дословно (у tier'а
   это `zimny:tier` — твой ключ `zimny:lang`): URL выигрывает и пишется в override;
   когда в URL параметра нет — override очищается по тому же правилу.
2. **det.** Под `?det` (и в golden-сценах) персистентный override игнорируется (читается
   сторона), `?lang=` продолжает работать, иначе RU.
3. **Ленивый chunk (R2).** RU-строки едут ленивым чанком: единственная ссылка на `./ru` —
   динамический `import('./ru')` внутри locale.ts; никаких статических импортов ru.
   EN остаётся статическим. Так как RU — язык по умолчанию, первый рендер обеих страниц
   должен ждать готовности словаря (`ensureDictionary`), чтобы не мигнуть EN; хост делает
   это до первой отрисовки. Смена языка должна оповещать хост (колбэк-реестр), хост
   перерисовывает страницы и <html lang> / <title> / meta description.
4. **Числа (§1.4, §0).** formatNumber/форматируемые числа получают параметр языка:
   тонкие пробелы (U+2009) в тысячных группах — в ОБОИХ языках; десятичный разделитель:
   «.» в EN, «,» в RU; пробел между числом и единицей — неразрывный (U+00A0) в обоих;
   карта байтовых единиц становится языковой: EN {B, kB}, RU {Б, кБ} (решение D3).
   formatInt сохраняет сигнатуру (группировка не зависит от языка, но меняет разделитель
   на тонкий пробел). Метры «м» в строках данных — карта отображения на моей стороне,
   в format.ts их нет.
5. **Дата (§4.E, решение D6).** EN продолжает печатать нынешние ISO-байты (YYYY-MM-DD) —
   они не меняются ни на символ. RU: `Intl.DateTimeFormat('ru-RU', {day:'numeric',
   month:'long', year:'numeric', timeZone:'UTC'})` над сдвинутым на +3ч эпохом (тот же
   константа-офсет PETERSBURG_OFFSET_MS управляет обоими часами; конструирования Date нет —
   форматтер принимает число). ISO — запасной путь: если форматтер бросил или вернул
   строку из одних цифр/разделителей, вернуть ISO.
6. **Токены (R5, §8).** Шаблоны несут реальные токены {name}; имена токенов стабильны между
   языками: RU-колонка может переставлять точки интерполяции (существенно: «итог — активных
   деталей: N» ставит токен в конец), но не переименовывать их. Паритет = равные множества
   ключей и равные множества токенов по каждому ключу.
7. **Типографика RU (§1.6).** «» (вложенные „“); тире — с неразрывным пробелом перед ним;
   en dash в диапазонах; «ё» всегда; никакой латинской `"`, никакого ` - ` как тире, никакого
   `...`; имена клавиш (PageUp, Escape, N) и идентификаторы — латиницей; пути не переводятся;
   ISO-даты — в обоих языках; «±24» без пробела, «≤ N» с пробелом.
8. **Слова-чипы и короткие ярлыки.** Виды происхождения: источник · принято · расчёт
   (§C, решение D5). Короткие ярлыки фасадов: парадный · речной · усадебный · служебный
   (§7.7, RU запинены; EN-версии придумал я — оспорь, если лучше).
9. **Данные.** Ключи и токены в данных остаются сырыми (hash-и спецификации стабильны,
   R8); отображаются карты. Проблемы аудита (Issues) остаются EN (диагностика разработчика).
   Ошибки решателя внутри {message} приходят готовой строкой — шаблон только обрамляет.
10. **Подсказка (§9)** — полный закон цитирован ниже отдельным блоком.

## Новые ключи (добавляю я; EN запинены; RU — твои, кроме запиненных)

| ключ | EN | RU |
|---|---|---|
| chrome.travelHint | Drag to move closer | Потяните, чтобы подойти ближе (запинено §9) |
| chrome.toggleLabel | RU | EN (запинено §1.2: видимая надпись — ЦЕЛЕВОЙ язык) |
| chrome.toggleAria | Русский | English (запинено §1.2: доступное имя — целевой язык) |
| data.characterShortSouth | ceremonial (оспорь) | парадный (§7.7) |
| data.characterShortNorth | river (оспорь) | речной (§7.7) |
| data.characterShortWest | estate (оспорь) | усадебный (§7.7) |
| data.characterShortEast | service (оспорь) | служебный (§7.7) |
| notes.chipSourced | sourced · {keys} | источник · {keys} |
| notes.chipDeclared | declared · {licenseTitle} | принято · {licenseTitle} |
| notes.chipDerived | derived | расчёт |
| notes.chipTitleKeys | keys: {keys} | ключи: {keys} |
| notes.chipTitleRegister | register line: {licenseTitle} | строка реестра: {licenseTitle} |
| notes.errorTitle | Facade notes unavailable | прим. — твой перевод, напр. «Примечания недоступны» |
| notes.errorIntro | The facade spec does not close. {issues} | прим. — твой перевод; {issues} — EN-диагностика |

## §9 — закон подсказки (цитируется дословно из design-i18n-notes.md)

- **Text** (key `chrome.travelHint`, reserved in the freeze — emitted with the RU round; no
  terminal period, the captions' register): RU «Потяните, чтобы подойти ближе» ·
  EN "Drag to move closer". Drag only: the one gesture that works identically with mouse,
  trackpad and touch; the RU line is 29 characters — one line in the caption column at 360 px
  (the two-gesture variant would wrap). "Closer" is the owner's own word and is accurate
  because the hint shows only at S0. Keyboard users keep the sr-only #scene-help; the hint is
  for sighted first-timers.
- **Placement/style**: bottom-right corner, on the notes link's baseline and bottom inset
  (above the 32 px scrub hit area), right inset equal to the title's left inset — the four
  corners hold one element each (title / HUD-dev-only / notes link / hint) and the caption
  keeps the bottom-center axis alone. Not top-right: it collides with ?hud=1 during the very
  debugging sessions where the hint is tuned. 12 px (the notes link's step), the notes link's
  faint-white opacity, the caption's text shadow, right-aligned, `white-space: nowrap`, no box
  (a box would read as a control next to the scrub hairline). Narrow fallback (< 600 px CSS):
  the hint moves into the caption column, centered, stacked directly above #caption with one
  line-gap; the 360 fixture covers this branch, 768/1280 cover the corner.
- **Show law**: main page only; shown only when the initial stop of the load is S0 (the rail's
  start — the only place a visitor lands without a shared link); deep links into any other
  stop never show it. Appears at the arrival-settle beat together with the notes link (after
  the title's hold+fade), so the chrome settles as one reveal. Every load, no persistence:
  persisted "seen" state is hidden state the URL cannot reproduce, breaks e2e/screenshot
  determinism, and buys nothing — a returning visitor travels within a second. Time scrubbing
  is not travel and does not dismiss it. Once gone it never returns for the page lifetime.
- **Fade/dismiss law**: HINT_HOLD_MS = 6000 (visible after the settle reveal) · HINT_FADE_MS =
  1200 (unprompted timeout fade — slower than the caption's 240 because nothing happened to
  cause it) · HINT_DISMISS_MS = 240 (the caption's fade, reused for dismissal because it
  answers a user action). Dismiss on the FIRST travel intent of any kind — wheel, pointer drag
  start (any pointerType, touch included), arrow-key step (incl. boundary steps that fire
  airlocks) — subscribed to the rail's own travel-intent entry point, not raw DOM events, so
  "what counts as travel" has one definition. Reduced motion: no transitions at all — appear
  with the settle, cut at HINT_HOLD_MS, cut on travel. det/golden: identical hiding path to
  #caption — data-visible never set true, no timers scheduled in det boots, pixels frozen.
- **DOM/a11y**: `<p id="travel-hint" aria-hidden="true" data-visible="false"
  data-dismissed="none|travel|timeout">` with pointer-events: none; aria-hidden because
  #scene-help already serves AT (a visible live hint would double-announce and an aria-live
  region would re-announce on language switch).
- **Failure cases**: travel before the show beat → the intent sets data-dismissed="travel"
  immediately and the show step checks the flag first, so the hint never flashes; 360 px
  collision → the stacked fallback; the caption's glide fade and the hint's dismiss coincide
  on first travel (intended); scrub interaction → the hint stays; language toggle while
  visible → the text swaps in place, timers untouched.

Твой hint.ts — чистый закон этого поведения по образцу src/ui/captions.ts: события входят
(settle с флагом S0, travel-intent, таймаут, reduced-motion, det), взгляд (view) выходит;
никаких таймеров и DOM — таймеры ставит хост по твоим константам; дет-загрузка не ставит
таймеров вовсе; «once gone never returns» — свойство состояния.

## Исходный корпус — src/i18n/en.ts (цитируется байт-в-байт; ключ = имя, EN = значение)

```ts
export const en = {
  'chrome.titleMain': 'Winter Palace in the browser',
  'chrome.descriptionMain':
    'A stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg), lit by the ' +
    'real Petersburg sky.',
  'chrome.wordmark': 'Winter Palace',
  'chrome.notesLink': 'How it’s built →',
  'chrome.scrubLabel': 'Petersburg time, ±24 hours around the scene time',
  'chrome.scrubHelp':
    'Arrow keys step a minute; PageUp and PageDown step an hour; Home and End pick the ' +
    'window bounds; Escape cancels; N returns to now.',
  'chrome.sceneHelp':
    'Scroll, drag, or use the arrow keys to move along the rail from stop to stop.',
  'chrome.canvasLabel': 'Winter Palace walkthrough',
  'chrome.descriptionNotes':
    'How the south facade of the Winter Palace is generated: the frozen spec, sourced and ' +
    'declared numbers, the kit of parts and the budget projection.',
  'chrome.backLink': '← Palace Square',
  'chrome.noscriptNotes': 'Numbers need JavaScript: the page re-runs the facade solver at load.',

  'caption.s0': 'the facade and the hour',
  'caption.s1': 'the arch opens',
  'caption.g0': 'dark; the square behind',
  'caption.g1': 'compression',
  'caption.g2': 'the door (airlock)',
  'caption.j0': 'looking up into light',
  'caption.j1': 'the flight',
  'caption.j2': 'portholes mirror the windows',
  'caption.j3': 'the gallery above',
  'caption.j4': 'arrival; the portal (landing airlock)',

  'notes.title': 'How the south facade is built',
  'notes.intro':
    'Every number on this page is produced at load by the same pure solver the app runs over ' +
    'its frozen facade specification (decisions.md, DEC-004). It is not a survey. Three kinds ' +
    'of numbers are kept apart by the type system and labelled here:',
  'notes.kindSourced':
    'Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use").',
  'notes.kindDeclared':
    'Declared — a photo-derived working target registered in docs/artistic-license.md; ' +
    'checked against measured elevation drawings during Phase 1 and corrected in both places ' +
    'if the record differs.',
  'notes.kindDerived':
    'Derived — solver arithmetic over sourced and declared inputs ' +
    '(docs/design-facade-grammar.md); recomputed on every load, never registered.',

  'notes.shellHeading': 'Shell',
  'notes.shellIntro':
    'Quadrangle numbers as the sources give them. Where two sources disagree both counts are ' +
    'kept, each under its own key.',
  'notes.shellNorthLength': 'North (Neva) facade length',
  'notes.shellWestLength': 'West (Admiralty) facade length',
  'notes.shellWindowsConservative': 'Windows, conservative count',
  'notes.shellWindowsGenerous': 'Windows, generous count',
  'notes.shellRoomsConservative': 'Rooms, conservative count',
  'notes.shellRoomsGenerous': 'Rooms, generous count',
  'notes.shellStaircases': 'Staircases',
  'notes.shellCorniceHeight': 'Height to the cornice',
  'notes.shellTotalHeight': 'Total height with roof band',
  'notes.shellPrincipalFacade': 'Principal facade incl. roofline statuary',
  'notes.shellCorners': 'Corners incl. every projection',
  'notes.shellRoofStatuary': 'Roof statuary figures',

  'notes.decorHeading': 'Window, decor and order system',
  'notes.decorIntro':
    'The sourced catalogue (Alekseeva via wiki-ru) is reproduced as a module system and a ' +
    'column rhythm, not one-for-one: the counts below are catalogued, the kit models a smaller ' +
    'stylized set (artistic-license register, "Window/decor catalogue").',
  'notes.decorWidthModules': 'Window width modules',
  'notes.decorWindowTypes': 'Window types',
  'notes.decorSurroundTypes': 'Surround types',
  'notes.decorSculpturalTypes': 'Sculptural decor types',
  'notes.decorCapitalVarieties': 'Capital varieties',
  'notes.decorCartoucheKinds': 'Cartouche kinds',

  'notes.orderCaption': 'Order system',
  'notes.orderColFact': 'Fact',
  'notes.orderColValue': 'Value',
  'notes.orderColonnadeTiers': 'Engaged colonnade tiers',
  'notes.orderArrangement': 'Column arrangement',
  'notes.orderCapitalFamily': 'Capital family',
  'notes.orderWallColour': 'Wall colour',

  'notes.windowRowsCaption': 'Window rows, bottom to top',
  'notes.windowRowsColRow': 'Row',
  'notes.windowRowsColTier': 'Tier',
  'notes.windowRowsColModule': 'Module',
  'notes.windowRowsColHeadHeight': 'Declared head height',

  'notes.southHeading': 'South elevation — Palace Square, west → east',
  'notes.southMainLine': 'Main facade line',
  'notes.southCreaseLine': 'Crease line incl. risalit creases',
  'notes.southDeclaredPitch': 'Declared working bay pitch',
  'notes.southDerivedPitch': 'Derived bay pitch',
  'notes.southDerivedCrease': 'Derived crease line',

  'notes.sectionsCaption': 'Sections, west → east; notes verbatim from the frozen spec',
  'notes.sectionsColSection': 'Section',
  'notes.sectionsColKind': 'Kind',
  'notes.sectionsColAxes': 'Declared axes',
  'notes.sectionsColProtrusion': 'Declared protrusion',
  'notes.sectionsColNote': 'Note',

  'notes.countWindowAxes': 'Window axes',
  'notes.countWindowSlots': 'Window slots',
  'notes.countWindows': 'Windows',
  'notes.countPortalVoidCells': 'Portal void cells',
  'notes.countColumnShafts': 'Column shafts',

  'notes.creaseCallout':
    'Crease line: the spec carries {specCrease} m (sourced — wiki-en "principal facade", ' +
    'citing Budberg, Great Palaces: The Winter Palace, 1969; the ru tradition reads the same ' +
    'edge as 210 m); the solver derives {derivedCrease} m from the main line and the declared ' +
    'risalit protrusions. The two sourced lengths most likely measure one street edge under ' +
    'different source conventions, not a plan line against a crease line; the declared axis ' +
    'rhythm (7 + 20 + 8 + 20 + 7) and the derived figure have no digitized attestation ' +
    '(literature hunt closed 2026-10-17). Settling it takes measured drawings — РГИА ф. 485, ' +
    'an Albertina scan, or Pilyavsky via НЭБ — so this warning stays live until then, with the ' +
    'spec and the artistic-license register ("Dimension approximations") corrected if the ' +
    'record differs.',
  'notes.solverWarning': 'Solver: {message}',

  'notes.kitHeading': 'Instanced kit',
  'notes.kitIntro':
    'Parts the solver placed on the south facade; kit slots with no placements are omitted. ' +
    'Triangle ceilings are per-instance kit maxima, so part totals are ceilings, not measured ' +
    'counts.',
  'notes.kitColPart': 'Part',
  'notes.kitColInstances': 'Instances',
  'notes.kitColCeilingPerInstance': 'Triangle ceiling per instance',
  'notes.kitColPartTotal': 'Part total',
  'notes.kitTotalRow': 'Total — {activeParts} active parts',
  'notes.kitTotalsInstances': 'Instances',
  'notes.kitTotalsActiveParts': 'Active parts',
  'notes.kitTotalsCeiling': 'Kit triangle ceiling',

  'notes.budgetHeading': 'Budget projection',
  'notes.budgetFacadeDraws': 'Facade draw calls',
  'notes.budgetFrameDraws': 'Frame draw calls',
  'notes.budgetFrustumTriangles': 'Frustum triangles',
  'notes.budgetSubmittedCeiling': 'Submitted triangle ceiling',
  'notes.budgetJsGzip': 'JavaScript gzip',
  'notes.budgetCallout':
    'Contract ceilings enforced in CI: ≤ {frameDraws} draw calls per frame, ' +
    '≤ {frustumTriangles} frustum triangles, ≤ {gzipBytes} B JavaScript gzip. ' +
    'Projected: {projectedDraws} draws (margin {drawMargin}), {projectedTriangles} triangles ' +
    '(margin {triangleMargin}), {gzipTail}. An overrun is removed by changing art or level of ' +
    'detail, never the number.',
  'notes.gzipTailUnmeasured': 'JS gzip measured: {pending}',
  'notes.pending': 'pending CI measurement',
  'notes.gzipTailMeasured': '{gzipBytes} B JS gzip (margin {gzipMargin} B)',
  'notes.gzipRowUnmeasured': 'measured: {pending}',

  'notes.allowanceIntro':
    'Scene allowance — declared working estimates of what the rest of the frame costs ' +
    '(Round 7 massing: 12 boxes + ground plane; sky dome; one shadow pass; other draw calls). ' +
    'They are inputs to the projection, not measurements.',
  'notes.allowanceCaption': 'Scene allowance',
  'notes.allowanceColAllowance': 'Allowance',
  'notes.allowanceColValue': 'Value',
  'notes.allowanceShadowPasses': 'Shadow passes',
  'notes.allowanceOtherDraws': 'Other frame draw calls',
  'notes.allowanceMassingTriangles': 'Massing triangles',
  'notes.allowanceSkyTriangles': 'Sky triangles',

  'notes.siblingsHeading': 'Sibling facades — not shipped in Phase 1',
  'notes.siblingsIntro':
    'North, west and east reuse the kit later. Their axis counts are declared only ' +
    '(artistic-license register, "Facade axis counts"), kept so the plan arithmetic closes in ' +
    'tests; main-line lengths are the shell numbers above.',
  'notes.siblingsColFacade': 'Facade',
  'notes.siblingsColSections': 'Sections — kind · declared axes',
  'notes.siblingsColAxes': 'Declared axes',
  'notes.siblingsColCharacter': 'Character',
  'notes.siblingsSectionCell': '{id} ({kind}) {axes}',
  'notes.siblingsAxesCell': '{axes} (±1 per section)',

  'notes.formulaWindowAxes': 'Σ declaredAxes over the five sections',
  'notes.formulaCreaseLine':
    'main line + inner risalit creases from the declared protrusions (solver)',
  'notes.formulaPitch': '{length} m / {axes} axes',
  'notes.formulaSlots': '{axes} axes × {rows} rows',
  'notes.formulaWindows': 'windowSlots − portalVoidCells',
  'notes.formulaVoidCells': 'slots displaced by the entrance and portal arches (solver)',
  'notes.formulaShafts': 'Σ KIT.shaftCount × instances over column parts (solver)',
  'notes.formulaFrustum': 'kit {kit} + massing {massing} + sky {sky}',
  'notes.formulaSubmitted': 'frustumTriangles × (1 + {shadowPasses} shadow pass)',
  'notes.formulaPartTotal': 'counts.byPart × KIT.triangleCeiling',
  'notes.formulaKitCeiling': 'Σ over placed parts',
  'notes.formulaInstances': 'Σ counts.byPart',
  'notes.formulaActiveParts': 'parts with ≥ 1 instance',
  'notes.formulaKitTotal': 'Σ instances × triangleCeiling',
  'notes.formulaGzip': 'CI gzip measurement passed through allowance.measuredJsGzipBytes',
  'notes.formulaFacadeDraws': 'projectBudget: instanced draws of the active parts over all passes',
  'notes.formulaFrameDraws': 'facadeDrawCalls + {otherDraws} other draw calls',

  'notes.failUnregistered': 'unregistered: {id}',
  'notes.failNoProvenance': "displayed number '{id}' has no provenance register entry",

  'data.titleGallery': 'Rastrelli Gallery — the way in',
  'data.titleJordan': 'Jordan Staircase — the ascent',
  'data.kindCornerRisalit': 'cornerRisalit',
  'data.kindStretch': 'stretch',
  'data.kindCentralPortal': 'centralPortal',
  'data.arrangementBunchAtCorners': 'bunch-at-corners',
  'data.arrangementPairAtPortals': 'pair-at-portals',
  'data.arrangementPairPiers': 'pair-piers-between-window-groups',
  'data.capitalFamily': 'corinthian-composite (stylized, single archetype)',
  'data.wallColour':
    'pale green walls, white order and dressings — owner palette decision (decisions.md)',
  'data.characterSouth':
    'Palace Square front: three risalits, triple-arch gateway (wiki-ru, visit-petersburg).',
  'data.characterNorth': 'Continuous colonnade to the Neva (visit-petersburg).',
  'data.characterWest': 'Country-palace composition toward the Admiralty (visit-petersburg).',
  'data.characterEast': 'Massive flanks around the service court (visit-petersburg).',
  'data.southNoteSwCorner':
    'SW corner mass: its own arched portal with giant columns and balcony, corner column ' +
    'bunches; protrudes toward the square.',
  'data.southNoteWestStretch': 'Flat run: window axes with paired-column piers every ~4th bay.',
  'data.southNotePortal':
    'Parade gateway: three entrance arches (courtyard entrance), giant columns, pediment ' +
    'with clock and eagle cartouche — the Strelna device.',
  'data.southNoteEastStretch': 'Mirror of the west stretch.',
  'data.southNoteSeCorner':
    'SE corner mass: portal with giant columns and cartouche; palace chapel dome rises ' +
    'behind this end.',
  'data.siblingNoteNevaCorner': 'Neva-side corner mass (declared).',
  'data.siblingNoteColonnade': 'Continuous colonnade character (visit-petersburg).',
  'data.siblingNoteCentralPavilionPortals':
    'Central pavilion (declared; arched portals to the courtyard).',
  'data.siblingNoteMirrorRun': 'Mirror run (declared).',
  'data.siblingNoteMillionnaya': 'Toward Millionnaya Street; massive flanks (visit-petersburg).',
  'data.siblingNoteCentralPavilion': 'Central pavilion (declared).',
} satisfies Dictionary;
```

## Ратифицированная RU-колонка (§4 дизайн-дока; цитируется дословно — это источник переводов)

Легенда: `N` — число времени исполнения; `{n}` — шаблонный токен; пути/идентификаторы/метки
источников остаются латиницей. При переносе в ru.ts голые `N` и `<x>` заменяются реальными
токенами {name} из EN-шаблона (перестановка точек интерполяции разрешена и местами
потребована законом «существительное первым»; переименование токенов запрещено).

### A. Chrome (index.html + notes.html)
| EN | RU |
|---|---|
| Winter Palace in the browser | Зимний дворец в браузере |
| A stylized 3D recreation of the Winter Palace (Hermitage, Saint Petersburg), lit by the real Petersburg sky. | Стилизованная 3D-реконструкция Зимнего дворца (Эрмитаж, Санкт-Петербург), освещённая настоящим петербургским небом. |
| Winter Palace | Зимний дворец |
| How it's built → | Как это устроено → |
| Petersburg time, ±24 hours around the scene time | Петербургское время, ±24 часа от времени сцены |
| Arrow keys step a minute; PageUp and PageDown step an hour; Home and End pick the window bounds; Escape cancels; N returns to now. | Стрелки — шаг в минуту; PageUp и PageDown — шаг в час; Home и End — границы окна; Escape — отмена; N — вернуться к текущему моменту. |
| Scroll, drag, or use the arrow keys to move along the rail from stop to stop. | Прокручивайте, перетаскивайте или нажимайте стрелки, чтобы двигаться по маршруту от остановки к остановке. |
| Winter Palace walkthrough | Прогулка по Зимнему дворцу |
| How the south facade is built | Как устроен южный фасад |
| How the south facade of the Winter Palace is generated: the frozen spec, sourced and declared numbers, the kit of parts and the budget projection. | Как генерируется южный фасад Зимнего дворца: замороженная спецификация, числа из источников и принятые значения, набор деталей и проекция бюджета. |
| ← Palace Square | ← Дворцовая площадь |
| Numbers need JavaScript: the page re-runs the facade solver at load. | Для чисел нужен JavaScript: при загрузке страница заново запускает решатель фасада. |

### B. Подписи остановок (строчные буквы сохраняются)
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

### C. Содержимое /notes
| EN | RU |
|---|---|
| Every number on this page is produced at load… (intro) | Каждое число на этой странице вычисляется при загрузке тем же чистым решателем, который приложение запускает над своей замороженной спецификацией фасада (decisions.md, DEC-004). Это не обмер. Три рода чисел разведены системой типов и помечены здесь: |
| Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use"). | Источник — число несёт ключ атрибуции в ATTRIBUTIONS.md («нет строки — нет использования»). |
| Declared — a photo-derived working target… | Принято — рабочее целевое значение, снятое с фотографий и зарегистрированное в docs/artistic-license.md; на этапе 1 сверяется с обмерными чертежами фасадов и, если чертежи с ним расходятся, исправляется в обоих местах. |
| Derived — solver arithmetic… | Расчёт — вычислено решателем из чисел двух предыдущих родов (docs/design-facade-grammar.md); пересчитывается при каждой загрузке, никогда не регистрируется. |
| Shell | Каре |
| Quadrangle numbers as the sources give them… | Числа каре — такими, как их дают источники. Там, где два источника расходятся, сохраняются оба подсчёта, каждый под своим ключом. |
| North (Neva) facade length | Длина северного (Невского) фасада |
| West (Admiralty) facade length | Длина западного (Адмиралтейского) фасада |
| Windows, conservative count | Окна, нижняя оценка |
| Windows, generous count | Окна, верхняя оценка |
| Rooms, conservative count | Комнаты, нижняя оценка |
| Rooms, generous count | Комнаты, верхняя оценка |
| Staircases | Лестницы |
| Height to the cornice | Высота до карниза |
| Total height with roof band | Полная высота с кровельным поясом |
| Principal facade incl. roofline statuary | Главный фасад, включая скульптуру по линии кровли |
| Corners incl. every projection | Углы, включая все выступы |
| Roof statuary figures | Скульптуры на кровле |
| Window, decor and order system | Окна, декор и ордер |
| The sourced catalogue (Alekseeva via wiki-ru)… | Каталог из источника (Алексеева через wiki-ru) воспроизведён как система модулей и ритм колонн, а не один к одному: числа ниже — каталожные, а набор деталей моделирует меньшее стилизованное множество (реестр художественных допущений, «Каталог окон и декора»). |
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
| Parts the solver placed on the south facade… | Детали, которые решатель разместил на южном фасаде; слоты набора без размещений опущены. Потолки треугольников — максимумы набора на один экземпляр, поэтому итоги по деталям — это потолки, а не измеренные количества. |
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
| Budget callout | Контрактные потолки, проверяемые в CI: вызовов отрисовки за кадр — не более N, треугольников в пирамиде видимости — не более N, JavaScript gzip — не более N Б. Проекция: вызовы — N (запас N), треугольники — N (запас N), N. Превышение устраняют изменением арта или уровня детализации — и никогда изменением числа. |
| Scene allowance — declared working estimates… | Резерв на сцену — принятые рабочие оценки того, во что обходится остальной кадр (массинг раунда 7: 12 боксов + плоскость земли; небесный купол; один теневой проход; прочие вызовы отрисовки). Это входные данные проекции, а не измерения. |
| Scene allowance (table caption) | Резерв на сцену |
| Allowance · Value | Статья · Значение |
| Shadow passes | Теневые проходы |
| Other frame draw calls | Прочие вызовы отрисовки за кадр |
| Massing triangles | Треугольники массинга |
| Sky triangles | Треугольники неба |
| Sibling facades — not shipped in Phase 1 | Соседние фасады — не входят в Фазу 1 |
| North, west and east reuse the kit later… | Северный, западный и восточный фасады позже переиспользуют тот же набор деталей. Их числа осей только приняты (реестр художественных допущений, «Число осей фасадов») и хранятся затем, чтобы в тестах сходилась арифметика плана; длины основных линий — это числа каре, приведённые выше. |
| Facade · Sections — kind · declared axes · Declared axes · Character | Фасад · Секции — тип · принятые оси · Принятые оси · Характер |
| N (±1 per section) | N (±1 на секцию) |
| main line + inner risalit creases from the declared protrusions (solver) | основная линия + внутренние изломы ризалитов из принятых выносов (решатель) |
| Σ declaredAxes over the five sections | Σ declaredAxes по пяти секциям |
| slots displaced by the entrance and portal arches (solver) | слоты, вытесненные арками входа и портала (решатель) |
| Σ KIT.shaftCount × instances over column parts (solver) | Σ KIT.shaftCount × instances по деталям-колоннам (решатель) |
| Σ over placed parts | Σ по размещённым деталям |
| parts with ≥ 1 instance | детали с ≥ 1 экземпляром |
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

### D. Строки данных, выводимые как текст (карты отображения; сами токены остаются в данных)
- Виды секций: cornerRisalit → угловой ризалит · stretch → прясло · centralPortal →
  центральный портал.
- Расстановки: bunch-at-corners → пучки на углах · pair-at-portals → пары у порталов ·
  pair-piers-between-window-groups → пары на простенках между группами окон.
- Семейство капителей: токен `corinthian-composite` остаётся; отображение
  «коринфско-композитная» + «(стилизованная, единый архетип)».
- Примечание о цвете стен: бледно-зелёные стены, белые ордер и обрамления — решение
  владельца по палитре (decisions.md).
- Характеры фасадов (полные предложения): Фасад на Дворцовую площадь: три ризалита,
  трёхарочный проезд (wiki-ru, visit-petersburg). · Сплошная колоннада к Неве
  (visit-petersburg). · Композиция загородного дворца со стороны Адмиралтейства
  (visit-petersburg). · Массивные крылья вокруг служебного двора (visit-petersburg).

## HOUSE STYLE (обязателен для каждого файла)

Ведущий блочный комментарий, ссылающийся на секции дизайна (design-i18n-notes.md §…);
только именованные экспорты, никаких default; никаких enum; `satisfies` вместо `as` там,
где типизируется литеральный объект; `import type` для типовых импортов; строгий TS —
noUncheckedIndexedAccess, exactOptionalPropertyTypes (`| null`, никогда
optional-undefined), noUnusedLocals/Parameters; biome: одинарные кавычки, пробельный
отступ, строки ≤ 100; чистые модули — без three, node:, DOM, таймеров, часов, хранилища
и случайности; законы состояния — в комментариях один раз, декларативно.

## NUMBERS UNDER TRANSPORT (ловушка транспорта)

Транспорт маскирует числа в дословном материале. Никогда не угадывай цифру: там, где число
в приведённом корпусе маскировано или явно отсутствует, emit строку-маркер
`MASKED-IN-BRIEF: keep the <имя-ключа> value` на месте значения (целиком или в точке
интерполяции) — оркестратор восстановит против закоммиченного дерева и дизайн-дока.
Лучший ответ не содержит твоих собственных выдуманных чисел вообще.

## ЗАПРЕЩЕНО (must-not-touch этого раунда)

Не эмитируй и не изменяй: keys.ts, en.ts, тесты, e2e-спеки, budget.mjs, фикстуры, золотые
бейзлайны, HUD-строки, сообщения аудита (Issues — EN), committed-данные фасада. Существующие
значения en.ts не меняются ни на байт; новые ключи добавляю я. ES-байты ISO-даты EN
неизменны. Не добавляй зависимостей. Не трогай surface экспортов index.ts, кроме
необходимой внутренней смены словаря.

## КОНТРАКТ ОТВЕТА

Ответ — ровно пять пронумерованных фрагментов, каждый — один fenced-блок с полным
содержимым файла (первая строка блока — путь файла комментарием), перед блоком одна строка
обоснования. Порядок: (1) src/i18n/format.ts; (2) src/i18n/index.ts; (3) src/i18n/locale.ts;
(4) src/ui/hint.ts; (5) src/i18n/ru.ts — САМЫЙ БОЛЬШОЙ ФАЙЛ ПОСЛЕДНИМ. Бюджет ответа ~450
строк: срезай только на границе файла и завершай срез строкой
`TRUNCATED-HERE: <путь следующего файла>`; продолжение понесёт принятые константы и
закоммиченные файлы. После блоков — CHALLENGES: до 10 пунктов («Before answering, challenge
key assumptions, consider a credible alternative, and check likely failure cases; give the
requested output with concise rationale and any material uncertainties» — кратко и по-русски).
