// /notes elevation frieze — src/ui/notes-elevation.ts
// Pure serializer: the solver's placements for the south facade into the inline SVG
// frieze the /notes page renders under the H1 (the r26.2 specialist relay's design; the
// binding wraps this output, notes.css styles the classes). One source of truth: the
// frozen spec plus a fresh solve — slot opening widths and row sills ride the solver's
// exported declared values; section extents, columns and portal voids read back from
// the solve. All coordinates are metres, x west → east about 0, y downward from the
// wall's parapet top. The SVG carries viewBox only (no width/height attributes — the
// CSS sizes it); numbers are 3-decimal fixed notation; the element order paints
// wall → slots → portal voids (they punch the slots out) → column shafts (the portico's
// giant columns stand inside the opening, in front of the void) → crease lines (full
// height) → the datum line. No text nodes, no randomness, no DOM — importable from
// node tests. Returns null when the solve fails; throws on a structural surprise (the
// DOM adapter catches and the page stands without the frieze).

import { type FacadeSpec, SOUTH_FACADE, WINDOW_ROWS, type WindowRow } from '../content/facade-spec';
import {
  KIT,
  OPENING_WIDTH_BY_MODULE,
  type PartId,
  type Placement,
  solveSouthFacade,
  WINDOW_ROW_SILL_Y,
} from '../procedural/facade-solver';

export type ElevationSvg = Readonly<{ viewBox: string; body: string }>;
export type ElevationInput = Readonly<{ spec?: FacadeSpec; rows?: readonly WindowRow[] }>;

// The wall plane ends where the parapet ends: the stonework tops (balustrade and its
// junction posts) crown the order runs; the portal section stops at the cornice instead
// (its pediment rises above the cornice and is not part of this figure). Both tops are
// read back from the solve — never declared here.
const PARAPET_PARTS: readonly PartId[] = ['balustrade', 'order-junction'];
const CORNICE_PART: PartId = 'cornice-run';
const SVG_NS = 'http://www.w3.org/2000/svg';

const metre = (value: number): string => {
  if (!Number.isFinite(value)) {
    throw new Error(`elevation: nonfinite coordinate ${String(value)}`);
  }
  const text = value.toFixed(3);
  return text === '-0.000' ? '0.000' : text;
};

const rect = (className: string, x: number, y: number, width: number, height: number): string =>
  `<rect class="${className}" x="${metre(x)}" y="${metre(y)}"` +
  ` width="${metre(width)}" height="${metre(height)}"/>`;

const line = (className: string, x1: number, y1: number, x2: number, y2: number): string =>
  `<line class="${className}" x1="${metre(x1)}" y1="${metre(y1)}"` +
  ` x2="${metre(x2)}" y2="${metre(y2)}"/>`;

type Extent = { id: string; startX: number; endX: number };

/** Each section's x-extent on the main line, west → east, from the solved axes. */
function sectionExtents(
  axes: readonly { sectionId: string; x: number }[],
  pitchM: number,
): readonly Extent[] {
  const halfSpan = pitchM / 2;
  const extents: Extent[] = [];
  for (const axis of axes) {
    const last = extents[extents.length - 1];
    if (last === undefined || last.id !== axis.sectionId) {
      extents.push({ id: axis.sectionId, startX: axis.x - halfSpan, endX: axis.x + halfSpan });
    } else {
      last.endX = axis.x + halfSpan;
    }
  }
  return extents;
}

function placementsBySection(
  placements: readonly Placement[],
): ReadonlyMap<string, readonly Placement[]> {
  const bySection = new Map<string, Placement[]>();
  for (const placement of placements) {
    const mark = placement.id.indexOf('/');
    const sectionId = mark === -1 ? placement.id : placement.id.slice(0, mark);
    const group = bySection.get(sectionId);
    if (group === undefined) bySection.set(sectionId, [placement]);
    else group.push(placement);
  }
  return bySection;
}

const crown = (placement: Placement): number =>
  placement.position.y + KIT[placement.partId].localBounds.max.y * placement.scale.y;

/** The wall's top edge per section: the parapet line, or the cornice on the portal. */
function wallTop(extent: Extent, bySection: ReadonlyMap<string, readonly Placement[]>): number {
  const section = bySection.get(extent.id) ?? [];
  let top = Number.NEGATIVE_INFINITY;
  for (const placement of section) {
    if (!PARAPET_PARTS.includes(placement.partId)) continue;
    top = Math.max(top, crown(placement));
  }
  if (!Number.isFinite(top)) {
    for (const placement of section) {
      if (placement.partId !== CORNICE_PART) continue;
      top = Math.max(top, crown(placement));
    }
  }
  if (!Number.isFinite(top)) {
    throw new Error(`elevation: section '${extent.id}' has no parapet or cornice to crown it`);
  }
  return top;
}

export function southElevationSvg(input: ElevationInput = {}): ElevationSvg | null {
  const spec = input.spec ?? SOUTH_FACADE;
  const rows = input.rows ?? WINDOW_ROWS;
  const solve = solveSouthFacade(spec, rows);
  if (!solve.ok) return null;
  const solved = solve.value;
  const pitchM = solved.pitchM;
  const halfSpan = pitchM / 2;
  const extents = sectionExtents(solved.axes, pitchM);
  const bySection = placementsBySection(solved.placements);
  const tops = extents.map((extent) => wallTop(extent, bySection));
  const heightMax = Math.max(...tops);
  const headByRow = new Map(rows.map((row) => [row.id, row.declaredHeadHeightM]));

  const parts: string[] = [];
  // The wall face per section: side sections carry the parapet to its line, the portal
  // stops at the cornice — the silhouette keeps the pediment's notch above it.
  extents.forEach((extent, index) => {
    const top = tops[index] ?? 0;
    parts.push(rect('wall', extent.startX, heightMax - top, extent.endX - extent.startX, top));
  });
  for (const axis of solved.axes) {
    for (const cell of axis.cells) {
      if (cell.kind !== 'window') continue;
      const head = headByRow.get(cell.rowId);
      if (head === undefined) throw new Error(`elevation: unknown window row '${cell.rowId}'`);
      const sill = WINDOW_ROW_SILL_Y[cell.rowId];
      const width = OPENING_WIDTH_BY_MODULE[cell.module];
      parts.push(rect('slot', axis.x - width / 2, heightMax - sill - head, width, head));
    }
  }
  // The portal voids punch the wall: one rect per displaced cell, the axis's full span.
  for (const axis of solved.axes) {
    for (const cell of axis.cells) {
      if (cell.kind !== 'portalVoid') continue;
      const head = headByRow.get(cell.rowId);
      if (head === undefined) throw new Error(`elevation: unknown window row '${cell.rowId}'`);
      const sill = WINDOW_ROW_SILL_Y[cell.rowId];
      parts.push(rect('portal', axis.x - halfSpan, heightMax - sill - head, pitchM, head));
    }
  }
  // The columns of the order: their silhouettes stop at the upper band (the runs at the
  // bands' level are the cornice, not the shaft). Painted after the voids so the portico's
  // giant columns read inside the opening.
  for (const placement of solved.placements) {
    const meta = KIT[placement.partId];
    if (meta.shaftCount <= 0) continue;
    const width = (meta.localBounds.max.x - meta.localBounds.min.x) * placement.scale.x;
    const height = (meta.localBounds.max.y - meta.localBounds.min.y) * placement.scale.y;
    parts.push(
      rect(
        'shaft',
        placement.position.x - width / 2,
        heightMax - placement.position.y - height,
        width,
        height,
      ),
    );
  }
  for (let index = 0; index < extents.length - 1; index += 1) {
    const x = extents[index]?.endX;
    if (x === undefined) throw new Error('elevation: a section extent went missing');
    parts.push(line('crease', x, 0, x, heightMax));
  }
  const first = extents[0];
  const last = extents[extents.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error('elevation: the solve produced no section extents');
  }
  parts.push(line('datum', first.startX, heightMax, last.endX, heightMax));

  const viewBox = `${metre(first.startX)} 0.000 ${metre(last.endX - first.startX)} ${metre(heightMax)}`;
  return { viewBox, body: parts.join('') };
}

export { SVG_NS };
