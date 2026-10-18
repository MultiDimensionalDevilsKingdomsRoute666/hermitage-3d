// tests/engine-ledger.test.ts
/**
 * Disposal ledger — pure core laws (design-staircase.md §8.3, assertion layer 1):
 * register/replace, release idempotence, bytesByScope, deterministic snapshot, and the
 * purity gate (no three, no node, no DOM, no clock, no timers, no randomness).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createLedger, type LedgerRow } from '../src/engine/ledger';

describe('createLedger', () => {
  it('accumulates rows across kinds and scopes', () => {
    const ledger = createLedger();
    ledger.register('rastrelli-gallery', 'glb', 1_000, 'rastrelli-gallery.glb');
    ledger.register('rastrelli-gallery', 'ktx2', 250, 'tex/wall.ktx2');
    ledger.register('jordan', 'glb', 4_000, 'jordan.glb');
    ledger.register('engine', 'texture', 64, 'engine/noise.ktx2');
    expect(ledger.bytesByScope('rastrelli-gallery')).toBe(1_250);
    expect(ledger.bytesByScope('jordan')).toBe(4_000);
    expect(ledger.bytesByScope('engine')).toBe(64);
    expect(ledger.snapshot().total).toBe(5_314);
    expect(ledger.snapshot().rows).toHaveLength(4);
  });
  it('replaces a re-registered (scope, kind, label) instead of double counting', () => {
    const ledger = createLedger();
    ledger.register('rastrelli-gallery', 'glb', 1_000, 'rastrelli-gallery.glb');
    ledger.register('rastrelli-gallery', 'glb', 1_500, 'rastrelli-gallery.glb');
    expect(ledger.bytesByScope('rastrelli-gallery')).toBe(1_500);
    expect(ledger.snapshot().rows).toHaveLength(1);
    // Same label under a different kind or scope is a distinct row.
    ledger.register('rastrelli-gallery', 'ktx2', 10, 'rastrelli-gallery.glb');
    ledger.register('jordan', 'glb', 20, 'rastrelli-gallery.glb');
    expect(ledger.snapshot().rows).toHaveLength(3);
  });
  it('throws RangeError on non-finite bytes, negative bytes and an empty label', () => {
    const ledger = createLedger();
    expect(() => ledger.register('engine', 'glb', Number.NaN, 'a')).toThrow(RangeError);
    expect(() => ledger.register('engine', 'glb', Number.POSITIVE_INFINITY, 'a')).toThrow(
      RangeError,
    );
    expect(() => ledger.register('engine', 'glb', -1, 'a')).toThrow(RangeError);
    expect(() => ledger.register('engine', 'glb', 1, '')).toThrow(RangeError);
    expect(ledger.snapshot().total).toBe(0);
    // Zero bytes is a legal row (an empty payload is still a registered payload).
    expect(() => ledger.register('engine', 'glb', 0, 'a')).not.toThrow();
  });
  it('release clears exactly that scope and is a no-op the second time', () => {
    const ledger = createLedger();
    ledger.register('rastrelli-gallery', 'glb', 1_000, 'rastrelli-gallery.glb');
    ledger.register('rastrelli-gallery', 'ktx2', 500, 'tex/wall.ktx2');
    ledger.register('jordan', 'glb', 4_000, 'jordan.glb');
    ledger.release('rastrelli-gallery');
    expect(ledger.bytesByScope('rastrelli-gallery')).toBe(0);
    expect(ledger.bytesByScope('jordan')).toBe(4_000);
    expect(() => ledger.release('rastrelli-gallery')).not.toThrow();
    expect(() => ledger.release('engine')).not.toThrow();
    expect(ledger.snapshot().total).toBe(4_000);
  });
  it('bytesByScope sums the scope and returns 0 for an unknown scope', () => {
    const ledger = createLedger();
    expect(ledger.bytesByScope('jordan')).toBe(0);
    ledger.register('jordan', 'glb', 7, 'a');
    ledger.register('jordan', 'ktx2', 8, 'b');
    ledger.register('jordan', 'ktx2', 9, 'c');
    expect(ledger.bytesByScope('jordan')).toBe(24);
    expect(ledger.bytesByScope('engine')).toBe(0);
  });
  it('snapshot rows are sorted by scope, kind, label and total is their sum', () => {
    const ledger = createLedger();
    ledger.register('jordan', 'ktx2', 1, 'z.ktx2');
    ledger.register('rastrelli-gallery', 'ktx2', 2, 'b.ktx2');
    ledger.register('rastrelli-gallery', 'ktx2', 3, 'a.ktx2');
    ledger.register('rastrelli-gallery', 'glb', 4, 'g.glb');
    ledger.register('engine', 'texture', 5, 'n.ktx2');
    const { rows, total } = ledger.snapshot();
    // Plain string comparison: 'engine' < 'jordan' < 'rastrelli-gallery'.
    expect(rows.map((r) => [r.scope, r.kind, r.label])).toEqual([
      ['engine', 'texture', 'n.ktx2'],
      ['jordan', 'ktx2', 'z.ktx2'],
      ['rastrelli-gallery', 'glb', 'g.glb'],
      ['rastrelli-gallery', 'ktx2', 'a.ktx2'],
      ['rastrelli-gallery', 'ktx2', 'b.ktx2'],
    ]);
    expect(total).toBe(15);
    // Insertion order does not leak into the snapshot.
    const other = createLedger();
    for (const r of [...ledger.snapshot().rows].reverse()) {
      other.register(r.scope, r.kind, r.bytes, r.label);
    }
    expect(other.snapshot()).toEqual(ledger.snapshot());
  });
  it('the returned snapshot cannot mutate the ledger', () => {
    const ledger = createLedger();
    ledger.register('rastrelli-gallery', 'glb', 100, 'rastrelli-gallery.glb');
    const snap = ledger.snapshot();
    const rows = snap.rows as LedgerRow[];
    rows.push({ scope: 'rastrelli-gallery', kind: 'ktx2', bytes: 900, label: 'injected' });
    expect(ledger.bytesByScope('rastrelli-gallery')).toBe(100);
    expect(ledger.snapshot().rows).toHaveLength(1);
    expect(ledger.snapshot().rows).not.toBe(snap.rows);
  });
});

describe('ledger purity gate', () => {
  const source = readFileSync(new URL('../src/engine/ledger.ts', import.meta.url), 'utf8');
  const noComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const noStrings = noComments
    .replace(/'(?:\\.|[^'\\\n])*'/g, '0')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '0')
    .replace(/`(?:\\.|[^`\\])*`/g, '0');
  it('imports nothing from three or node', () => {
    expect(noComments).not.toMatch(/from\s+['"]three/);
    expect(noComments).not.toMatch(/['"]node:/);
  });
  it('touches no DOM, clock, storage, timers or randomness', () => {
    expect(noStrings).not.toMatch(/\b(document|window|localStorage|performance|Date|setTimeout)\b/);
    expect(noStrings).not.toMatch(/Math\.random/);
  });
});
