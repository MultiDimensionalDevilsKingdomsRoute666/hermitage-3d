// /notes DOM binding gate — tests/notes-dom.test.ts
// A minimal DOM stub (no jsdom dependency): the binding is exercised for real, and the
// test asserts block coverage plus chip alignment. Visual styling stays untested.
import { beforeAll, describe, expect, it } from 'vitest';

// The binding guards `root instanceof HTMLElement`, so the stub elements subclass a
// global HTMLElement. Other element classes are typing-only, never runtime-checked.
class StubElement {
  tag: string;
  className = '';
  dataset: Record<string, string> = {};
  title = '';
  textContent: string | undefined;
  scope: string | undefined;
  href: string | undefined;
  rel: string | undefined;
  children: StubElement[] = [];
  constructor(tag: string) {
    this.tag = tag;
  }
  append(...kids: unknown[]): void {
    for (const kid of kids) {
      if (kid !== undefined && kid !== null) this.children.push(kid as StubElement);
    }
  }
}
const root = new StubElement('main');
const documentStub = {
  createElement: (tag: string): StubElement => {
    const node = new StubElement(tag);
    return node;
  },
  title: '',
  querySelector: (selector: string): StubElement | null => (selector === '#notes' ? root : null),
};

beforeAll(async () => {
  (globalThis as { document: unknown }).document = documentStub;
  (globalThis as { HTMLElement: unknown }).HTMLElement = StubElement;
  await import('../src/ui/notes-main');
});

/** Descendants of one node, first occurrence only (creates share graph positions). */
function descendants(node: StubElement, seen = new Set<StubElement>()): StubElement[] {
  const out: StubElement[] = [];
  for (const child of node.children) {
    if (seen.has(child)) continue;
    seen.add(child);
    out.push(child, ...descendants(child, seen));
  }
  return out;
}
const all = (): StubElement[] => descendants(root);
const textOf = (node: StubElement | undefined): string =>
  node === undefined
    ? ''
    : descendants(node)
        .map((child) => child.textContent ?? '')
        .join('');
const block = (id: string): StubElement | undefined => all().find((node) => node.dataset.id === id);
const rowsOf = (id: string): StubElement[] => {
  const holder = block(id);
  if (holder === undefined) return [];
  const body = holder.children.filter((node) => node.tag === 'tbody')[0];
  return (body ?? holder).children;
};

describe('/notes DOM binding', () => {
  it('renders headings, blocks and the model title', () => {
    expect(documentStub.title).toBe('How the south facade is built');
    expect(all().filter((node) => node.tag === 'h1')).toHaveLength(1);
    expect(
      all()
        .filter((node) => node.tag === 'h2')
        .map((node) => node.textContent),
    ).toEqual([
      'Shell',
      'Window, decor and order system',
      'South elevation — Palace Square, west → east',
      'Instanced kit',
      'Budget projection',
      'Sibling facades — not shipped in Phase 1',
    ]);
    expect(all().some((node) => node.tag === 'aside' && node.dataset.level === 'warning')).toBe(
      true,
    );
    expect(all().filter((node) => node.tag === 'nav')).toHaveLength(1);
    expect(all().filter((node) => node.tag === 'a' && node.rel === 'external')).toHaveLength(5);
  });

  it('aligns provenance chips to their cells and leaves bare rows chip-free', () => {
    for (const row of rowsOf('south.sections')) {
      const cells = row.children;
      cells.forEach((cell, index) => {
        const chips = descendants(cell).filter((node) => node.tag === 'span');
        expect(chips).toHaveLength(index === 2 || index === 3 ? 1 : 0);
      });
    }
    // Order rows carry a declared chip on the value cell; the wall-colour row is bare.
    expect(
      rowsOf('order').map((row) => {
        const last = row.children.at(-1);
        return descendants(last ?? new StubElement('div')).filter((n) => n.tag === 'span').length;
      }),
    ).toEqual([1, 1, 1, 0]);
  });

  it('number rows render display values with chips, never fake numbers', () => {
    const budget = rowsOf('budget.projection');
    expect(budget).toHaveLength(5);
    expect(textOf(budget.at(-1))).toContain('measured: pending CI measurement');
    for (const row of budget) {
      expect(descendants(row).some((node) => node.tag === 'span')).toBe(true);
    }
  });
});
