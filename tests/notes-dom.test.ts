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
  attributes: Record<string, string> = {};
  title = '';
  textContent: string | undefined;
  scope: string | undefined;
  href: string | undefined;
  rel: string | undefined;
  id: string | undefined;
  innerHTML = '';
  children: StubElement[] = [];
  constructor(tag: string) {
    this.tag = tag;
  }
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }
  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
  append(...kids: unknown[]): void {
    for (const kid of kids) {
      if (kid !== undefined && kid !== null) this.children.push(kid as StubElement);
    }
  }
  replaceChildren(...kids: unknown[]): void {
    this.children.length = 0; // the re-render is idempotent (the language switch re-renders)
    this.append(...kids);
  }
}
const root = new StubElement('main');
const documentStub = {
  documentElement: new StubElement('html'),
  createElement: (tag: string): StubElement => {
    const node = new StubElement(tag);
    return node;
  },
  // The elevation frieze's shell (the night-elevation round): the stub ignores the
  // namespace — the parameter stays for the real signature.
  createElementNS: (_ns: string, tag: string): StubElement => {
    const node = new StubElement(tag);
    return node;
  },
  title: '',
  querySelector: (selector: string): StubElement | null => (selector === '#notes' ? root : null),
};

beforeAll(async () => {
  (globalThis as { document: unknown }).document = documentStub;
  (globalThis as { HTMLElement: unknown }).HTMLElement = StubElement;
  (globalThis as { HTMLButtonElement: unknown }).HTMLButtonElement = StubElement;
  (globalThis as { SVGSVGElement: unknown }).SVGSVGElement = StubElement;
  // The binding's boot resolves the language per §1.1 — the stub navigation pins ?lang=en
  // explicitly (the design's e2e rule: no spec relies on the default or on storage).
  (globalThis as { location: unknown }).location = {
    hash: '#?lang=en',
    pathname: '/notes.html',
    search: '',
  };
  const binding = await import('../src/ui/notes-main');
  await binding.notesReady; // the first render happens behind the dictionary activation
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
      'Sources and documents',
    ]);
    expect(all().some((node) => node.tag === 'aside' && node.dataset.level === 'warning')).toBe(
      true,
    );
    // Two navs: the §3.1 anchor list and the footer links block.
    expect(all().filter((node) => node.tag === 'nav')).toHaveLength(2);
    expect(all().filter((node) => node.tag === 'a' && node.rel === 'external')).toHaveLength(5);
  });

  it('renders the anchor list over the section ids and the chip legend', () => {
    const anchors = all().find((node) => node.tag === 'nav' && node.className === 'anchors');
    expect(anchors).toBeDefined();
    const hrefs = descendants(anchors ?? new StubElement('nav'))
      .filter((node) => node.tag === 'a')
      .map((node) => node.href);
    expect(hrefs).toEqual([
      '#shell',
      '#decor',
      '#south',
      '#kit',
      '#budget',
      '#siblings',
      '#sources',
    ]);
    // Every anchored heading carries a matching id in the article.
    const ids = all()
      .filter((node) => node.tag === 'h2')
      .map((node) => node.id);
    expect(ids).toEqual(['shell', 'decor', 'south', 'kit', 'budget', 'siblings', 'sources']);
    // The legend: three items, each opening with its provenance chip.
    const legendUl = all().find((node) => node.tag === 'ul' && node.className === 'legend');
    expect(legendUl).toBeDefined();
    const legendRows = (legendUl ?? new StubElement('ul')).children.filter(
      (node) => node.tag === 'li',
    );
    expect(legendRows).toHaveLength(3);
    for (const li of legendRows) {
      const chip = li.children[0];
      expect(chip?.tag).toBe('span');
      expect(['sourced', 'declared', 'derived']).toContain(chip?.dataset.provenance);
      expect((chip?.textContent ?? '').length).toBeGreaterThan(0);
    }
  });

  it('renders the elevation frieze between the H1 and the anchors', () => {
    expect(root.children.map((node) => node.tag)).toEqual(['h1', 'figure', 'nav', 'article']);
    const figure = root.children[1];
    expect(figure?.className).toBe('elevation');
    const svg = figure?.children[0];
    expect(svg?.tag).toBe('svg');
    expect(svg?.attributes.role).toBe('img');
    expect(svg?.attributes['aria-label']).toBe('South elevation — Palace Square, west → east');
    expect(svg?.attributes.viewBox).toBe('-105.000 0.000 210.000 24.000');
    expect((svg?.innerHTML ?? '').length).toBeGreaterThan(1000);
  });

  it('derived ledger rows show their formula as a visible second dd', () => {
    const row = all().find(
      (node) =>
        node.tag === 'div' &&
        node.children.some(
          (child) => child.tag === 'dt' && child.textContent === 'JavaScript gzip',
        ),
    );
    expect(row).toBeDefined();
    const children = row?.children ?? [];
    expect(children.map((node) => node.tag)).toEqual(['dt', 'dd', 'span', 'dd']);
    const dd = children[1];
    expect(dd?.className).toBe('');
    const chip = children[2];
    expect(chip?.dataset.provenance).toBe('derived');
    const formula = children[3];
    expect(formula?.tag).toBe('dd');
    expect(formula?.className).toBe('formula');
    expect(formula?.textContent).toContain('CI gzip measurement');
    // A sourced row stays three children — no formula line.
    const sourcedRow = all().find(
      (node) =>
        node.tag === 'div' &&
        node.children.some(
          (child) => child.tag === 'dt' && child.textContent === 'North (Neva) facade length',
        ),
    );
    expect(sourcedRow?.children.map((node) => node.tag)).toEqual(['dt', 'dd', 'span']);
  });

  it('labels every table cell with its column head (the block-table hook)', () => {
    // The ≤767 block-table pattern prefixes each cell with its column head via
    // attr(data-label) — the same dictionary string, no new text.
    const module = all().find((node) => node.tag === 'td' && node.textContent === 'small');
    expect(module?.dataset.label).toBe('Module');
    const axes = all().find((node) => node.tag === 'td' && node.textContent === '7 (±1)');
    expect(axes?.dataset.label).toBe('Declared axes');
    // The leading cell names the row — it carries no label.
    const rowName = all().find(
      (node) => node.tag === 'th' && node.scope === 'row' && node.textContent === 'row1',
    );
    expect(rowName?.dataset.label).toBeUndefined();
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
    // §3.4: the unmeasured gzip is an em dash with the muted pending note beside it.
    const last = textOf(budget.at(-1));
    expect(last).toContain('—');
    expect(last).toContain('pending CI measurement');
    for (const row of budget) {
      expect(descendants(row).some((node) => node.tag === 'span')).toBe(true);
    }
  });
});
