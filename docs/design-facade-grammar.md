# Phase 1 design — facade grammar & solver

Relay round 5 (specialist design), integrated and verified by the orchestrator
2026-10-16. Source brief: relay round 5 (deleted after integration; see
`docs/briefs/ROUNDS.md`). The frozen data contract is
`src/content/facade-spec.ts`; this design adds the grammar types, the solver
algorithm and the kit of parts. Implementation lands in `src/procedural/` in a
following round; nothing here is implemented yet.

Status of numbers: **sourced** = attributed in `ATTRIBUTIONS.md`;
**declared** = photo-derived targets registered in `docs/artistic-license.md`;
**derived** = design arithmetic implied by the two above (verified below,
asserted by tests once implemented).

## 1. Kit of parts

25 geometry types; **17 populated in Phase 1**. Each part faces local +Z, runs
along +X, pivot at bottom-centre-back. Metres. Window opening widths: small
1.00, medium 1.35, large 1.70 (the three sourced width modules); surround adds
0.30 in width, depth 0.32. Surrounds include opaque dark recesses and mullions;
sills are separate. Triangle ceilings include backs, caps and capitals. One
stylized capital archetype supplies all columns (artistic-license).

| Part ID | Canonical parameters | Tris/instance |
|---|---|---:|
| `surround-row1-{small,medium,large}` — 3 types | opening height 1.8; head ornament rise 0.45 | 192 |
| `surround-row2-{small,medium,large}` — 3 types | height 3.6; broken-arch head rise 0.65 | 288 |
| `surround-row3-{small,medium,large}` — 3 types | height 3.2; triangular head rise 0.60 | 256 |
| `surround-row4-{small,medium,large}` — 3 types | height 2.2; shallow head rise 0.45 | 224 |
| `sill` | 1 / 0.15 / 0.40; width scaled to opening + 0.40 | 40 |
| `paired-column` | 1.10 / 9.60 / 0.65; two engaged shafts, bases, capitals | 480 |
| `corner-bunch` | 1.10 / 9.60 / 0.75; three slender engaged shafts | 720 |
| `portal-arch` | 5.50 / 9.80 / 0.60; 12-segment moulded arch and jambs | 256 |
| `ground-arch` | 4.90 / 9.40 / 0.10; opaque gate/reveal inside portal arch | 96 |
| `giant-column` | 1.10 / 20.40 / 0.85; single shaft | 320 |
| `pediment` | 27.20 / 5.00 / 0.70; width scaled to portal section | 256 |
| `cartouche` | 2.40 / 3.20 / 0.45; shield, static clock, simplified eagle | 768 |
| `cornice-run` | 1 / 1 / 0.80; 0.40 frieze + 0.60 crown; longitudinal scaling only | 104 |
| `order-junction` | 1.70 / 1 / 1.70; bevelled junction block; parapet variant 0.50 / 2 / 0.50 | 96 |
| `balustrade` | 3.40 / 2 / 0.35; six balusters and rails; longitudinal scaling | 384 |
| `vase` | 1 / 2.60 / 1; eight-sided lathed silhouette with pedestal | 192 |
| `statue` | 1.20 / 6 / 1.20; low-poly figure and pedestal | 640 |

Eight-sided shafts, short extrusion profiles and faceted sculpture justify
these ceilings; photographic sculptural detail does not. Medium surrounds stay
in the catalogue but are unused in Phase 1 (module distribution is by rule, not
random).

## 2. Grammar

The frozen spec types are reused unchanged, including `SourceKey`. New solver
contracts (to live in `src/procedural/`):

```ts
type Vec3 = Readonly<{ x: number; y: number; z: number }>;
type Aabb = Readonly<{ min: Vec3; max: Vec3 }>;
type PartId =
  | `surround-${WindowRowId}-${WindowModule}`
  | 'sill' | 'paired-column' | 'corner-bunch' | 'portal-arch'
  | 'ground-arch' | 'giant-column' | 'pediment' | 'cartouche'
  | 'cornice-run' | 'order-junction' | 'balustrade' | 'vase' | 'statue';

type Cell =
  | Readonly<{ kind: 'window'; rowId: WindowRowId; module: WindowModule }>
  | Readonly<{ kind: 'portalVoid'; rowId: WindowRowId; arch: 0 | 1 | 2 }>;

type Axis = Readonly<{
  id: string; sectionId: string; index: number;
  x: number; frontZ: number; cells: readonly Cell[];
}>;

type Placement<P extends PartId = PartId> = Readonly<{
  id: string; partId: P; position: Vec3; rotationY: number; scale: Vec3;
}>;

type PlacementsByPart = { readonly [P in PartId]: readonly Placement<P>[] };

const SOUTH_RULES = {
  stretchPairBoundaries: [2, 6, 10, 14, 18],   // pair piers: every 4th gap
  risalitBunchBoundaries: [1, 6],              // bunches at first/last internal piers
  portalAxisPairs: [[1, 2], [3, 4], [5, 6]],   // three arch reservations
  giantBoundaries: [1, 3, 5, 7],               // four giant columns
  portalVoidRows: ['row1', 'row2'],            // voids in the lower tier only
  roofSlotsBySection: [6, 18, 0, 18, 6],       // no ornaments over the pediment
} as const;
```

Indices are zero-based; boundary indices identify **gaps**, not window
centres. Declared section counts are preserved; photographic uncertainty does
not authorize automatic count correction.

Axis positions close the line exactly. For total axes N = 62, section-prefix
axes C and local index i, with p = 210/62 = 3.387096774…:

```
x_i = -105 + (C + i + 0.5)·p      z = 87.5 + protrusion
```

This contracts the declared 3.4 m pitch by ≈0.38% and closes at ±105 — the
declared pitch remains the spec's working number; the solver's exact pitch is
derived.

### Vertical composition

| Row | Tier | Module | Sill Y | Opening head Y |
|---|---|---|---:|---:|
| row1 | lower | small | 1.20 | 3.00 |
| row2 | lower | large | 5.60 | 9.20 |
| row3 | upper | large | 12.30 | 15.50 |
| row4 | upper | small | 17.30 | 19.50 |

Interpretation (provisional, recorded): `declaredHeadHeightM` measures the
opening head above a row-local zero sill, not absolute world elevation;
ornament extends above the opening head. The Y-stack closes against the cornice
at 22 m: row4 head 19.5 + cornice band 21–22 ✓.

- **Stretch:** five paired piers per section, repeated per tier → 20 paired
  columns.
- **Corner risalit:** bunches at its first and last internal piers, per tier →
  8 bunches; the geometric corners themselves stay open (sourced rule).
- **Orders:** bases at Y 0.60 and 11.40; both tiers 9.60 tall; entablatures at
  Y 10.20–11.20 and 21–22.
- **Portal:** pairs [1,2], [3,4], [5,6] become three arch reservations through
  rows 1–2 (arch centres at portal gaps 2, 4, 6; bases Y 0.20); four giant
  columns start at Y 0.60; the central intermediate entablature is omitted;
  upper windows remain. Pediment at Y 22 centred on X 0; cartouche at Y 23,
  0.02 ahead of its face.

**Slots vs windows (derived):** the grid holds **248 window slots**; the portal
reservation voids 12 cells (6 axes × rows 1–2), yielding **236 physical
windows**. The spec's estimate counts slots; implementation tests assert both.

## 3. Solver algorithm (deterministic, pure)

1. **Validate:** south ID; five expected section kinds; unique section/row IDs;
   four ordered rows with correct tiers/modules; finite dimensions; positive
   integer axes; raw pitch closure error ≤ 2 m. Reject and report — never
   repair source data silently.
2. **Expand axes:** positions computed from prefix counts (no accumulated
   float increments); four cells per axis; apply the portal mask.
3. **Emit windows:** one surround + sill per surviving cell (surround back
   0.02 ahead of the wall; sill 0.15 below its row sill). Emit piers and
   portal assemblies per the rules above; default scale is unit.
4. **Trace wall path:** five fronts plus four internal 6 m returns — derived
   south crease **234 m** (end-corner turns belong to the west/east creases;
   with them the figure would be 246 m). The sourced 215 m crease stays in the
   spec; a mismatch emits an explicit `crease` warning, never pitch distortion.
5. **Emit bands:** nine upper runs and eight lower runs (the lower central band
   is omitted with the portal entablature). At bends, junction blocks centred
   on the vertex; each incident run shortened 0.85 — counted butt joints
   instead of stretched mitres.
6. **Emit parapet:** one panel per noncentral axis plus two per return = 62
   panels, Y 22–24; connected bends get 0.50/2/0.50 junction blocks; incident
   panel ends trimmed 0.25.
7. **Emit roof ornaments:** midpoint-spaced slots per section (6/18/0/18/6),
   alternating statue/vase west-to-east mirrored: **24 + 24 = 48**, based at
   Y 24; none over the pediment or on return endpoints.
8. **Aggregate:** fixed rule order, west-to-east, ascending indices; IDs from
   section/rule/index (never formatted coordinates); group into all 25 catalog
   keys including empty arrays; compute triangle ceilings, shaft counts,
   transformed eight-corner bounds; reject nonfinite transforms, nonpositive
   scales, out-of-envelope geometry. Envelope X −105.9…105.9, Y 0…30,
   Z 86.6…95.0; bounds tolerance 1e-6 m.

## 4. Public API

```ts
type PartMeta = Readonly<{ localBounds: Aabb; triangleCeiling: number; shaftCount: 0 | 1 | 2 | 3 }>;
type Counts = Readonly<{
  axes: number; windowSlots: number; windows: number; portalVoidCells: number;
  columnShafts: number; instances: number; activeParts: number; triangles: number;
  byPart: Readonly<Record<PartId, number>>;
}>;
type Issue = Readonly<{
  severity: 'warning' | 'error';
  code: 'spec' | 'crease' | 'bounds';
  path: string; message: string;
}>;
type SolvedFacade = Readonly<{
  id: 'south'; pitchM: number; derivedCreaseM: number;
  axes: readonly Axis[]; placements: readonly Placement[];
  byPart: PlacementsByPart; counts: Counts; bounds: Aabb;
}>;
type SolveResult =
  | Readonly<{ ok: true; value: SolvedFacade; warnings: readonly Issue[] }>
  | Readonly<{ ok: false; issues: readonly Issue[] }>;
type BoundsCheck = Readonly<{ ok: boolean; actual: Aabb; outsideIds: readonly string[] }>;
type SceneAllowance = Readonly<{
  shadowPasses: 0 | 1; otherFrameDrawCalls: number;
  massingTriangles: number; skyTriangles: number; measuredJsGzipBytes: number | null;
}>;
type BudgetProjection = Readonly<{
  facadeDrawCalls: number; frameDrawCalls: number; frustumTriangles: number;
  submittedTriangleCeiling: number; jsGzipBytes: number | null;
}>;
declare const KIT: Readonly<Record<PartId, PartMeta>>;
declare function validateSouthSpec(spec: FacadeSpec, rows: readonly WindowRow[]): readonly Issue[];
declare function solveSouthFacade(spec: FacadeSpec, rows: readonly WindowRow[]): SolveResult;
declare function checkBounds(placements: readonly Placement[], allowed: Aabb): BoundsCheck;
declare function projectBudget(solved: SolvedFacade, allowance: SceneAllowance): BudgetProjection;
```

No mutable input, renderer dependency, randomness, clock, DOM or
platform-dependent sorting. Future sibling-facade adapters reuse the
local-coordinate kit; no sibling grammar is designed here.

## 5. Instancing and budget projection (derived)

| Populated part | Instances | Tris each | Ceiling |
|---|---:|---:|---:|
| row1 small surround | 56 | 192 | 10,752 |
| row2 large surround | 56 | 288 | 16,128 |
| row3 large surround | 62 | 256 | 15,872 |
| row4 small surround | 62 | 224 | 13,888 |
| sill | 236 | 40 | 9,440 |
| paired-column | 20 | 480 | 9,600 |
| corner-bunch | 8 | 720 | 5,760 |
| portal-arch | 3 | 256 | 768 |
| ground-arch | 3 | 96 | 288 |
| giant-column | 4 | 320 | 1,280 |
| pediment | 1 | 256 | 256 |
| cartouche | 1 | 768 | 768 |
| cornice-run | 17 | 104 | 1,768 |
| order-junction | 20 | 96 | 1,920 |
| balustrade | 62 | 384 | 23,808 |
| vase | 24 | 192 | 4,608 |
| statue | 24 | 640 | 15,360 |
| **Total** | **659** | | **132,264** |

One InstancedMesh per populated part → **17 facade draws per pass**. One
opaque vertex-coloured kit material (white dressings/dark recesses) + one wall
material + the reserved sky material = 3 authored slots (DEC-009 boundary
kept). No textures, transparency, PMREM or postprocessing. Build/upload once;
no per-frame facade allocation.

| Scene metric | Projection | Margin |
|---|---:|---:|
| Frustum triangles (everything assumed visible) | 132,264 + 135 massing + 4,096 sky = **136,495** | 863,505 of 1.0 M |
| Frame draws (one shadow pass) | 34 facade + 16 allowance = **50** | 200 of 250 |
| JS gzip target | existing runtime + solver/builders ≤ 300 KB | 50 KB of 350 KB |

These are projections, not measured renderer results; budgets stay CI-enforced
by measurement. Unknown JS size is `null`, never a passing assertion.
Rejected alternative: merging geometry by section (~10 draws) — duplicated
moulding scales poorly toward ~1,900 windows; instancing already has ample
headroom.

## 6. Tests for the implementation round

- Pure node import; frozen inputs unchanged; repeated solves serialize
  identically.
- Exactly 62 axes, 248 slots, 236 windows, 12 void cells; row counts
  56/56/62/62; no placements for void cells.
- Boundaries close at ±105; pitch accepted; derived crease 234; altered crease
  declarations produce diagnostics.
- 20 pairs, 8 bunches, 4 giants — **68 shafts**; mirrored; no corner-centred
  shaft; sill-to-column clearance > 0.09 m; heads clear entablatures.
- Three portal assemblies centred; no lower central band; centred pediment and
  cartouche.
- 17 bands, 20 junctions, 62 parapet panels, 48 roof ornaments; joined runs
  touch, not overlap; no duplicate ownership of end returns.
- Unique IDs; `byPart` exactly partitions the flat list; 8 empty catalog
  groups; finite positive transforms; bounds pass.
- Counts: 659 instances, 17 active parts, 132,264 kit triangles; stated
  allowance → 136,495 triangles and 50 draws.
- Invalid counts, duplicate IDs, malformed rows, nonfinite dimensions fail
  explicitly.

Builder conformance later verifies actual geometry bounds/ceilings, zero
material groups, and measured gzip.

## 7. Open questions — orchestrator dispositions

1. **248 vs 236 windows** — accepted: 248 *slots*, 236 rendered windows, 12
   portal voids. The spec estimate stays slot-based; tests pin both numbers.
2. **Crease semantics** — unresolved by sources: derived south crease 234 m
   (internal returns only) vs sourced 215 m (EN wiki). The spec keeps 215; the
   solver derives 234 and warns on mismatch. To settle against measured
   drawings during Phase 1.
3. **Roof ornaments** — ~176 (sourced) read as whole-palace statues+vases;
   south allocation 48 is a declared art-direction assumption
   (artistic-license).
4. **Relief, not openings** — window recesses are relief panels on opaque
   massing, not traversable openings (artistic-license entry added).
5. **Junction count 20** — resolved in round 6: 8 upper band bends + 6 lower
   band bends + 6 parapet bends; the two outer risalit-top corners carry no
   parapet junction block (the sourced open-corner rule). Pinned by tests.
