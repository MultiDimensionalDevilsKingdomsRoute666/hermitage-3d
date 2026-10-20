// /notes DOM binding — src/ui/notes-main.ts
// Renders the pure view-model (notes-view.ts) into #notes and adds layout only, no
// numbers of its own: every displayed value and provenance chip comes from the model.
// Language law (design-i18n-notes.md §1.1/§1.2, DEC-020): the static HTML is RU; the
// binding resolves the language (?lang= → the persisted zimny:lang → RU), awaits the
// dictionary before the FIRST render (the static RU content covers the chunk fetch) and
// re-renders on every switch — the page is stateless and cheap (§1.2).
import { t } from '../i18n';
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
import type { NotesBlock, NotesModel, NumberRow, RowProvenance, TableRow } from './notes-view';
import { buildSouthNotesModel } from './notes-view';
import '../fonts.css';
import './notes.css';

// Which table cells a row's provenance chips attach to, by block id (the model's
// row.provenance order matches these indices; tables without an entry stay chip-free).
const TABLE_CHIP_CELLS: Readonly<Record<string, readonly number[]>> = {
  'south.sections': [2, 3], // declaredAxes, declaredProtrusion
  rows: [2, 3], // module, declared head height
  order: [1], // the quoted fact
  'budget.allowance': [1], // the value
  siblings: [2], // declared axes total
  'kit.parts': [3], // part arithmetic column
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
  dd.append(provenanceChip(row.provenance));
  div.append(dt, dd);
}
function renderTableRow(row: TableRow, chipCells: readonly number[], body: HTMLElement): void {
  const tr = row.id === 'kit.total' ? hinge('tr', 'total') : document.createElement('tr');
  tr.dataset.id = row.id;
  row.cells.forEach((cell, index) => {
    const td = index === 0 ? document.createElement('th') : document.createElement('td');
    if (index === 0) td.scope = 'row'; // the leading cell names the row
    td.textContent = cell;
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
    case 'heading':
      container.append(singleton(`h${block.level}`, block.text));
      break;
    case 'paragraph':
      container.append(singleton('p', block.text));
      break;
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
      const table = hinge('table');
      table.dataset.id = block.id;
      if (block.caption !== undefined) table.append(singleton('caption', block.caption));
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const column of block.columns) headerRow.append(singleton('th', column));
      head.append(headerRow);
      const body = hinge('tbody');
      for (const row of block.rows) {
        renderTableRow(row, TABLE_CHIP_CELLS[block.id] ?? [], body);
      }
      table.append(body);
      container.append(table);
      break;
    }
    case 'callout': {
      // Callout chips: no numbers row, the text already embeds values.
      const aside = hinge('aside', 'callout');
      aside.dataset.level = block.level;
      aside.textContent = block.text;
      container.append(aside);
      break;
    }
    case 'links': {
      const nav = hinge('nav', 'links');
      const ul = hinge('ul');
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
  root.replaceChildren(h1, article);
}
// ---------------------------------------------------------------------------
// Language law — the host side (§1.1/§1.2): the storage and the URL belong to lang-host;
// the resolution and the dictionary switch live in the pure locale module.
// ---------------------------------------------------------------------------
/** §1.2: the chrome rows the binding owns on this page — <html lang>, the meta
 * description and the toggle's own labels; the <title> rides the model render. */
function applyChrome(): void {
  document.documentElement.lang = activeLang();
  const description = document.querySelector('meta[name="description"]');
  if (description !== null) description.setAttribute('content', t('chrome.descriptionNotes'));
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
  const rerender = (): void => {
    const result = buildSouthNotesModel({ lang: activeLang() });
    if (result.ok) {
      render(result.model);
      for (const warning of result.warnings) console.warn(`zimny: ${warning.message}`);
    } else {
      render({
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
      });
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
