// /notes DOM binding — src/ui/notes-main.ts
// Renders the pure view-model (notes-view.ts) into #notes and adds layout only, no
// numbers of its own: every displayed value and provenance chip comes from the model.

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
  if (provenance.kind === 'sourced') return `keys: ${provenance.keys.join(', ')}`;
  if (provenance.kind === 'declared') return `register line: ${provenance.licenseTitle}`;
  return provenance.formula;
}
/** 'sourced · wiki-en' chips; the colour word is data-provenance, styled in notes.css. */
function provenanceChip(provenance: RowProvenance): HTMLElement {
  const chip = hinge('span', 'chip');
  chip.dataset.provenance = provenance.kind;
  chip.title = chipTitle(provenance);
  const text =
    provenance.kind === 'sourced'
      ? `sourced · ${provenance.keys.join(', ')}`
      : provenance.kind === 'declared'
        ? `declared · ${provenance.licenseTitle}`
        : 'derived';
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
      table.append(head);
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
  root.append(h1, article);
}
const result = buildSouthNotesModel();
if (!result.ok) {
  render({
    title: 'Facade notes unavailable',
    blocks: [
      {
        kind: 'callout',
        id: 'error',
        level: 'error',
        text: `The facade spec does not close. ${result.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join(' · ')}`,
      },
    ],
  });
} else {
  render(result.model);
  for (const warning of result.warnings) console.warn(`zimny: ${warning.message}`);
}
