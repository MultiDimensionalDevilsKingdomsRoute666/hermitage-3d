# RELAY BRIEF r26.2 — the /notes page, redesigned on a dark ground

**FACTS DOSSIER.** Everything below is facts, verdicts, capabilities-with-costs, and the
binding contract. It deletes nothing and pre-decides nothing: no direction, no device
list, no layout from the orchestrator. Previous briefs anchored the specialist (an
«annex of the scene» framing, the incumbent CSS read as one proposal) and both resulting
faces were rejected as generic; executing an anchored idea neatly is what reads generic.
You decide the design completely. The two verbatim materials at the bottom are the
current state being replaced — read them as facts, not as a baseline to preserve and not
as an enemy to avoid.

You are the specialist of a relay. You have no tools, no repo access and no prior
context; the orchestrator integrates your reply into the repository and validates it.
Work in English.

## 1. Project facts

- **Zimny** — a stylized, fully procedural 3D recreation of the Winter Palace (Hermitage,
  Saint Petersburg) in the browser. A pure solver places every window slot and column
  from a frozen spec; the sky renders the real Petersburg sun by clock time; interiors
  are baked-light rooms. Two pages ship: the WebGL walkthrough (`/`, the scene) and
  `/notes` (the engineering ledger that this round redesigns). Everything is
  deterministic and CI-gated.
- Audience: hiring managers and senior engineers. Two reads must work: a 10-second read
  (what it is + that it is finished) and a closer read (depth and care).
- On the main page, chrome text rides the 3D scene: white type on dark translucent
  plates, serif wordmark, the sun-lit palace fills the viewport. `/notes` is a pure DOM
  page next to it — no canvas, no WebGL.
- Owner quality law, in the owner's own words, binding: **«senior developer minimalistic
  taste but which at the same time stands out»**; **organic** — nothing bolted-on,
  nothing template-generated, state changes continuous; **consistent on every surface
  and state**.

## 2. Page facts

- `/notes` is the engineering ledger of every number the solver produces for the south
  facade: how the app builds the palace exactly, with the numbers multiplied out.
- Every displayed number carries provenance of one of three kinds, and the three kinds
  must stay distinguishable (hard owner law, «no line, no use» — a displayed number
  without provenance is a hard error):
  - **sourced** — carries an attribution key into ATTRIBUTIONS.md;
  - **declared** — a working target registered in the artistic-license register,
    checked against measured elevation drawings;
  - **derived** — solver arithmetic over sourced and declared inputs; recomputed at
    every load, never registered.
- The page re-runs the pure facade solver at every load, renders a pure view-model into
  the DOM, and nothing about it is random: pixel-strict layout fixtures gate it.
- Bilingual: Russian by default, an English toggle; every user-visible string comes from
  an i18n dictionary at render time (the strings are frozen corpus — see §5).
- The page's own words: title «How the south facade is built»; meta description «How the
  south facade of the Winter Palace is generated: the frozen spec, sourced and declared
  numbers, the kit of parts and the budget projection.»
- On the main page, a bottom-left link «How it's built →» opens `/notes`; the `.back`
  link returns. Scope of this round is `/notes` only — the main page's speeds, corners,
  caption and hint are the owner's accepted-in-progress state, closed.

## 3. Verdict facts (already recorded; authority)

- The current `/notes` face (the light «quiet ledger» in the materials below) is
  **rejected twice as generic**; the recorded verdicts quote «it still looks generic»
  and «why it still looks generic».
- **The theme is DARK — the owner's ruling.** The light palette is dead inventory; its
  hues and token names are history, not premises for the new design.
- A rejected composition does not reject every technique it contained — but nothing in
  the verdicts preserves the current composition, and nothing forbids any device. The
  design decides its own devices from the facts and the taste law in §1.

## 4. Capability facts (buildable, with costs; capabilities only, never prescriptions)

- **Inline SVG elevation of the real generated facade.** A pure module over the solver's
  placements can serialize the actual south elevation — the real window slots, sections
  and portal the app ships — into inline SVG. Buildable by the orchestrator in about a
```
  day; deterministic and unit-testable; runs at load (the solver already runs at load on
  this page); costs JS bytes against the JS budget (the last bullet of this section).
- **Sticky table of contents.** Buildable in pure HTML/CSS. Cost ≈ trivial.
- **Content hierarchy** is re-arrangeable *within the existing strings*: re-group,
  re-order, promote, fold (HTML `<details>` exists). No new prose text. The block
  assembly lives in a pure view-model module (house style, §11); model-visible changes
  regenerate a parity fixture — an orchestrator cost of minutes.
- **Typography inventory** (the whole set; nothing else is on the site):
  - «WP Sans» — weights **400** and **500** (self-hosted IBM Plex Sans subsets, metric
    fallbacks declared);
  - «WP Serif» — weight **400** (self-hosted IBM Plex Serif subset, metric fallback
    declared);
  - a **system mono stack** is already declared (`--font-mono`: ui-monospace, SF Mono,
    Menlo, Consolas, …).
  - No other weights exist as files; heavier weights would be browser synthesis with
    unreliable metrics. The Plex digits measure uniform width at ~600/1000 em — tabular
    by default, aligned columns come free (the CSS may also set
    `font-variant-numeric: tabular-nums`; true `tnum`/`pnum` features are absent from
    the source files).
- **Dark ground and tokens: free.** The one hard condition: every text pair reads at
  WCAG contrast ≥ 4.5:1 on the dark ground — computed, not guessed. The gate covers
  every color pair that renders text or fills semantics (base, hover, focus, chip
  fills), at every viewport. State the computed ratios with your palette; the
  orchestrator re-computes and verifies.
- **JS budget headroom: ≈ 93 KB free** (total gate 350,000 B gzip; currently ≈ 257 KB
  shipped). CSS bytes are not in the JS gate. The Russian dictionary rides a separate
  lazy chunk with its own declared ceiling (12,000 B; ≈ 6.3 KB used) — untouched by a
  redesign that adds no strings.

## 5. Cost facts

- **New prose text is expensive**: the bilingual string corpus is ratified and pinned
  byte-for-byte; parity tests fail on any string change. Design within the existing
  strings — re-arrangement allowed (§4), wording not.
- **External raster images are expensive**: licensing plus the assets-as-code law (every
  committed binary must regenerate from a committed script). Deterministically generated
  SVG markup is cheap by contrast — it is code, like CSS.
- Everything listed under §4 is cheap or already budgeted.

## 6. Binding contract (hard gates the orchestrator enforces)

- **Semantics stay real**: real `<table>` for tables, `<dl>` for the number ledgers,
  real headings, one `<button>` toggle, `<a>` links. The DOM below the h1 is yours to
  reshape (the binding's render functions may change); the semantic level stays.
- **Test hooks survive**: every existing `data-*` hook and the binding's landpoints stay
  valid — `dataset.id` on `<dl>`/`<table>`/`<tr data-id>` blocks, `data-provenance` on
  chips, `data-level` on callouts, the heading anchor ids (`#shell #decor #south #kit
  #budget #siblings #sources`), `#notes` main, `.back`, `#lang-toggle`, the
  `meta[name=description]` rewrite target, the module `<script>` tag, and the
  `<noscript>` element (which keeps its static Russian sentence). Adding hooks is fine;
  removing them is not.
- **Viewport contract**: no clipping at 360 / 768 / 1280 CSS px, in both languages; full
  length of the page; only full-page pixel-strict fixtures gate this (an absolutely
  deterministic render). No entrance animation; transitions only, ≤ 240 ms,
  `prefers-reduced-motion` honored.
- **One CSS file** (`src/ui/notes.css`), imported by the binding. No frameworks, no CSS
  libraries, no external images, no animation libraries, no new fonts.
- **State law**: the re-render on a language switch is stateless — the whole page's
  content re-renders from scratch (the chrome row is rewritten too). The design's
  surfaces read identical across languages modulo content length (ru runs 20–35%
  longer), and consistent on every surface and state (the owner law).
- **Deep links**: sections anchor by id; in-page navigation from the anchors strip (or
  its replacement device, if you redesign it) must reach every section.

## 7. The DOM the binding renders

Static shell (RU before boot; the binding rewrites the shown strings per language):

- `<header class="page-head">` → `<a class="back" href="/">…</a>` + `<button
  id="lang-toggle" type="button">` — the toggle's label is the *target* language's
  script (`EN`/`RU`), its `aria-label` and `lang` attribute are maintained by a shared
  host module; you keep the element hooks, you may restyle both elements freely.
- `<main id="notes">` — render target (replaceChildren on each render).
- `<noscript>…</noscript>` after `<main>`; font preloads in `<head>`; the binding module
  script at the end of `<body>`. A «strict CSP later» note lives in the HTML — inline
  `style` attributes are tolerated today; a stylesheet-only design keeps that future
  change free.

Rendered into `#notes` (the verbatim render functions follow the sketch):

- `<h1>` (also written to `document.title`);
- `<nav class="anchors">` → `<ul role="list">` → `<li>` → `<a href="#id">` — one item per
  level-2 section, in page order;
- `<article class="notes-article">` — the blocks in page order:
  - paragraph → `<p>`;
  - legend → `<ul class="legend" role="list">` → `<li>` → `<span class="chip" data-provenance=…>`
    (the bare kind word) + `<span>` (the rest of the sentence);
  - numbers → `<dl class="numbers" data-id="…">` → `<div>` per row → `<dt>` (the label) +
    `<dd>` → `<span class="value">`, `<span class="unit">`, optionally `<span
    class="note">` (muted suffix: margins, pending-measurement), then `<span class="chip"
    data-provenance=… title=…>`;
  - table → `<div class="table-scroll" tabindex="0" role="region" aria-label=…>` →
    `<table data-id="…">` → optional `<caption>` + `<thead>` (one `th` row) + `<tbody>` →
    `<tr data-id=…>` → `<th scope="row">` (leading cell) + `<td class="num">` (numeric
    columns right-aligned) + chips riding specific cells;
  - callout → `<aside class="callout" data-level="note|warning|error">` → (warning:
    `<p class="callout-label">` — «Открытый вопрос» / "Open question") + `<p
    class="callout-text">`; the error card on solver failure keeps `data-level="error"`
    (contract failure);
  - links → `<nav class="links">` → `<ul role="list">` → `<li>` → `<a href rel="external">`.
- Chip payloads: sourced chips read «sourced · ⟨keys⟩» / «источник · ⟨ключи⟩», declared
  chips read «declared · ⟨register line⟩» / «принято · ⟨строка реестра⟩», derived chips
  are bare («derived» / «расчёт»); the `title` carries the full payload (keys, the
  register line, or the formula) as hover/AT text.

The current source of those render functions — the parts any DOM reshape touches
(verbatim, for reference):

```ts
// Which table cells a row's provenance chips attach to, by block id (the model's
// row.provenance order matches these indices; tables without an entry stay chip-free).
// The kit footer row folds the three totals (§3.4) and carries chips on its own cells.
const TABLE_CHIP_CELLS: Readonly<Record<string, readonly number[]>> = {
  'south.sections': [2, 3], // declaredAxes, declaredProtrusion
  rows: [2, 3], // module, declared head height
  order: [1], // the quoted fact
  'budget.allowance': [1], // the value
  siblings: [2], // declared axes total
  'kit.parts': [3], // part arithmetic column
};
const KIT_TOTAL_CHIP_CELLS: readonly number[] = [0, 1, 3]; // active parts, instances, ceiling
// §3.3: numeric columns right-align with tabular figures (the same indices as the chips).
const TABLE_NUMERIC_CELLS: Readonly<Record<string, readonly number[]>> = {
  'south.sections': [2, 3],
  rows: [3],
  'kit.parts': [1, 2, 3],
  'budget.allowance': [1],
};
function hinge(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className !== undefined) element.className = className;
  return element;
}
function singleton<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className !== undefined) element.className = className;
  element.textContent = text;
  return element;
}
function chipTitle(provenance: RowProvenance): string {
  if (provenance.kind === 'sourced') {
    return format(t('notes.chipTitleKeys'), { keys: provenance.keys.join(', ') });
  }
  if (provenance.kind === 'declared') {
    return format(t('notes.chipTitleRegister'), { licenseTitle: provenance.licenseTitle });
  }
  return provenance.formula;
}
// §3.1: the legend's bare kind words (the chip without its provenance payload).
const CHIP_WORD: Readonly<Record<RowProvenance['kind'], Key>> = {
  sourced: 'notes.chipWordSourced',
  declared: 'notes.chipWordDeclared',
  derived: 'notes.chipWordDerived',
};
function chipWord(kind: RowProvenance['kind']): string {
  return t(CHIP_WORD[kind]);
}
/** The legend's bare kind word in its tint (§3.1) — no provenance payload on the chip. */
function legendChip(kind: LegendItem['provenance']): HTMLElement {
  const chip = hinge('span', 'chip');
  chip.dataset.provenance = kind;
  chip.textContent = chipWord(kind);
  return chip;
}
/** 'sourced · wiki-en' chips; the colour word is data-provenance, styled in notes.css. */
function provenanceChip(provenance: RowProvenance): HTMLElement {
  const chip = hinge('span', 'chip');
  chip.dataset.provenance = provenance.kind;
  chip.title = chipTitle(provenance);
  const text =
    provenance.kind === 'sourced'
      ? format(t('notes.chipSourced'), { keys: provenance.keys.join(', ') })
      : provenance.kind === 'declared'
        ? format(t('notes.chipDeclared'), { licenseTitle: provenance.licenseTitle })
        : t('notes.chipDerived');
  chip.textContent = text;
  return chip;
}
function appendChips(cell: HTMLElement, provenances: readonly RowProvenance[]): void {
  for (const provenance of provenances) cell.append(provenanceChip(provenance));
}
function renderNumberRow(row: NumberRow, div: HTMLElement): void {
  const dt = singleton('dt', row.label);
  const dd = hinge('dd');
  dd.append(singleton('span', row.display, 'value'), singleton('span', row.unit, 'unit'));
  if (row.note !== undefined) dd.append(singleton('span', row.note, 'note'));
  div.append(dt, dd, provenanceChip(row.provenance)); // §3.3: label | value | chip
}
function renderTableRow(row: TableRow, tableId: string, body: HTMLElement): void {
  const tr = row.id === 'kit.total' ? hinge('tr', 'total') : document.createElement('tr');
  tr.dataset.id = row.id;
  const chipCells =
    row.id === 'kit.total' ? KIT_TOTAL_CHIP_CELLS : (TABLE_CHIP_CELLS[tableId] ?? []);
  const numericCells = TABLE_NUMERIC_CELLS[tableId] ?? [];
  row.cells.forEach((cell, index) => {
    const td = index === 0 ? document.createElement('th') : document.createElement('td');
    if (index === 0) td.scope = 'row'; // the leading cell names the row
    td.textContent = cell;
    if (numericCells.includes(index)) td.className = 'num';
    // Positional alignment: row.provenance[i] annotates cell chipCells[i].
    const chips: RowProvenance[] = [];
    if (row.provenance !== undefined) {
      row.provenance.forEach((provenance, position) => {
        if (chipCells[position] === index) chips.push(provenance);
      });
    }
    if (chips.length > 0) appendChips(td, chips);
    tr.append(td);
  });
  body.append(tr);
}
function renderBlock(block: NotesBlock, container: HTMLElement): void {
  switch (block.kind) {
    case 'heading': {
      const heading = singleton(`h${block.level}`, block.text);
      if (block.id !== undefined) heading.id = block.id;
      container.append(heading);
      break;
    }
    case 'paragraph':
      container.append(singleton('p', block.text));
      break;
    case 'legend': {
      // §3.1: the chip legend — each item opens with its chip. role="list": list-style:none
      // drops the list semantics in VoiceOver — restore it explicitly.
      const ul = hinge('ul', 'legend');
      ul.setAttribute('role', 'list');
      for (const item of block.items) {
        const li = hinge('li');
        li.append(legendChip(item.provenance), singleton('span', item.text));
        ul.append(li);
      }
      container.append(ul);
      break;
    }
    case 'list': {
      const ul = hinge('ul');
      for (const item of block.items) ul.append(singleton('li', item));
      container.append(ul);
      break;
    }
    case 'numbers': {
      const dl = hinge('dl', 'numbers');
      dl.dataset.id = block.id;
      for (const row of block.rows) {
        const item = hinge('div');
        renderNumberRow(row, item);
        dl.append(item);
      }
      container.append(dl);
      break;
    }
    case 'table': {
      // §3.3: the overflow container is keyboard-focusable so the table scrolls for AT too.
      const wrap = hinge('div', 'table-scroll');
      wrap.tabIndex = 0;
      wrap.setAttribute('role', 'region');
      if (block.caption !== undefined) wrap.setAttribute('aria-label', block.caption);
      const table = hinge('table');
      table.dataset.id = block.id;
      if (block.caption !== undefined) table.append(singleton('caption', block.caption));
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const column of block.columns) headerRow.append(singleton('th', column));
      head.append(headerRow);
      const body = hinge('tbody');
      for (const row of block.rows) {
        renderTableRow(row, block.id, body);
      }
      table.append(body);
      wrap.append(table);
      container.append(wrap);
      break;
    }
    case 'callout': {
      // §3.3: no box — the warning callout is the ochre «Открытый вопрос» label above the
      // paragraph, the note callout the same treatment in muted; the error card stays boxed
      // (the loud contract failure).
      const aside = hinge('aside', 'callout');
      aside.dataset.level = block.level;
      if (block.level === 'warning') {
        aside.append(singleton('p', t('notes.openQuestion'), 'callout-label'));
      }
      aside.append(singleton('p', block.text, 'callout-text'));
      container.append(aside);
      break;
    }
    case 'links': {
      const nav = hinge('nav', 'links');
      const ul = hinge('ul');
      ul.setAttribute('role', 'list'); // list-style:none drops the semantics — restore it
      for (const item of block.items) {
        const li = hinge('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.rel = 'external';
        a.textContent = item.label;
        li.append(a);
        ul.append(li);
      }
      nav.append(ul);
      container.append(nav);
      break;
    }
  }
}
function render(model: NotesModel): void {
  const root = document.querySelector('#notes');
  if (!(root instanceof HTMLElement)) throw new Error('#notes missing');
  document.title = model.title;
  const h1 = singleton('h1', model.title);
  const article = hinge('article', 'notes-article');
  for (const block of model.blocks) {
    // The H1 is already in the shell; the model re-emits it as the first block.
    if (block.kind === 'heading' && block.level === 1) continue;
    renderBlock(block, article);
  }
  // §3.1: the one-line anchor list of the section headings — navigation, not decoration.
  const anchors = hinge('nav', 'anchors');
  const anchorList = hinge('ul');
  anchorList.setAttribute('role', 'list'); // list-style:none drops the semantics — restore it
  for (const block of model.blocks) {
    if (block.kind !== 'heading' || block.level !== 2 || block.id === undefined) continue;
    const li = hinge('li');
    const a = document.createElement('a');
    a.href = `#${block.id}`;
    a.textContent = block.text;
    li.append(a);
    anchorList.append(li);
  }
  anchors.append(anchorList);
  root.replaceChildren(h1, anchors, article);
}
```

## 8. The content outline — sections in page order, with sample corpus strings

Block kinds in use today: heading / paragraph / legend / numbers / table / callout /
links (the binding also supports a plain `list` kind; the model emits none today).
Counts are facts of the current spec: five facade sections, four window rows, the
numbers below render from the frozen spec at every load.

1. **Intro** — h1 + 1 introductory paragraph + the three-kind legend.
   - EN h1 «How the south facade is built»; RU «Как устроен южный фасад».
   - EN intro: «Every number on this page is produced at load by the same pure solver
     the app runs over its frozen facade specification (decisions.md, DEC-004). It is
     not a survey. Three kinds of numbers are kept apart by the type system and labelled
     here:»
   - RU intro: «Каждое число на этой странице вычисляется при загрузке тем же чистым
     решателем, который приложение запускает над своей замороженной спецификацией фасада
     (decisions.md, DEC-004). Это не обмер. Три рода чисел разведены системой типов и
     помечены здесь:»
   - Legend sentences (the chip carries the bare kind word, the span carries the rest):
     EN «…carries an attribution key into ATTRIBUTIONS.md ("No line, no use").» / «…a
     photo-derived working target registered in docs/artistic-license.md; checked
     against measured elevation drawings during Phase 1 and corrected in both places if
     the record differs.» / «…solver arithmetic over sourced and declared inputs
     (docs/design-facade-grammar.md); recomputed on every load, never registered.»
     RU: «…число несёт ключ атрибуции в ATTRIBUTIONS.md ("нет строки — нет
     использования").» / «…рабочее целевое значение, снятое с фотографий и
     зарегистрированное в docs/artistic-license.md; на этапе 1 сверяется с обмерными
     чертежами фасадов и, если чертежи с ним расходятся, исправляется в обоих местах.» /
     «…вычислено решателем из чисел двух предыдущих родов
     (docs/design-facade-grammar.md); пересчитывается при каждой загрузке, никогда не
     регистрируется.»
2. **Shell** (id `shell`) — heading + paragraph + one numbers ledger, 12 sourced rows.
   EN heading «Shell», RU «Каре». EN intro: «Quadrangle numbers as the sources give
   them. Where two sources disagree both counts are kept, each under its own key.»
   Row labels sample: «North (Neva) facade length», «Windows, conservative
   count», «Windows, generous count», «Rooms, conservative count», «Rooms, generous
   count», «Staircases», «Height to the cornice», «Total height with roof band»,
   «Principal facade incl. roofline statuary», «Corners incl. every projection», «Roof
   statuary figures».
3. **Window, decor and order system** (id `decor`) — heading + paragraph + numbers
   ledger (6 sourced rows: window width modules, window types, surround types,
   sculptural decor types, capital varieties, cartouche kinds) + two tables:
   «Order system» (4 rows, fact/value; the quoted facts ride tokens: colonnade tiers,
   column arrangement, capital family, wall colour) and «Window rows, bottom to top»
   (4 rows: row, tier, module, declared head height in metres — per-language metric
   formatting).
4. **South elevation — Palace Square, west → east** (id `south`) — heading + one numbers
   ledger (5 rows: main facade line, crease line incl. risalit creases, declared working
   bay pitch — sourced; derived bay pitch, derived crease line — derived, each with its
   formula text) + a sections table (5 rows: section, kind, declared axes «±1»,
   declared protrusion, note — the notes are verbatim from the spec; kind tokens render
   per language) + a counts numbers ledger (5 derived rows: window axes, window slots,
   windows, portal void cells, column shafts) + the crease warning callout (see below).
5. **Instanced kit** (id `kit`) — heading + paragraph + a parts table: one row per
   placed part (part name, instances, triangle ceiling per instance, part total —
   derived arithmetic), plus a folded total row («Total — ⟨N⟩ active parts») carrying
   its own chips; kit slots with no placements are omitted.
6. **Budget projection** (id `budget`) — heading + numbers ledger (5 rows: facade draw
   calls, frame draw calls, frustum triangles, submitted triangle ceiling, JavaScript
   gzip — each derived with formula text; the first three carry muted margin suffixes
   «margin ⟨n⟩» / «запас ⟨n⟩»; the gzip row can render as an em dash with the muted note
   «pending CI measurement» / «ожидает замера в CI» while CI has not measured it) + a
   note callout (the contract ceilings and the policy sentence) + paragraph (what the
   scene allowance is) + the allowance table (4 declared rows: shadow passes, other
   frame draw calls, massing triangles, sky triangles).
7. **Sibling facades — not shipped in Phase 1** (id `siblings`) — heading + paragraph +
   one table (3 rows: north/west/east — id, sections-and-axes summary, declared axes
   total, one-word character per facade; the axis degrees-of-freedom language repeats).
8. **Sources and documents** (id `sources`) — heading + the links list (5 external
   repo-document links).
- The crease callout is the longest single string on the page; it renders under the
  south heading as a warning-level callout labelled «Открытый вопрос» / "Open
  question". EN (formatting slots `{specCrease}`/`{derivedCrease}` take the two
  lengths): «Crease line: the spec carries {specCrease} m (sourced — wiki-en "principal
  facade", citing Budberg, Great Palaces: The Winter Palace, 1969; the ru tradition
  reads the same edge as 210 m); the solver derives {derivedCrease} m from the main line
  and the declared risalit protrusions. The two sourced lengths most likely measure one
  street edge under different source conventions, not a plan line against a crease
  line; the declared axis rhythm (7 + 20 + 8 + 20 + 7) and the derived figure have no
  digitized attestation (literature hunt closed 2026-10-17). Settling it takes measured
  drawings — РГИА ф. 485, an Albertina scan, or Pilyavsky via НЭБ — so this warning
  stays live until then, with the spec and the artistic-license register ("Dimension
  approximations") corrected if the record differs.» The RU rendering carries the same
  content and runs longer, with NBSP typography.
- Derived-row formula texts (they currently surface as the chip `title` payloads) —
  the full EN set: «Σ declaredAxes over the five sections» · «main line + inner risalit
  creases from the declared protrusions (solver)» · «{length} m / {axes} axes» ·
  «{axes} axes × {rows} rows» · «windowSlots − portalVoidCells» · «slots displaced by
  the entrance and portal arches (solver)» · «Σ KIT.shaftCount × instances over column
  parts (solver)» · «kit {kit} + massing {massing} + sky {sky}» ·
  «frustumTriangles × (1 + {shadowPasses} shadow pass)» · «counts.byPart ×
  KIT.triangleCeiling» · «Σ over placed parts» · «Σ counts.byPart» · «parts with ≥ 1
  instance» · «CI gzip measurement passed through allowance.measuredJsGzipBytes» ·
  «projectBudget: instanced draws of the active parts over all passes» ·
  «facadeDrawCalls + {otherDraws} other draw calls».
- Failure state (only when the spec does not close): h1 «Facade notes unavailable» /
  «Примечания к фасаду недоступны» + the error card aside with «The facade spec does
  not close. {issues}» / «Спецификация фасада не сходится. {issues}».
- Headings in both languages (page order): Shell / «Каре» · Window, decor and order
  system / «Окна, декор и ордер» · South elevation — Palace Square, west → east /
  «Южный фасад — Дворцовая площадь, запад → восток» · Instanced kit / «Набор деталей» ·
  Budget projection / «Проекция бюджета» · Sibling facades — not shipped in Phase 1 /
  «Соседние фасады — не входят в Фазу 1» · Sources and documents / «Источники и
  документы». Table captions: Order system / «Ордерная система» · Window rows, bottom
  to top / «Ряды окон, снизу вверх» · Sections, west → east; notes verbatim from the
  frozen spec / «Секции, запад → восток; примечания — из замороженной спецификации» ·
  Scene allowance / «Резерв на сцену». Callout label: Open question / «Открытый
  вопрос». Back link: «← Дворцовая площадь» (RU) / «← Palace Square» (EN, with NBSP).

## 9. Verbatim material A — notes.html (current, byte-exact)
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Как генерируется южный фасад Зимнего дворца: замороженная спецификация, числа из источников и принятые значения, набор деталей и проекция бюджета."
    />
    <title>Как устроен южный фасад</title>
    <!-- §2.1: the three self-hosted faces preload on both pages; @font-face in src/fonts.css. -->
    <link rel="preload" href="/fonts/plex-sans-400.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/plex-sans-500.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/plex-serif-400.woff2" as="font" type="font/woff2" crossorigin />
  </head>
  <body>
    <!-- Pure DOM page — no WebGL, no scripts besides the model binding (strict CSP later).
         §1.5: the static shell is RU; the binding resolves ?lang= and re-renders for EN. -->
    <!-- §3.1: the header row — back link left, toggle right; static (no sticky elements). -->
    <header class="page-head">
      <a class="back" href="/">← Дворцовая площадь</a>
      <button id="lang-toggle" type="button" lang="en" aria-label="Русский">RU</button>
    </header>
    <main id="notes"></main>
    <noscript>Для чисел нужен JavaScript: при загрузке страница заново запускает решатель фасада.</noscript>
    <script type="module" src="/src/ui/notes-main.ts"></script>
  </body>
</html>
```

## 10. Verbatim material B — src/ui/notes.css (current, complete)

```css
/* /notes — the quiet annex of the Zimny scene. What this implements: one paper column in
   daylight tints lifted from the facade (pale-green wall, ochre dressing, white-night sky);
   hairline rules carry all structure and every rule spans the same content width; the serif
   is reserved for the front matter (H1, lede, section titles) and the sans for everything
   read as data; each number ledger is one subgrid — label | value | unit | note |
   provenance — so columns align across rows; colour is spent on exactly one thing,
   provenance: sourced = green fill, declared = ochre fill, derived = outlined (hue AND shape
   differ). Contrast on --paper (WCAG, computed): ink 15.6:1, ink-2 5.9:1, green 7.0:1
   (6.1:1 on its tint), ochre 6.0:1 (5.2:1 on its tint), error 6.7:1. Fonts: src/fonts.css
   defines --font-sans (WP Sans 400/500) and --font-serif (WP Serif 400); no other faces are
   used. Single breakpoint: 768 px, declared once at the end; it only re-tokens and lays out
   the desktop ledger. No state, no runtime styles, no !important. */
:root {
  color-scheme: light;
  /* paper and ink */
  --paper: #f7f8f7;
  --ink: #1b1f1d;
  --ink-2: #5b625e;
  --rule: #d9ddda;
  --rule-strong: var(--ink);
  /* provenance — the only chromatic tokens on the page */
  --sourced: #2f5f43;
  --sourced-tint: #e3ece6;
  --declared: #7a5a14;
  --declared-tint: #f3e8cf;
  --error: #9b3626;
  /* type */
  --sans: var(--font-sans, system-ui, sans-serif);
  --serif: var(--font-serif, Georgia, serif);
  --fs-label: 12px;
  --lh-label: 16px;
  --fs-small: 13px;
  --lh-small: 20px;
  --fs-data: 15px;
  --lh-data: 22px;
  --fs-body: 16px;
  --lh-body: 26px;
  --fs-lede: 19px;
  --lh-lede: 30px;
  --fs-h2: 21px;
  --lh-h2: 28px;
  --fs-h1: 28px;
  --lh-h1: 34px;
  --w-regular: 400;
  --w-medium: 500;
  --track-label: 0.06em;
  --track-chip: 0.01em;
  --track-title: -0.01em;
  --underline-offset: 0.15em;
  --measure: 64ch;
  /* space — a 4 px scale */
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-5: 24px;
  --s-6: 32px;
  --s-7: 48px;
  --s-8: 64px;
  --s-9: 96px;
  --gutter: var(--s-5);
  --section-gap: var(--s-7);
  --column: 784px;
  /* lines, corners, motion */
  --hair: 1px;
  --ring: 2px;
  --radius: 2px;
  --dur: 160ms;
}

/* ---- base ------------------------------------------------------------------------------ */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: var(--paper);
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100%;
  color: var(--ink);
  background: var(--paper);
  font-family: var(--sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
}

:focus-visible {
  outline: var(--ring) solid var(--ink);
  outline-offset: var(--ring);
}

a,
button {
  transition:
    color var(--dur),
    border-color var(--dur),
    text-decoration-color var(--dur);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur: 0ms;
  }
}

/* The column: width, not padding, so every rule drawn by a block spans exactly the content. */
.page-head,
main,
body > noscript {
  width: min(100% - 2 * var(--gutter), var(--column));
  margin-inline: auto;
}

/* ---- header ---------------------------------------------------------------------------- */

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding-block: var(--s-4);
  border-bottom: var(--hair) solid var(--rule);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
}

.back {
  color: var(--ink-2);
  text-decoration: none;
}

.back:hover {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: var(--underline-offset);
}

#lang-toggle {
  appearance: none;
  margin: 0;
  padding: var(--s-1) var(--s-2);
  border: var(--hair) solid var(--rule);
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
  font: inherit;
  font-weight: var(--w-medium);
  letter-spacing: var(--track-label);
  color: var(--ink-2);
}

#lang-toggle:hover {
  color: var(--ink);
  border-color: var(--ink);
}

/* ---- type ------------------------------------------------------------------------------ */

h1,
h2 {
  margin: 0;
  font-family: var(--serif);
  font-weight: var(--w-regular);
  letter-spacing: var(--track-title);
  text-wrap: balance;
}

h1 {
  font-size: var(--fs-h1);
  line-height: var(--lh-h1);
}

h2 {
  padding-top: var(--s-5);
  border-top: var(--hair) solid var(--rule);
  font-size: var(--fs-h2);
  line-height: var(--lh-h2);
  scroll-margin-top: var(--s-5);
}

p {
  margin: 0;
  max-width: var(--measure);
  hyphens: auto;
  text-wrap: pretty;
}

/* The lede: the one paragraph set in the serif — the intro opens the article, right under
   the title (the anchors strip sits between them in the DOM; :first-child is the intro). */
.notes-article > p:first-child {
  font-family: var(--serif);
  font-size: var(--fs-lede);
  line-height: var(--lh-lede);
}

a {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: var(--hair);
  text-decoration-color: var(--ink-2);
  text-underline-offset: var(--underline-offset);
}

a:hover {
  text-decoration-color: currentColor;
}

/* ---- anchors --------------------------------------------------------------------------- */

nav.anchors {
  padding-top: var(--s-3);
  border-top: var(--hair) solid var(--rule);
}

nav.anchors ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-5);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-small);
  line-height: var(--lh-small);
}

nav.anchors a {
  color: var(--ink-2);
  text-decoration: none;
}

nav.anchors a:hover {
  color: var(--ink);
  text-decoration: underline;
}

/* ---- main flow ------------------------------------------------------------------------- */

main {
  padding-block: var(--s-7) var(--s-9);
}

.notes-article > * + * {
  margin-top: var(--s-5);
}

.notes-article > p + p {
  margin-top: var(--s-4);
}

.notes-article > nav.anchors {
  margin-top: var(--s-6);
}

.notes-article > h2 {
  margin-top: var(--section-gap);
}

.notes-article > h2 + * {
  margin-top: var(--s-4);
}

/* ---- legend ---------------------------------------------------------------------------- */

ul.legend {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: var(--s-3);
  row-gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-data);
  line-height: var(--lh-data);
}

ul.legend li {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: var(--s-3);
  align-items: baseline;
}

/* Subgrid aligns the legend's chip column across items (the fallback above stands alone). */
@supports (grid-template-columns: subgrid) {
  ul.legend li {
    grid-template-columns: subgrid;
  }
}

/* ---- provenance chips ------------------------------------------------------------------ */

.chip {
  display: inline-block;
  max-width: 100%;
  padding: 0 var(--s-2);
  border: var(--hair) solid transparent;
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: var(--w-medium);
  letter-spacing: var(--track-chip);
  white-space: normal;
  text-align: left;
  vertical-align: baseline;
}

.chip[data-provenance="sourced"] {
  color: var(--sourced);
  background: var(--sourced-tint);
  border-color: var(--sourced-tint);
}

.chip[data-provenance="declared"] {
  color: var(--declared);
  background: var(--declared-tint);
  border-color: var(--declared-tint);
}

.chip[data-provenance="derived"] {
  color: var(--ink-2);
  border-color: currentColor;
}

/* ---- number ledger (mobile-first: label line, then value left / chip right) ------------ */

dl.numbers {
  margin: 0;
  border-top: var(--hair) solid var(--rule-strong);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-variant-numeric: tabular-nums;
}

dl.numbers > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, max-content);
  grid-template-areas:
    "label label"
    "value chip";
  column-gap: var(--s-4);
  row-gap: var(--s-1);
  align-items: baseline;
  padding-block: var(--s-3);
  border-bottom: var(--hair) solid var(--rule);
}

dl.numbers dt {
  grid-area: label;
  min-width: 0;
  overflow-wrap: break-word;
  hyphens: auto;
}

dl.numbers dd {
  grid-area: value;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-1);
  margin: 0;
  min-width: 0;
}

dl.numbers > div > .chip {
  grid-area: chip;
  justify-self: end;
}

.unit,
.note {
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  color: var(--ink-2);
}

.note {
  padding-left: var(--s-1);
}

/* ---- tables ---------------------------------------------------------------------------- */

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  margin: 0;
  border-collapse: collapse;
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-variant-numeric: tabular-nums;
}

caption {
  padding-bottom: var(--s-2);
  text-align: left;
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: var(--w-medium);
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--ink);
}

th,
td {
  padding: var(--s-2) var(--s-3);
  border-bottom: var(--hair) solid var(--rule);
  text-align: left;
  vertical-align: top;
}

th:first-child,
td:first-child {
  padding-left: 0;
}

th:last-child,
td:last-child {
  padding-right: 0;
}

thead th {
  vertical-align: bottom;
  border-bottom-color: var(--rule-strong);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: var(--w-medium);
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--ink-2);
}

tbody th {
  font-weight: var(--w-medium);
  white-space: nowrap;
}

.num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

tbody tr.total th,
tbody tr.total td {
  border-top: var(--hair) solid var(--rule-strong);
  border-bottom: 0;
  font-weight: var(--w-medium);
}

/* ---- callouts -------------------------------------------------------------------------- */

aside.callout {
  max-width: var(--measure);
  padding-block: var(--s-4);
  border-top: var(--hair) solid var(--rule);
  border-bottom: var(--hair) solid var(--rule);
}

.callout-label {
  margin: 0 0 var(--s-1);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: var(--w-medium);
  letter-spacing: var(--track-label);
  text-transform: uppercase;
  color: var(--declared);
}

.callout-text {
  margin: 0;
  font-size: var(--fs-data);
  line-height: var(--lh-data);
}

aside.callout[data-level="note"] {
  padding-block: 0;
  border: 0;
}

aside.callout[data-level="note"] .callout-text {
  color: var(--ink-2);
}

aside.callout[data-level="error"] {
  border-color: var(--error);
}

aside.callout[data-level="error"] .callout-label {
  color: var(--error);
}

/* ---- sources --------------------------------------------------------------------------- */

nav.links ul {
  display: grid;
  gap: var(--s-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-data);
  line-height: var(--lh-data);
}

/* ---- noscript -------------------------------------------------------------------------- */

body > noscript {
  display: block;
  padding-block: var(--s-6);
  color: var(--ink-2);
}

/* ---- the one breakpoint ---------------------------------------------------------------- */

@media (min-width: 768px) {
  :root {
    --gutter: var(--s-7);
    --section-gap: var(--s-8);
    --fs-h1: 36px;
    --lh-h1: 42px;
    --fs-h2: 24px;
    --lh-h2: 32px;
  }

  /* The ledger becomes one grid: label | value | unit | note | provenance. */
  dl.numbers {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content max-content max-content minmax(0, max-content);
  }

  /* Fallback row (no subgrid): three independent columns per row. */
  dl.numbers > div {
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) max-content minmax(0, max-content);
    grid-template-areas: none;
    column-gap: var(--s-2);
    row-gap: 0;
  }

  dl.numbers dt,
  dl.numbers dd,
  dl.numbers > div > .chip {
    grid-area: auto;
  }

  dl.numbers dt {
    padding-right: var(--s-4);
  }

  dl.numbers dd {
    justify-self: end;
    flex-wrap: nowrap;
  }

  dl.numbers > div > .chip {
    justify-self: start;
    margin-left: var(--s-3);
  }

  @supports (grid-template-columns: subgrid) {
    dl.numbers > div {
      grid-template-columns: subgrid;
    }

    dl.numbers dt {
      grid-column: 1;
    }

    dl.numbers dd {
      grid-column: 2 / 5;
      display: grid;
      grid-template-columns: subgrid;
      column-gap: var(--s-1);
      align-items: baseline;
      justify-self: stretch;
    }

    dl.numbers .value {
      grid-column: 1;
      justify-self: end;
    }

    dl.numbers .unit {
      grid-column: 2;
    }

    dl.numbers .note {
      grid-column: 3;
    }

    dl.numbers > div > .chip {
      grid-column: 5;
    }
  }
}
```

## 11. House style (binds every code file you emit; CSS conventions included)

- A leading block comment in each file stating what it implements (the incumbent files
  carry one; keep the habit).
- TypeScript: named exports only, no default exports; no enums; `satisfies` over `as`
  where a literal object is typed; `import type` for type-only imports; strict TS —
  `noUncheckedIndexedAccess` (index access yields `T | undefined` — handle it),
  `exactOptionalPropertyTypes` (use `| null`, never optional-undefined),
  `noUnusedLocals/Parameters`; biome formatting — single quotes, space indent, lines
  ≤ 100. The binding file (`src/ui/notes-main.ts`) is the DOM-side module; the pure
  view-model (`src/ui/notes-view.ts`) is DOM-free, clock-free, randomness-free — if the
  hierarchy move touches its assembly functions, emit only those functions and keep it
  pure. All strings inside code travel through `t(key)`/`format(...)` exactly as the
  current functions do; never hard-code user-visible text.
- CSS: tokens declared once in `:root`; no `!important`; no framework conventions
  (BEM-style class names are the incumbent habit but not a law). Breakpoint count and
  strategy are yours. Motion only as declared short transitions.
- Tests live in `tests/` and are written/adapted by the orchestrator — do not emit test
  code; DO state which hooks/classes your design leans on (in the memo or challenges)
  so the adapter knows what to pin.

## 12. Numbers under transport

The transport between the orchestrator and this chat may mask digit runs in pasted
material. If a value you must reproduce arrives masked, emit
`MASKED-IN-BRIEF: keep the <name> value` in its place and never guess. Prefer a design
that depends on no masked incumbent values: your palette, type scale and spacing are
your own decisions; the numbers you emit are exact numbers you chose, and the contrasts
you state are computed, not guessed.

## 13. Forbidden (per-round fence)

- No new prose text anywhere: no wording edits, no renaming, no «one extra sentence» —
  every user-visible string stays dictionary-supplied through the existing keys. Text-free
  markup and potentially re-ordered/re-grouped existing strings are the design surface.
- The three provenance kinds must stay distinguishable wherever they appear (legend,
  every chip, the legend items) — the representation is yours, the distinguishability
  is law.
- No frameworks, no CSS libraries, no raster/external images, no animation libraries, no
  new font files, no inline `<script>`. Transitions ≤ 240 ms; no entrance animation;
  `prefers-reduced-motion` honored.
- Do not touch the main scene page or its chrome (closed scope), and do not redesign the
  dictionary module, the locale law, or the shared language host — those are the
  binding's, and their contracts are stated in §6.
- Do not emit numbers you did not compute (palette contrasts) and do not design around
  masked incumbent values.

## 14. Output contract

Reply in English. Order of the reply:

- A **DESIGN MEMO** first (compact; the orchestrator uses it to integrate and to brief
  the layout fixtures): the direction you chose and the devices that carry it, stated in
  your own words; the palette as a table of pairs with computed WCAG ratios (ground ×
  text, ground × muted, chip fills × their text, accents × ground) covering base, hover
  and focus states; the responsive model (what changes between 360, 768 and 1280); the
  type scale; the document order you settled on; how the RU runs (20–35% longer) are
  laid out without clipping.
- Then numbered fenced code blocks, one per file, one rationale line above each:
  1. `src/ui/notes.css` — **complete** file, ready to replace the incumbent;
  2. `notes.html` — **complete** file; if byte-identical to material A, emit the single
     line `UNCHANGED` instead of the body;
  3. the **changed function bodies** of `src/ui/notes-main.ts` (complete function text
     per function, changed ones only; emit `CHANGED-NONE` if none) — and, only if the
     block assembly moves, the changed functions of `src/ui/notes-view.ts`;
  4. **CHALLENGES** bullets — where your design might fail (viewport, RU lengths,
     contrast, the frozen string corpus, the hooks), and what you considered and
     rejected, with the reason.
- Reply budget is ~450 lines. Cut at a file boundary; if a standing file does not fit a
  single reply, end the complete file, then write `TRUNCATED-HERE: <next file>` and
  stop — the orchestrator opens a continuation. Never cut mid-file; compress your CSS by
  design hygiene (shared tokens, no duplication) rather than by truncation.

Standing line, part of the contract: before answering, challenge key assumptions,
consider a credible alternative, and check likely failure cases; give the requested
output with concise rationale and any material uncertainties.
