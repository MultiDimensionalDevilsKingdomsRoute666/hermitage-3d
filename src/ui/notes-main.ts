// /notes DOM binding — src/ui/notes-main.ts
// Renders the pure view-model (notes-view.ts) into #notes and adds layout only, no
// numbers of its own: every displayed value and provenance chip comes from the model.
// Language law (design-i18n-notes.md §1.1/§1.2, DEC-020): the static HTML is RU; the
// binding resolves the language (?lang= → the persisted zimny:lang → RU), awaits the
// dictionary before the FIRST render (the static RU content covers the chunk fetch) and
// re-renders on every switch — the page is stateless and cheap (§1.2).
import { type Key, t } from '../i18n';
import { format } from '../i18n/format';
import { activateLang, activeLang, onLangChange, resolveLang } from '../i18n/locale';
import {
  bindLangToggle,
  clearStoredLang,
  currentQueryLang,
  readStoredLang,
  setLangParam,
  writeStoredLang,
} from './lang-host';
import { SVG_NS, southElevationSvg } from './notes-elevation';
import type {
  LegendItem,
  NotesBlock,
  NotesModel,
  NumberRow,
  RowProvenance,
  TableRow,
} from './notes-view';
import { buildSouthNotesModel } from './notes-view';
import '../fonts.css';
import './notes.css';

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
  // The night-elevation round (r26.2): a derived row shows its arithmetic — the formula
  // as a visible second <dd> (the same string the chip carries as its title; no new text).
  if (row.provenance.kind === 'derived') {
    div.append(singleton('dd', row.provenance.formula, 'formula'));
  }
}
/**
 * The frieze under the H1: the pure elevation module hands over the SVG of the real
 * generated south facade; the binding only wraps it and names it with the south heading
 * (an existing string — no new text). Null (module absent, or the spec did not close) →
 * no figure; the page stands without the frieze.
 */
function elevationFigure(model: NotesModel, svg: SVGSVGElement | null): HTMLElement | null {
  if (svg === null) return null;
  const south = model.blocks.find(
    (block) => block.kind === 'heading' && block.level === 2 && block.id === 'south',
  );
  svg.setAttribute('role', 'img');
  if (south !== undefined && south.kind === 'heading') {
    svg.setAttribute('aria-label', south.text);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  const figure = hinge('figure', 'elevation');
  figure.append(svg);
  return figure;
}
/** The elevation's SVG element, or null — the frieze never breaks the page. */
function elevationSvgElement(): SVGSVGElement | null {
  try {
    const elevation = southElevationSvg();
    if (elevation === null) return null;
    if (typeof document.createElementNS !== 'function') return null;
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (!(svg instanceof SVGSVGElement)) return null;
    svg.setAttribute('viewBox', elevation.viewBox);
    svg.innerHTML = elevation.body;
    return svg;
  } catch {
    return null;
  }
}
function renderTableRow(
  row: TableRow,
  tableId: string,
  columns: readonly string[],
  body: HTMLElement,
): void {
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
    // The ≤767 block-table pattern (notes.css): each cell prefixes its column head —
    // the same dictionary string, no new text (F010/F011: no collapsed chips, no scroll).
    if (index > 0) td.dataset.label = columns[index] ?? '';
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
        renderTableRow(row, block.id, block.columns, body);
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
function render(model: NotesModel, elevation: () => SVGSVGElement | null): void {
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
  // §3.1: the anchor list of the section headings — navigation, not decoration (the rail
  // at ≥ 1024 px, an inline strip below; notes.css).
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
  // Document order (the r26.2 night elevation): title, the frieze, the anchors, the
  // ledger. The factory runs on every render, so the language switch rebuilds the
  // frieze with everything else — the re-render stays stateless.
  const figure = elevationFigure(model, elevation());
  const children = figure === null ? [h1, anchors, article] : [h1, figure, anchors, article];
  root.replaceChildren(...children);
}
// ---------------------------------------------------------------------------
// Language law — the host side (§1.1/§1.2): the storage and the URL belong to lang-host;
// the resolution and the dictionary switch live in the pure locale module.
// ---------------------------------------------------------------------------
/** §1.2: the chrome rows the binding owns on this page — <html lang>, the meta
 * description, the back link and the toggle's own labels; the <title> rides the model
 * render. The static shell is RU — every chrome string flips with the dictionary. */
function applyChrome(): void {
  document.documentElement.lang = activeLang();
  const description = document.querySelector('meta[name="description"]');
  if (description !== null) description.setAttribute('content', t('chrome.descriptionNotes'));
  const back = document.querySelector('.back');
  if (back !== null) back.textContent = t('chrome.backLink');
}
async function boot(): Promise<void> {
  const resolution = resolveLang({
    queryLang: currentQueryLang(),
    storedLang: readStoredLang(),
    det: false, // /notes has no deterministic mode — no canvas to freeze
    navigation: false,
  });
  if (resolution.override.kind === 'write') writeStoredLang(resolution.override.lang);
  if (resolution.override.kind === 'clear') clearStoredLang();
  await activateLang(resolution.lang);
  const elevation = (): SVGSVGElement | null => elevationSvgElement();
  const rerender = (): void => {
    const result = buildSouthNotesModel({ lang: activeLang() });
    if (result.ok) {
      render(result.model, elevation);
      for (const warning of result.warnings) console.warn(`zimny: ${warning.message}`);
    } else {
      render(
        {
          title: t('notes.errorTitle'),
          blocks: [
            {
              kind: 'callout',
              id: 'error',
              level: 'error',
              text: format(t('notes.errorIntro'), {
                issues: result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' · '),
              }),
            },
          ],
        },
        elevation,
      );
    }
    applyChrome();
  };
  rerender();
  onLangChange(rerender);
  bindLangToggle((target) => {
    setLangParam(target);
    writeStoredLang(target);
    void activateLang(target);
  });
}
// The test gate awaits this: the first render happens behind the dictionary activation.
export const notesReady: Promise<void> = boot();
