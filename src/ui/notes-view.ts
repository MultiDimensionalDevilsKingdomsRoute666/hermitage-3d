// /notes view-model — src/ui/notes-view.ts
// Pure: turns the frozen facade spec plus a fresh solve into a JSON-serializable page
// model. No three.js, no DOM, no clocks, no randomness — node tests build the page as-is.
// The DOM binding beside notes.html renders this model and adds no numbers of its own.
import {
  DECLARED_BAY_PITCH_M,
  DECOR_SYSTEM,
  type FacadeId,
  type FacadeSpec,
  ORDER_SYSTEM,
  SHELL,
  SIBLING_FACADES,
  SOUTH_FACADE,
  type SourceKey,
  WINDOW_ROWS,
  type WindowRow,
} from '../content/facade-spec';
import {
  LICENSE_LINES,
  type LicenseLine,
  type ProvenanceTree,
  REPO_DOC_URLS,
  resolveProvenance,
  SPEC_PROVENANCE,
} from '../content/provenance';
import {
  type BudgetProjection,
  type Issue,
  KIT,
  PART_IDS,
  projectBudget,
  type SceneAllowance,
  type SolvedFacade,
  type SolveResult,
  solveSouthFacade,
} from '../procedural/facade-solver';
// ---------------------------------------------------------------------------
// Model types
// ---------------------------------------------------------------------------
/**
 * Provenance as it travels with a displayed number. Sourced/declared rows cite a leaf of
 * the provenance register by id; derived rows carry the arithmetic that produced them.
 */
export type RowProvenance =
  | Readonly<{ kind: 'sourced'; id: string; keys: readonly SourceKey[] }>
  | Readonly<{ kind: 'declared'; id: string; license: LicenseLine; licenseTitle: string }>
  | Readonly<{ kind: 'derived'; formula: string }>;
export type NumberRow = Readonly<{
  id: string;
  label: string;
  /** null = not available yet (e.g. gzip size before CI has measured it). */
  value: number | null;
  unit: string;
  /** Preformatted value text; never a fake number when value is null. */
  display: string;
  provenance: RowProvenance;
}>;
export type TableRow = Readonly<{
  id: string;
  cells: readonly string[];
  /** One entry per registered or derived number the row displays. */
  provenance?: readonly RowProvenance[];
}>;
export type NotesLink = Readonly<{ href: string; label: string }>;
export type CalloutLevel = 'note' | 'warning' | 'error';
export type NotesBlock =
  | Readonly<{ kind: 'heading'; level: 1 | 2 | 3; text: string }>
  | Readonly<{ kind: 'paragraph'; text: string }>
  | Readonly<{ kind: 'list'; items: readonly string[] }>
  | Readonly<{ kind: 'numbers'; id: string; rows: readonly NumberRow[] }>
  | Readonly<{
      kind: 'table';
      id: string;
      caption?: string;
      columns: readonly string[];
      rows: readonly TableRow[];
    }>
  | Readonly<{ kind: 'callout'; id: string; level: CalloutLevel; text: string }>
  | Readonly<{ kind: 'links'; items: readonly NotesLink[] }>;
export type NotesModel = Readonly<{ title: string; blocks: readonly NotesBlock[] }>;
export type NotesInput = Readonly<{
  spec?: FacadeSpec;
  rows?: readonly WindowRow[];
  provenance?: ProvenanceTree;
  allowance?: SceneAllowance;
}>;
export type NotesResult =
  | Readonly<{ ok: true; model: NotesModel; warnings: readonly Issue[] }>
  | Readonly<{ ok: false; issues: readonly Issue[] }>;
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const NOTES_TITLE = 'How the south facade is built';
/** Contract ceilings enforced by CI (AGENTS.md). */
export const BUDGET_CEILINGS = {
  frameDrawCalls: 250,
  frustumTriangles: 1_000_000,
  jsGzipBytes: 350_000,
} as const;
/**
 * Default scene allowance shown on the page: Round 7 massing (12 boxes + ground plane =
 * 146 triangles), sky dome, one shadow pass, 16 other draw calls. Declared working
 * estimates registered under 'budget-allowance'; gzip is measured by CI, null until then.
 */
export const NOTES_ALLOWANCE: SceneAllowance = {
  shadowPasses: 1,
  otherFrameDrawCalls: 16,
  massingTriangles: 146,
  skyTriangles: 4096,
  measuredJsGzipBytes: null,
};
/** ±0.3 m around the declared pitch is ±1 axis per section over five sections. */
export const PITCH_TOLERANCE_M = 0.3;
export const PENDING_MEASUREMENT = 'pending CI measurement';
const FACADE_CHARACTER: Readonly<Record<FacadeId, string>> = {
  south: 'Palace Square front: three risalits, triple-arch gateway (wiki-ru, visit-petersburg).',
  north: 'Continuous colonnade to the Neva (visit-petersburg).',
  west: 'Country-palace composition toward the Admiralty (visit-petersburg).',
  east: 'Massive flanks around the service court (visit-petersburg).',
};
// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
function formatInt(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return value < 0 ? `-${grouped}` : grouped;
}
function formatNumber(value: number): string {
  return Number.isInteger(value) ? formatInt(value) : String(Number(value.toFixed(2)));
}
const prose = (...parts: readonly string[]): string =>
  parts.filter((part) => part !== '').join(' ');
const derived = (formula: string): RowProvenance => ({ kind: 'derived', formula });
function derivedRow(
  id: string,
  label: string,
  value: number,
  unit: string,
  formula: string,
): NumberRow {
  return { id, label, value, unit, display: formatNumber(value), provenance: derived(formula) };
}
// ---------------------------------------------------------------------------
// Provenance resolver, audit, guarded solver calls
// ---------------------------------------------------------------------------
type Resolver = Readonly<{
  cite: (id: string) => RowProvenance;
  missing: () => readonly string[];
}>;
function createResolver(tree: ProvenanceTree): Resolver {
  const missing: string[] = [];
  const cite = (id: string): RowProvenance => {
    const entry = resolveProvenance(tree, id);
    if (entry === undefined) {
      missing.push(id);
      return { kind: 'derived', formula: `unregistered: ${id}` };
    }
    if (entry.kind === 'sourced') {
      return { kind: 'sourced', id, keys: entry.keys };
    }
    return {
      kind: 'declared',
      id,
      license: entry.license,
      licenseTitle: LICENSE_LINES[entry.license],
    };
  };
  return { cite, missing: () => missing };
}
function specError(path: string, message: string): Issue {
  return { severity: 'error', code: 'spec', path, message };
}
function thrown(path: string, error: unknown): Issue {
  return specError(path, error instanceof Error ? error.message : String(error));
}
/** View-level sanity gate: the page only renders a south spec whose arithmetic closes. */
function auditSpec(spec: FacadeSpec, rows: readonly WindowRow[]): readonly Issue[] {
  const issues: Issue[] = [];
  if (spec.id !== 'south') {
    issues.push(specError('id', `the /notes page renders the south facade; got '${spec.id}'`));
  }
  if (rows.length === 0) {
    issues.push(specError('rows', 'at least one window row is required'));
  }
  const seen = new Set<string>();
  for (const section of spec.sections) {
    if (seen.has(section.id)) {
      issues.push(specError(`sections.${section.id}`, 'duplicate section id'));
    }
    seen.add(section.id);
  }
  const axes = spec.sections.reduce((sum, section) => sum + section.declaredAxes, 0);
  if (axes <= 0) {
    issues.push(specError('sections', 'declared axes must total more than zero'));
    return issues;
  }
  const pitch = spec.mainLineLengthM / axes;
  if (Math.abs(pitch - DECLARED_BAY_PITCH_M) > PITCH_TOLERANCE_M) {
    issues.push(
      specError(
        'sections',
        prose(
          `${axes} declared axes over ${formatNumber(spec.mainLineLengthM)} m give a bay`,
          `pitch of ${pitch.toFixed(2)} m; the register declares ~${DECLARED_BAY_PITCH_M} m`,
          `(±${PITCH_TOLERANCE_M} m, i.e. ±1 axis per section).`,
        ),
      ),
    );
  }
  return issues;
}
function runSolve(spec: FacadeSpec, rows: readonly WindowRow[]): SolveResult {
  try {
    return solveSouthFacade(spec, rows);
  } catch (error) {
    return { ok: false, issues: [thrown('solve', error)] };
  }
}
type ProjectionResult =
  | Readonly<{ ok: true; value: BudgetProjection }>
  | Readonly<{ ok: false; issues: readonly Issue[] }>;
function runProjection(solved: SolvedFacade, allowance: SceneAllowance): ProjectionResult {
  try {
    return { ok: true, value: projectBudget(solved, allowance) };
  } catch (error) {
    return { ok: false, issues: [thrown('projectBudget', error)] };
  }
}
// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
type Ctx = Readonly<{
  spec: FacadeSpec;
  rows: readonly WindowRow[];
  solved: SolvedFacade;
  warnings: readonly Issue[];
  projection: BudgetProjection;
  allowance: SceneAllowance;
  cite: (id: string) => RowProvenance;
  cited: (id: string, label: string, value: number, unit: string) => NumberRow;
}>;
function introBlocks(): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 1, text: NOTES_TITLE },
    {
      kind: 'paragraph',
      text: prose(
        'Every number on this page is produced at load by the same pure solver the app runs',
        'over its frozen facade specification (decisions.md, DEC-004). It is not a survey.',
        'Three kinds of numbers are kept apart by the type system and labelled here:',
      ),
    },
    {
      kind: 'list',
      items: [
        'Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use").',
        prose(
          'Declared — a photo-derived working target registered in docs/artistic-license.md;',
          'checked against measured elevation drawings during Phase 1 and corrected in both',
          'places if the record differs.',
        ),
        prose(
          'Derived — solver arithmetic over sourced and declared inputs',
          '(docs/design-facade-grammar.md); recomputed on every load, never registered.',
        ),
      ],
    },
    {
      kind: 'links',
      items: [
        { href: REPO_DOC_URLS.attributions, label: 'ATTRIBUTIONS.md' },
        { href: REPO_DOC_URLS.artisticLicense, label: 'docs/artistic-license.md' },
        { href: REPO_DOC_URLS.facadeGrammar, label: 'docs/design-facade-grammar.md' },
        { href: REPO_DOC_URLS.decisions, label: 'docs/decisions.md' },
        { href: REPO_DOC_URLS.facadeSpec, label: 'src/content/facade-spec.ts' },
      ],
    },
  ];
}
function shellBlocks({ cited }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: 'Shell' },
    {
      kind: 'paragraph',
      text: prose(
        'Quadrangle numbers as the sources give them. Where two sources disagree both',
        'counts are kept, each under its own key.',
      ),
    },
    {
      kind: 'numbers',
      id: 'shell',
      rows: [
        cited(
          'shell.northFacadeLengthM',
          'North (Neva) facade length',
          SHELL.northFacadeLengthM,
          'm',
        ),
        cited(
          'shell.westFacadeLengthM',
          'West (Admiralty) facade length',
          SHELL.westFacadeLengthM,
          'm',
        ),
        cited(
          'shell.windowsTotal.conservative',
          'Windows, conservative count',
          SHELL.windowsTotal.conservative,
          '',
        ),
        cited(
          'shell.windowsTotal.generous',
          'Windows, generous count',
          SHELL.windowsTotal.generous,
          '',
        ),
        cited(
          'shell.roomsTotal.conservative',
          'Rooms, conservative count',
          SHELL.roomsTotal.conservative,
          '',
        ),
        cited('shell.roomsTotal.generous', 'Rooms, generous count', SHELL.roomsTotal.generous, ''),
        cited('shell.staircasesTotal', 'Staircases', SHELL.staircasesTotal, ''),
        cited('shell.corniceHeightM', 'Height to the cornice', SHELL.corniceHeightM, 'm'),
        cited('shell.totalHeightM', 'Total height with roof band', SHELL.totalHeightM, 'm'),
        cited(
          'shell.rooflineStatuaryHeightM',
          'Principal facade incl. roofline statuary',
          SHELL.rooflineStatuaryHeightM,
          'm',
        ),
        cited('shell.cornersTotal', 'Corners incl. every projection', SHELL.cornersTotal, ''),
        cited('shell.roofStatues', 'Roof statuary figures', SHELL.roofStatues, ''),
      ],
    },
  ];
}
function systemBlocks({ rows, cite, cited }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: 'Window, decor and order system' },
    {
      kind: 'paragraph',
      text: prose(
        'The sourced catalogue (Alekseeva via wiki-ru) is reproduced as a module system and a',
        'column rhythm, not one-for-one: the counts below are catalogued, the kit models a',
        'smaller stylized set (artistic-license register, "Window/decor catalogue").',
      ),
    },
    {
      kind: 'numbers',
      id: 'decor',
      rows: [
        cited(
          'decor.windowWidthModules',
          'Window width modules',
          DECOR_SYSTEM.windowWidthModules,
          '',
        ),
        cited('decor.windowTypes', 'Window types', DECOR_SYSTEM.windowTypes, ''),
        cited('decor.surroundTypes', 'Surround types', DECOR_SYSTEM.surroundTypes, ''),
        cited(
          'decor.sculpturalDecorTypes',
          'Sculptural decor types',
          DECOR_SYSTEM.sculpturalDecorTypes,
          '',
        ),
        cited('decor.capitalVarieties', 'Capital varieties', DECOR_SYSTEM.capitalVarieties, ''),
        cited('decor.cartoucheKinds', 'Cartouche kinds', DECOR_SYSTEM.cartoucheKinds, ''),
      ],
    },
    {
      kind: 'table',
      id: 'order',
      caption: 'Order system',
      columns: ['Fact', 'Value'],
      rows: [
        {
          id: 'order.tiers',
          cells: ['Engaged colonnade tiers', String(ORDER_SYSTEM.tiers)],
          provenance: [cite('order.tiers')],
        },
        {
          id: 'order.columnArrangement',
          cells: ['Column arrangement', ORDER_SYSTEM.columnArrangement.join(' · ')],
          provenance: [cite('order.columnArrangement')],
        },
        {
          id: 'order.capitalFamily',
          cells: ['Capital family', ORDER_SYSTEM.capitalFamily],
          provenance: [cite('order.capitalFamily')],
        },
        {
          id: 'order.wallColor',
          cells: ['Wall colour', ORDER_SYSTEM.wallColorNote],
        },
      ],
    },
    {
      kind: 'table',
      id: 'rows',
      caption: 'Window rows, bottom to top',
      columns: ['Row', 'Tier', 'Module', 'Declared head height'],
      rows: rows.map((row) => ({
        id: `rows.${row.id}`,
        cells: [row.id, row.tier, row.module, `${formatNumber(row.declaredHeadHeightM)} m`],
        provenance: [cite(`rows.${row.id}.module`), cite(`rows.${row.id}.declaredHeadHeightM`)],
      })),
    },
  ];
}
function creaseCallout({ spec, solved, warnings }: Ctx): NotesBlock {
  const creaseWarnings = warnings.filter((warning) => warning.code === 'crease');
  const solverSays = creaseWarnings.map((warning) => `Solver: ${warning.message}`).join(' ');
  return {
    kind: 'callout',
    id: 'south.crease',
    level: creaseWarnings.length > 0 ? 'warning' : 'note',
    text: prose(
      `Crease line: the spec carries ${formatNumber(spec.creaseLineLengthM)} m (sourced —`,
      'wiki-en "principal facade", citing Budberg, Great Palaces: The Winter Palace, 1969; the',
      'ru tradition reads the same edge as 210 m); the solver derives',
      `${formatNumber(solved.derivedCreaseM)} m from the main line and the declared risalit`,
      'protrusions. The two sourced lengths most likely measure one street edge under different',
      'source conventions, not a plan line against a crease line; the declared axis rhythm',
      '(7 + 20 + 8 + 20 + 7) and the derived figure have no digitized attestation (literature',
      'hunt closed 2026-10-17). Settling it takes measured drawings — РГИА ф. 485, an Albertina',
      'scan, or Pilyavsky via НЭБ — so this warning stays live until then, with the spec and',
      'the artistic-license register ("Dimension approximations") corrected if the record',
      'differs.',
      solverSays,
    ),
  };
}
function southBlocks(ctx: Ctx): readonly NotesBlock[] {
  const { spec, rows, solved, cite, cited } = ctx;
  const { counts } = solved;
  return [
    { kind: 'heading', level: 2, text: 'South elevation — Palace Square, west → east' },
    {
      kind: 'numbers',
      id: 'south.lines',
      rows: [
        cited('south.mainLineLengthM', 'Main facade line', spec.mainLineLengthM, 'm'),
        cited(
          'south.creaseLineLengthM',
          'Crease line incl. risalit creases',
          spec.creaseLineLengthM,
          'm',
        ),
        cited('south.declaredBayPitchM', 'Declared working bay pitch', DECLARED_BAY_PITCH_M, 'm'),
        derivedRow(
          'south.derivedPitchM',
          'Derived bay pitch',
          solved.pitchM,
          'm',
          `${formatNumber(spec.mainLineLengthM)} m / ${counts.axes} axes`,
        ),
        derivedRow(
          'south.derivedCreaseM',
          'Derived crease line',
          solved.derivedCreaseM,
          'm',
          'main line + inner risalit creases from the declared protrusions (solver)',
        ),
      ],
    },
    {
      kind: 'table',
      id: 'south.sections',
      caption: 'Sections, west → east; notes verbatim from the frozen spec',
      columns: ['Section', 'Kind', 'Declared axes', 'Declared protrusion', 'Note'],
      rows: spec.sections.map((section) => ({
        id: `south.sections.${section.id}`,
        cells: [
          section.id,
          section.kind,
          `${section.declaredAxes} (±1)`,
          `${formatNumber(section.declaredProtrusionM)} m`,
          section.note,
        ],
        provenance: [
          cite(`south.sections.${section.id}.declaredAxes`),
          cite(`south.sections.${section.id}.declaredProtrusionM`),
        ],
      })),
    },
    {
      kind: 'numbers',
      id: 'south.counts',
      rows: [
        derivedRow(
          'south.counts.axes',
          'Window axes',
          counts.axes,
          '',
          'Σ declaredAxes over the five sections',
        ),
        derivedRow(
          'south.counts.windowSlots',
          'Window slots',
          counts.windowSlots,
          '',
          `${counts.axes} axes × ${rows.length} rows`,
        ),
        derivedRow(
          'south.counts.windows',
          'Windows',
          counts.windows,
          '',
          'windowSlots − portalVoidCells',
        ),
        derivedRow(
          'south.counts.portalVoidCells',
          'Portal void cells',
          counts.portalVoidCells,
          '',
          'slots displaced by the entrance and portal arches (solver)',
        ),
        derivedRow(
          'south.counts.columnShafts',
          'Column shafts',
          counts.columnShafts,
          '',
          'Σ KIT.shaftCount × instances over column parts (solver)',
        ),
      ],
    },
    creaseCallout(ctx),
  ];
}
function kitBlocks({ solved }: Ctx): readonly NotesBlock[] {
  const placed = PART_IDS.flatMap((part) => {
    const instances = solved.counts.byPart[part];
    if (instances <= 0) {
      return [];
    }
    const ceiling = KIT[part].triangleCeiling;
    return [{ part, instances, ceiling, total: instances * ceiling }];
  });
  const totalInstances = placed.reduce((sum, row) => sum + row.instances, 0);
  const totalTriangles = placed.reduce((sum, row) => sum + row.total, 0);
  return [
    { kind: 'heading', level: 2, text: 'Instanced kit' },
    {
      kind: 'paragraph',
      text: prose(
        'Parts the solver placed on the south facade; kit slots with no placements are',
        'omitted. Triangle ceilings are per-instance kit maxima, so part totals are ceilings,',
        'not measured counts.',
      ),
    },
    {
      kind: 'table',
      id: 'kit.parts',
      columns: ['Part', 'Instances', 'Triangle ceiling per instance', 'Part total'],
      rows: [
        ...placed.map((row) => ({
          id: `kit.${row.part}`,
          cells: [row.part, formatInt(row.instances), formatInt(row.ceiling), formatInt(row.total)],
          provenance: [derived('counts.byPart × KIT.triangleCeiling')],
        })),
        {
          id: 'kit.total',
          cells: [
            `Total — ${placed.length} active parts`,
            formatInt(totalInstances),
            '—',
            formatInt(totalTriangles),
          ],
          provenance: [derived('Σ over placed parts')],
        },
      ],
    },
    {
      kind: 'numbers',
      id: 'kit.totals',
      rows: [
        derivedRow('kit.instances', 'Instances', solved.counts.instances, '', 'Σ counts.byPart'),
        derivedRow(
          'kit.activeParts',
          'Active parts',
          solved.counts.activeParts,
          '',
          'parts with ≥ 1 instance',
        ),
        derivedRow(
          'kit.triangles',
          'Kit triangle ceiling',
          solved.counts.triangles,
          '',
          'Σ instances × triangleCeiling',
        ),
      ],
    },
  ];
}
function budgetCallout({ projection }: Ctx): NotesBlock {
  const drawMargin = BUDGET_CEILINGS.frameDrawCalls - projection.frameDrawCalls;
  const triangleMargin = BUDGET_CEILINGS.frustumTriangles - projection.frustumTriangles;
  const gzip = projection.jsGzipBytes;
  const gzipOver = gzip !== null && gzip > BUDGET_CEILINGS.jsGzipBytes;
  const gzipText =
    gzip === null
      ? `JS gzip measured: ${PENDING_MEASUREMENT}`
      : `${formatInt(gzip)} B JS gzip (margin ${formatInt(BUDGET_CEILINGS.jsGzipBytes - gzip)} B)`;
  return {
    kind: 'callout',
    id: 'budget.contract',
    level: drawMargin < 0 || triangleMargin < 0 || gzipOver ? 'error' : 'note',
    text: prose(
      `Contract ceilings enforced in CI: ≤ ${formatInt(BUDGET_CEILINGS.frameDrawCalls)} draw`,
      `calls per frame, ≤ ${formatInt(BUDGET_CEILINGS.frustumTriangles)} frustum triangles,`,
      `≤ ${formatInt(BUDGET_CEILINGS.jsGzipBytes)} B JavaScript gzip. Projected:`,
      `${formatInt(projection.frameDrawCalls)} draws (margin ${formatInt(drawMargin)}),`,
      `${formatInt(projection.frustumTriangles)} triangles (margin ${formatInt(triangleMargin)}),`,
      `${gzipText}. An overrun is removed by changing art or level of detail, never the number.`,
    ),
  };
}
function budgetBlocks(ctx: Ctx): readonly NotesBlock[] {
  const { solved, projection, allowance, cited } = ctx;
  const gzip = projection.jsGzipBytes;
  const gzipRow: NumberRow = {
    id: 'budget.jsGzipBytes',
    label: 'JavaScript gzip',
    value: gzip,
    unit: 'B',
    display: gzip === null ? `measured: ${PENDING_MEASUREMENT}` : formatInt(gzip),
    provenance: derived('CI gzip measurement passed through allowance.measuredJsGzipBytes'),
  };
  const allowanceRows: readonly { id: string; label: string; value: number }[] = [
    { id: 'budget.allowance.shadowPasses', label: 'Shadow passes', value: allowance.shadowPasses },
    {
      id: 'budget.allowance.otherFrameDrawCalls',
      label: 'Other frame draw calls',
      value: allowance.otherFrameDrawCalls,
    },
    {
      id: 'budget.allowance.massingTriangles',
      label: 'Massing triangles',
      value: allowance.massingTriangles,
    },
    {
      id: 'budget.allowance.skyTriangles',
      label: 'Sky triangles',
      value: allowance.skyTriangles,
    },
  ];
  return [
    { kind: 'heading', level: 2, text: 'Budget projection' },
    {
      kind: 'numbers',
      id: 'budget.projection',
      rows: [
        derivedRow(
          'budget.facadeDrawCalls',
          'Facade draw calls',
          projection.facadeDrawCalls,
          '',
          'projectBudget: instanced draws of the active parts over all passes',
        ),
        derivedRow(
          'budget.frameDrawCalls',
          'Frame draw calls',
          projection.frameDrawCalls,
          '',
          `facadeDrawCalls + ${allowance.otherFrameDrawCalls} other draw calls`,
        ),
        derivedRow(
          'budget.frustumTriangles',
          'Frustum triangles',
          projection.frustumTriangles,
          '',
          `kit ${formatInt(solved.counts.triangles)} + massing ${formatInt(allowance.massingTriangles)} + sky ${formatInt(allowance.skyTriangles)}`,
        ),
        derivedRow(
          'budget.submittedTriangleCeiling',
          'Submitted triangle ceiling',
          projection.submittedTriangleCeiling,
          '',
          `frustumTriangles × (1 + ${allowance.shadowPasses} shadow pass)`,
        ),
        gzipRow,
      ],
    },
    budgetCallout(ctx),
    {
      kind: 'paragraph',
      text: prose(
        'Scene allowance — declared working estimates of what the rest of the frame costs',
        '(Round 7 massing: 12 boxes + ground plane; sky dome; one shadow pass; other draw',
        'calls). They are inputs to the projection, not measurements.',
      ),
    },
    {
      kind: 'table',
      id: 'budget.allowance',
      caption: 'Scene allowance',
      columns: ['Allowance', 'Value'],
      rows: allowanceRows.map(({ id, label, value }) => {
        const row = cited(id, label, value, '');
        return { id: row.id, cells: [row.label, row.display], provenance: [row.provenance] };
      }),
    },
  ];
}
function siblingBlocks({ cite }: Ctx): readonly NotesBlock[] {
  return [
    { kind: 'heading', level: 2, text: 'Sibling facades — not shipped in Phase 1' },
    {
      kind: 'paragraph',
      text: prose(
        'North, west and east reuse the kit later. Their axis counts are declared only',
        '(artistic-license register, "Facade axis counts"), kept so the plan arithmetic closes',
        'in tests; main-line lengths are the shell numbers above.',
      ),
    },
    {
      kind: 'table',
      id: 'siblings',
      columns: ['Facade', 'Sections — kind · declared axes', 'Declared axes', 'Character'],
      rows: SIBLING_FACADES.map((facade) => {
        const axes = facade.sections.reduce((sum, section) => sum + section.declaredAxes, 0);
        return {
          id: `siblings.${facade.id}`,
          cells: [
            facade.id,
            facade.sections
              .map((section) => `${section.id} (${section.kind}) ${section.declaredAxes}`)
              .join(' · '),
            `${axes} (±1 per section)`,
            FACADE_CHARACTER[facade.id],
          ],
          provenance: [cite(`siblings.${facade.id}.declaredAxes`)],
        };
      }),
    },
  ];
}
// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export function buildSouthNotesModel(input: NotesInput = {}): NotesResult {
  const spec = input.spec ?? SOUTH_FACADE;
  const rows = input.rows ?? WINDOW_ROWS;
  const tree = input.provenance ?? SPEC_PROVENANCE;
  const allowance = input.allowance ?? NOTES_ALLOWANCE;
  const audit = auditSpec(spec, rows);
  const solve = runSolve(spec, rows);
  if (!solve.ok) {
    return { ok: false, issues: [...audit, ...solve.issues] };
  }
  if (audit.length > 0) {
    return { ok: false, issues: audit };
  }
  const projected = runProjection(solve.value, allowance);
  if (!projected.ok) {
    return projected;
  }
  const resolver = createResolver(tree);
  const cited = (id: string, label: string, value: number, unit: string): NumberRow => ({
    id,
    label,
    value,
    unit,
    display: formatNumber(value),
    provenance: resolver.cite(id),
  });
  const ctx: Ctx = {
    spec,
    rows,
    solved: solve.value,
    warnings: solve.warnings,
    projection: projected.value,
    allowance,
    cite: resolver.cite,
    cited,
  };
  const blocks: readonly NotesBlock[] = [
    ...introBlocks(),
    ...shellBlocks(ctx),
    ...systemBlocks(ctx),
    ...southBlocks(ctx),
    ...kitBlocks(ctx),
    ...budgetBlocks(ctx),
    ...siblingBlocks(ctx),
  ];
  const missing = resolver.missing();
  if (missing.length > 0) {
    return {
      ok: false,
      issues: missing.map((id) =>
        specError(`provenance.${id}`, `displayed number '${id}' has no provenance register entry`),
      ),
    };
  }
  return { ok: true, model: { title: NOTES_TITLE, blocks }, warnings: solve.warnings };
}
/** Every provenance object carried by the model, in page order. */
export function walkProvenance(model: NotesModel): readonly RowProvenance[] {
  const out: RowProvenance[] = [];
  for (const block of model.blocks) {
    if (block.kind === 'numbers') {
      for (const row of block.rows) {
        out.push(row.provenance);
      }
    } else if (block.kind === 'table') {
      for (const row of block.rows) {
        if (row.provenance !== undefined) {
          out.push(...row.provenance);
        }
      }
    }
  }
  return out;
}
