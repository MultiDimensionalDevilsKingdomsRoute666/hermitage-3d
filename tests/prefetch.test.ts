// tests/prefetch.test.ts
/**
 * docs/design-walkthrough-ux.md §4.6 + §12 R-UX1 — the prefetch scheduler's laws: one unit per
 * call, glb → ktx2 → decode per room, neighbours in order, busy/done/dead-end/resident skips,
 * never-evict, loud notes, determinism, and the purity fence on the pure module.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  emptyPrefetchState,
  noteManifest,
  type PrefetchState,
  type PrefetchUnit,
  planPrefetch,
} from '../src/world/prefetch';
import type { RoomFileRow, RoomNeighbor } from '../src/world/registry';

const GALLERY_ROWS = [
  { path: 'gallery.glb', bytes: 4, sha256: 'a', kind: 'glb' },
  { path: 'lm/floor.ktx2', bytes: 8, sha256: 'b', kind: 'ktx2' },
  { path: 'lm/walls.ktx2', bytes: 8, sha256: 'c', kind: 'ktx2' },
  { path: 'probe/dusk.ktx2', bytes: 16, sha256: 'd', kind: 'ktx2' },
] as const satisfies readonly RoomFileRow[];
const JORDAN_ROWS = [
  { path: 'jordan.glb', bytes: 4, sha256: 'e', kind: 'glb' },
  { path: 'lm/steps.ktx2', bytes: 8, sha256: 'f', kind: 'ktx2' },
  { path: 'probe/dusk.ktx2', bytes: 16, sha256: 'g', kind: 'ktx2' },
] as const satisfies readonly RoomFileRow[];

const toGallery: RoomNeighbor = { to: 'rastrelli-gallery', airlock: 'gallery-airlock' };
const toJordan: RoomNeighbor = { to: 'jordan', airlock: 'landing-airlock' };
const toSquare: RoomNeighbor = { to: 'square', airlock: 'arch-portal' };
const deadEnd: RoomNeighbor = { to: null, airlock: 'arch-portal' };

/** Drain the scheduler one unit per call, exactly as the host's idle tick does. */
const drain = (
  start: PrefetchState,
  neighbors: readonly RoomNeighbor[],
  limit = 32,
): Readonly<{ state: PrefetchState; units: readonly PrefetchUnit[] }> => {
  let state = start;
  const units: PrefetchUnit[] = [];
  for (let i = 0; i < limit; i += 1) {
    const step = planPrefetch(state, { settled: 'square', neighbors, busy: false });
    state = step.state;
    if (step.unit === null) break;
    units.push(step.unit);
  }
  return { state, units };
};

describe('planPrefetch — one unit per call', () => {
  it('yields exactly one unit per call and never a batch', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const first = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: false });
    expect(first.unit).toEqual({ kind: 'glb', roomId: 'rastrelli-gallery' });
    const second = planPrefetch(first.state, {
      settled: 'square',
      neighbors: [toGallery],
      busy: false,
    });
    expect(second.unit).toEqual({
      kind: 'ktx2',
      roomId: 'rastrelli-gallery',
      path: 'lm/floor.ktx2',
    });
  });

  it('plans nothing for a room whose manifest is not yet noted', () => {
    const step = planPrefetch(emptyPrefetchState, {
      settled: 'square',
      neighbors: [toGallery],
      busy: false,
    });
    expect(step.unit).toBeNull();
    expect(step.state).toBe(emptyPrefetchState);
  });
});

describe('planPrefetch — order', () => {
  it('orders one room glb → ktx2 rows in manifest order → decodes in manifest order', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const { units } = drain(state, [toGallery]);
    expect(units).toEqual([
      { kind: 'glb', roomId: 'rastrelli-gallery' },
      { kind: 'ktx2', roomId: 'rastrelli-gallery', path: 'lm/floor.ktx2' },
      { kind: 'ktx2', roomId: 'rastrelli-gallery', path: 'lm/walls.ktx2' },
      { kind: 'ktx2', roomId: 'rastrelli-gallery', path: 'probe/dusk.ktx2' },
      { kind: 'decode', roomId: 'rastrelli-gallery', path: 'lm/floor.ktx2' },
      { kind: 'decode', roomId: 'rastrelli-gallery', path: 'lm/walls.ktx2' },
    ]);
  });

  it('decodes only lm rows — the probe row is fetched but never scheduled for decode', () => {
    const state = noteManifest(emptyPrefetchState, 'jordan', JORDAN_ROWS);
    const { units } = drain(state, [toJordan]);
    expect(units.filter((unit) => unit.kind === 'decode')).toEqual([
      { kind: 'decode', roomId: 'jordan', path: 'lm/steps.ktx2' },
    ]);
  });

  it('finishes the first neighbour before touching the second', () => {
    const noted = noteManifest(
      noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS),
      'jordan',
      JORDAN_ROWS,
    );
    const { units } = drain(noted, [toGallery, toJordan]);
    const firstJordan = units.findIndex((unit) => unit.roomId === 'jordan');
    const lastGallery = units.map((unit) => unit.roomId).lastIndexOf('rastrelli-gallery');
    expect(lastGallery).toBeLessThan(firstJordan);
    expect(units.filter((unit) => unit.roomId === 'jordan')).toHaveLength(JORDAN_ROWS.length + 1);
  });

  it('follows the neighbours order, not the note order', () => {
    const noted = noteManifest(
      noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS),
      'jordan',
      JORDAN_ROWS,
    );
    const step = planPrefetch(noted, {
      settled: 'square',
      neighbors: [toJordan, toGallery],
      busy: false,
    });
    expect(step.unit).toEqual({ kind: 'glb', roomId: 'jordan' });
  });
});

describe('planPrefetch — skips', () => {
  it('yields nothing while the chain is busy, and leaves the state untouched', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const step = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: true });
    expect(step.unit).toBeNull();
    expect(step.state).toBe(state);
  });

  it('yields nothing when every neighbour is fully staged', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const drained = drain(state, [toGallery]);
    const step = planPrefetch(drained.state, {
      settled: 'square',
      neighbors: [toGallery],
      busy: false,
    });
    expect(step.unit).toBeNull();
    expect(step.state).toBe(drained.state);
  });

  it('skips a dead end — a neighbour with to: null has no room to prefetch', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const step = planPrefetch(state, {
      settled: 'square',
      neighbors: [deadEnd, toGallery],
      busy: false,
    });
    expect(step.unit).toEqual({ kind: 'glb', roomId: 'rastrelli-gallery' });
  });

  it('never plans the square — the resident is never prefetched', () => {
    const step = planPrefetch(emptyPrefetchState, {
      settled: 'rastrelli-gallery',
      neighbors: [toSquare],
      busy: false,
    });
    expect(step.unit).toBeNull();
  });

  it('never plans the settled room itself', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const step = planPrefetch(state, {
      settled: 'rastrelli-gallery',
      neighbors: [toGallery],
      busy: false,
    });
    expect(step.unit).toBeNull();
  });

  it('yields nothing for an empty neighbours list', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    expect(planPrefetch(state, { settled: 'square', neighbors: [], busy: false }).unit).toBeNull();
  });
});

describe('planPrefetch — never evict, never shrink', () => {
  it('grows the state monotonically across a full drain', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    let current = state;
    let fetched = 0;
    for (let i = 0; i < 16; i += 1) {
      const step = planPrefetch(current, {
        settled: 'square',
        neighbors: [toGallery],
        busy: false,
      });
      const stage = step.state.rooms.get('rastrelli-gallery');
      expect(stage).toBeDefined();
      const done = [...(stage?.files.values() ?? [])].filter((v) => v === 'fetched').length;
      expect(done).toBeGreaterThanOrEqual(fetched);
      fetched = done;
      current = step.state;
      if (step.unit === null) break;
    }
    const final = current.rooms.get('rastrelli-gallery');
    expect(final?.files.size).toBe(GALLERY_ROWS.length - 1);
    expect([...(final?.files.values() ?? [])].every((v) => v === 'fetched')).toBe(true);
    expect(final?.glb).toBe('fetched');
    expect([...(final?.decodes.values() ?? [])].every((v) => v === 'decoded')).toBe(true);
  });

  it('never mutates the input state — planPrefetch returns a fresh state object', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const before = state.rooms.get('rastrelli-gallery');
    const step = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: false });
    expect(step.state).not.toBe(state);
    expect(before?.glb).toBe('pending');
  });

  it('keeps a staged room staged when it drops out of the neighbours and returns', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const first = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: false });
    const away = planPrefetch(first.state, { settled: 'square', neighbors: [], busy: false });
    const back = planPrefetch(away.state, {
      settled: 'square',
      neighbors: [toGallery],
      busy: false,
    });
    expect(back.unit).toEqual({ kind: 'ktx2', roomId: 'rastrelli-gallery', path: 'lm/floor.ktx2' });
  });
});

describe('planPrefetch — determinism', () => {
  it('returns the same unit for the same inputs', () => {
    const state = noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS);
    const a = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: false });
    const b = planPrefetch(state, { settled: 'square', neighbors: [toGallery], busy: false });
    expect(a.unit).toEqual(b.unit);
  });

  it('drains two independent runs into identical unit sequences', () => {
    const noted = noteManifest(
      noteManifest(emptyPrefetchState, 'rastrelli-gallery', GALLERY_ROWS),
      'jordan',
      JORDAN_ROWS,
    );
    expect(drain(noted, [toGallery, toJordan]).units).toEqual(
      drain(noted, [toGallery, toJordan]).units,
    );
  });
});

describe('noteManifest — loud failures', () => {
  it('rejects an unknown roomId', () => {
    expect(() => noteManifest(emptyPrefetchState, 'hermitage' as never, GALLERY_ROWS)).toThrow(
      /unknown roomId/,
    );
  });

  it('rejects the resident handle', () => {
    expect(() => noteManifest(emptyPrefetchState, 'square' as never, GALLERY_ROWS)).toThrow(
      /unknown roomId/,
    );
  });

  it('rejects an empty row list', () => {
    expect(() => noteManifest(emptyPrefetchState, 'jordan', [])).toThrow(/no rows/);
  });

  it('rejects a malformed row path', () => {
    expect(() =>
      noteManifest(emptyPrefetchState, 'jordan', [...JORDAN_ROWS, { ...JORDAN_ROWS[0], path: '' }]),
    ).toThrow(/malformed row path/);
  });

  it('rejects a repeated ktx2 row', () => {
    expect(() =>
      noteManifest(emptyPrefetchState, 'jordan', [...JORDAN_ROWS, JORDAN_ROWS[1]]),
    ).toThrow(/repeats row/);
  });

  it('rejects a manifest with no glb row', () => {
    expect(() => noteManifest(emptyPrefetchState, 'jordan', JORDAN_ROWS.slice(1))).toThrow(
      /no glb row/,
    );
  });

  it('rejects a manifest with two glb rows', () => {
    expect(() =>
      noteManifest(emptyPrefetchState, 'jordan', [...JORDAN_ROWS, JORDAN_ROWS[0]]),
    ).toThrow(/two glb rows/);
  });

  it('rejects a duplicate note for the same room', () => {
    const state = noteManifest(emptyPrefetchState, 'jordan', JORDAN_ROWS);
    expect(() => noteManifest(state, 'jordan', JORDAN_ROWS)).toThrow(/duplicate note/);
  });

  it('rejects a non-boolean busy flag', () => {
    expect(() =>
      planPrefetch(emptyPrefetchState, {
        settled: 'square',
        neighbors: [toGallery],
        busy: 'no' as never,
      }),
    ).toThrow(/busy must be a boolean/);
  });
});

describe('src/world/prefetch.ts — the purity fence', () => {
  const source = readFileSync(new URL('../src/world/prefetch.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');

  it('imports nothing but types from the registry', () => {
    const imports = source.match(/^import[\s\S]*?;$/gm) ?? [];
    expect(imports.every((line) => line.startsWith('import type'))).toBe(true);
    expect(source).not.toMatch(/from\s+''three/);
    expect(source).not.toMatch(/node:/);
  });

  it('touches no host surface and no clock', () => {
    expect(source).not.toMatch(/\b(document|window|localStorage|performance|Date|setTimeout)\b/);
    expect(source).not.toMatch(/\bsetInterval\b|\brequestAnimationFrame\b/);
    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/\bfetch\b/);
  });

  it('exports no default and declares no enum', () => {
    expect(source).not.toMatch(/export\s+default/);
    expect(source).not.toMatch(/\benum\b/);
  });
});
