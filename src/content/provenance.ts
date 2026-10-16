// Provenance register for the /notes page — src/content/provenance.ts
// Pure data: no three.js imports, no browser globals, no clock reads; node-importable.
//
// Every SOURCED or DECLARED number the page shows has exactly one leaf here under a stable
// dotted id. The view-model (src/ui/notes-view.ts) cites leaves by id; a test walks the
// built page in both directions — every citation resolves, every leaf is cited. DERIVED
// numbers are solver arithmetic, recomputed on every load and never registered, so they
// have no leaves here and carry their formula inline in the view-model instead.
import type { SourceKey } from './facade-spec';

// Record<SourceKey, true> makes the compiler reject a missing or misspelled key, so this
// stays an exhaustive runtime mirror of the SourceKey union in facade-spec.ts.
const SOURCE_KEY_SET: Readonly<Record<SourceKey, true>> = {
  'wiki-ru': true,
  'wiki-en': true,
  'visit-petersburg': true,
  'peterburg-center': true,
  studiomatrx: true,
  bravoplanner: true,
};
/** Runtime list of attribution keys (ATTRIBUTIONS.md), for validation and tests. */
export const SOURCE_KEYS = Object.keys(SOURCE_KEY_SET) as readonly SourceKey[];
export function isSourceKey(value: string): value is SourceKey {
  return (SOURCE_KEYS as readonly string[]).includes(value);
}
export const REPO_URL = 'https://github.com/vasyapym/hermitage-3d';
/** Exact file links used by the page's register legend. */
export const REPO_DOC_URLS = {
  attributions: `${REPO_URL}/blob/main/ATTRIBUTIONS.md`,
  artisticLicense: `${REPO_URL}/blob/main/docs/artistic-license.md`,
  facadeGrammar: `${REPO_URL}/blob/main/docs/design-facade-grammar.md`,
  decisions: `${REPO_URL}/blob/main/docs/decisions.md`,
  facadeSpec: `${REPO_URL}/blob/main/src/content/facade-spec.ts`,
} as const;
/**
 * Short label → bold title of the docs/artistic-license.md register line a declared
 * number lives under. 'budget-allowance' is the line Round 8 introduces for the scene
 * allowance echoed on /notes; the docs sync of the same round lands it in the register.
 */
export const LICENSE_LINES = {
  'dimension-approximations': 'Dimension approximations',
  'facade-axis-counts': 'Facade axis counts (Phase 1 spec)',
  'window-decor-catalogue': 'Window/decor catalogue',
  'budget-allowance': 'Budget allowance (Phase 1 /notes)',
} as const;
export type LicenseLine = keyof typeof LICENSE_LINES;
export type SourcedProvenance = Readonly<{
  kind: 'sourced';
  keys: readonly [SourceKey, ...SourceKey[]];
}>;
export type DeclaredProvenance = Readonly<{ kind: 'declared'; license: LicenseLine }>;
export type DerivedProvenance = Readonly<{ kind: 'derived' }>;
/** The contract shape as a discriminated union: sourced ⇒ keys, declared ⇒ license. */
export type BlockProvenance = SourcedProvenance | DeclaredProvenance | DerivedProvenance;
/** Only these two kinds may be registered; derived numbers are computed, not listed. */
export type RegisteredProvenance = SourcedProvenance | DeclaredProvenance;
/** group → (leaf id → provenance). Groups mirror the page's block order. */
export type ProvenanceTree = Readonly<
  Record<string, Readonly<Record<string, RegisteredProvenance>>>
>;
export type ProvenanceLeaf = Readonly<{
  id: string;
  group: string;
  provenance: RegisteredProvenance;
}>;
const sourced = (...keys: readonly [SourceKey, ...SourceKey[]]): SourcedProvenance => ({
  kind: 'sourced',
  keys,
});
const declared = (license: LicenseLine): DeclaredProvenance => ({ kind: 'declared', license });
export const SPEC_PROVENANCE = {
  shell: {
    'shell.northFacadeLengthM': sourced('wiki-ru', 'studiomatrx', 'bravoplanner'),
    'shell.westFacadeLengthM': sourced('wiki-ru', 'studiomatrx', 'bravoplanner'),
    'shell.windowsTotal.conservative': sourced('wiki-ru'),
    'shell.windowsTotal.generous': sourced('wiki-en'),
    'shell.roomsTotal.conservative': sourced('wiki-ru'),
    'shell.roomsTotal.generous': sourced('wiki-en'),
    'shell.staircasesTotal': sourced('wiki-ru'),
    'shell.corniceHeightM': sourced('studiomatrx'),
    'shell.totalHeightM': sourced('wiki-ru'),
    'shell.rooflineStatuaryHeightM': sourced('wiki-en'),
    'shell.cornersTotal': sourced('wiki-ru'),
    'shell.roofStatues': sourced('peterburg-center'),
  },
  decor: {
    'decor.windowWidthModules': sourced('wiki-ru'),
    'decor.windowTypes': sourced('wiki-ru'),
    'decor.surroundTypes': sourced('wiki-ru'),
    'decor.sculpturalDecorTypes': sourced('wiki-ru'),
    'decor.capitalVarieties': sourced('wiki-ru'),
    'decor.cartoucheKinds': sourced('wiki-ru'),
  },
  order: {
    'order.tiers': sourced('visit-petersburg', 'wiki-ru', 'peterburg-center'),
    'order.columnArrangement': sourced('wiki-ru', 'visit-petersburg'),
    'order.capitalFamily': declared('window-decor-catalogue'),
  },
  rows: {
    'rows.row1.module': sourced('wiki-ru'),
    'rows.row1.declaredHeadHeightM': declared('dimension-approximations'),
    'rows.row2.module': sourced('wiki-ru'),
    'rows.row2.declaredHeadHeightM': declared('dimension-approximations'),
    'rows.row3.module': sourced('wiki-ru'),
    'rows.row3.declaredHeadHeightM': declared('dimension-approximations'),
    'rows.row4.module': sourced('wiki-ru'),
    'rows.row4.declaredHeadHeightM': declared('dimension-approximations'),
  },
  south: {
    'south.mainLineLengthM': sourced('wiki-ru', 'studiomatrx', 'bravoplanner'),
    'south.creaseLineLengthM': sourced('wiki-en'),
    'south.declaredBayPitchM': declared('facade-axis-counts'),
    'south.sections.sw-risalit.declaredAxes': declared('facade-axis-counts'),
    'south.sections.sw-risalit.declaredProtrusionM': declared('dimension-approximations'),
    'south.sections.west-stretch.declaredAxes': declared('facade-axis-counts'),
    'south.sections.west-stretch.declaredProtrusionM': declared('dimension-approximations'),
    'south.sections.central-portal.declaredAxes': declared('facade-axis-counts'),
    'south.sections.central-portal.declaredProtrusionM': declared('dimension-approximations'),
    'south.sections.east-stretch.declaredAxes': declared('facade-axis-counts'),
    'south.sections.east-stretch.declaredProtrusionM': declared('dimension-approximations'),
    'south.sections.se-risalit.declaredAxes': declared('facade-axis-counts'),
    'south.sections.se-risalit.declaredProtrusionM': declared('dimension-approximations'),
  },
  siblings: {
    'siblings.north.declaredAxes': declared('facade-axis-counts'),
    'siblings.west.declaredAxes': declared('facade-axis-counts'),
    'siblings.east.declaredAxes': declared('facade-axis-counts'),
  },
  budget: {
    'budget.allowance.shadowPasses': declared('budget-allowance'),
    'budget.allowance.otherFrameDrawCalls': declared('budget-allowance'),
    'budget.allowance.massingTriangles': declared('budget-allowance'),
    'budget.allowance.skyTriangles': declared('budget-allowance'),
  },
} satisfies ProvenanceTree;
export type SpecProvenance = typeof SPEC_PROVENANCE;
export function flattenProvenance(tree: ProvenanceTree): readonly ProvenanceLeaf[] {
  const leaves: ProvenanceLeaf[] = [];
  for (const [group, entries] of Object.entries(tree)) {
    for (const [id, provenance] of Object.entries(entries)) {
      leaves.push({ id, group, provenance });
    }
  }
  return leaves;
}
export function resolveProvenance(
  tree: ProvenanceTree,
  id: string,
): RegisteredProvenance | undefined {
  for (const entries of Object.values(tree)) {
    const hit = entries[id];
    if (hit !== undefined) {
      return hit;
    }
  }
  return undefined;
}
