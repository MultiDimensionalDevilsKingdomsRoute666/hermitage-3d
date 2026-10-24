// tests/rooms/1812-kit-layout.test.ts
// The 1812 kit's runtime classification — design-gallery.md §3.2/§3.3 (the merge law's
// buckets). Vitest node style, no jsdom. The wall law reads the NAME (the part's frame
// index into rooms/1812/layout.ts's allFrames()), never a geometry centroid: the usable
// wall range is inset from the modelled ends, so bay-0 columns classify north and bay-10
// columns south of it by centroid, and a centroid read misclassifies the end bays.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { indexOfName, KIT_WALLS, roleOf, wallOfName } from '../../rooms/1812/kit-layout';
import { allFrames, kitFrames } from '../../rooms/1812/layout';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

describe('kit roles (the part-name prefix law)', () => {
  it('frame_ and canvas_ prefixes are the kit; everything else is architecture', () => {
    expect(roleOf('frame_000')).toBe('frame');
    expect(roleOf('frame_334')).toBe('frame');
    expect(roleOf('canvas_000')).toBe('canvas');
    expect(roleOf('canvas_334')).toBe('canvas');
    // The committed architecture names (the glb's 17 parts, §2.2 inventory).
    expect(roleOf('torchere_candles')).toBe('architecture');
    expect(roleOf('door_leaves')).toBe('architecture');
    expect(roleOf('floor')).toBe('architecture');
  });

  it('every kit part name carries its frame index; architecture carries none', () => {
    expect(indexOfName('frame_000')).toBe(0);
    expect(indexOfName('canvas_334')).toBe(334);
    expect(indexOfName('wall_plaster')).toBeNull();
  });
});

describe('kit walls (the layout law by index, §3.3)', () => {
  it('the two long walls read west/east off the frame index', () => {
    // The west wall's frames are allFrames()[0..164], the east wall's [165..329].
    expect(wallOfName('frame_000')).toBe('west');
    expect(wallOfName('canvas_000')).toBe('west');
    expect(wallOfName('frame_164')).toBe('west');
    expect(wallOfName('frame_165')).toBe('east');
    expect(wallOfName('frame_329')).toBe('east');
  });

  it('the north pair (the flanking frames) reads north', () => {
    expect(wallOfName('frame_330')).toBe('north');
    expect(wallOfName('canvas_331')).toBe('north');
  });

  it('the end-wall group lives with H3: the allies and the K8 portal ride south → h3', () => {
    expect(wallOfName('frame_332')).toBe('h3');
    expect(wallOfName('frame_333')).toBe('h3');
    expect(wallOfName('frame_334')).toBe('h3');
  });

  it('a kit part outside the layout\u2019s index range classifies nowhere (loud at mount)', () => {
    expect(wallOfName('frame_335')).toBeNull();
    expect(wallOfName('torchere_candles')).toBeNull();
  });

  it('the four merge buckets are west, east, north, h3 — in that order', () => {
    expect([...KIT_WALLS]).toEqual(['west', 'east', 'north', 'h3']);
  });

  it('every committed frame index lands in exactly one bucket', () => {
    const buckets = new Set(KIT_WALLS);
    const frames = allFrames();
    expect(frames.length).toBe(335); // frame_000..frame_334, the glb's kit count
    for (let index = 0; index < frames.length; index += 1) {
      const wall = wallOfName(`frame_${String(index).padStart(3, '0')}`);
      expect(wall !== null && buckets.has(wall), `frame ${index}`).toBe(true);
    }
    expect(kitFrames().length).toBe(334); // all but the K8 portal frame (its strips are R4's)
  });
});

describe('purity of rooms/1812/kit-layout.ts', () => {
  const source = readFileSync(`${repoRoot}/rooms/1812/kit-layout.ts`, 'utf8');

  function stripCommentsAndStrings(text: string): string {
    const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const noLine = noBlock.replace(/\/\/[^\n]*/g, ' ');
    const noTemplate = noLine.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "''");
    const noDouble = noTemplate.replace(/"(?:\\[\s\S]|[^\\"])*"/g, "''");
    return noDouble.replace(/'(?:\\[\s\S]|[^\\'])*'/g, "''");
  }

  const scanned = stripCommentsAndStrings(source);

  it('imports only the layout law — no three, no node, no DOM imports', () => {
    expect(source).not.toMatch(/from\s+'three/);
    expect(source).not.toMatch(/from\s+'node:/);
    expect(source).not.toMatch(/require\(/);
    // Every import specifier is relative (today exactly the one: ./layout).
    const specifiers = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '');
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) expect(specifier.startsWith('./'), specifier).toBe(true);
    expect(specifiers).toContain('./layout');
  });

  it('touches no DOM, no clock and no randomness', () => {
    const banned = [
      'document',
      'window',
      'localStorage',
      'performance',
      'Date',
      'setTimeout',
      'Math.random',
    ];
    for (const token of banned) {
      expect(scanned.includes(token)).toBe(false);
    }
  });

  it('exports by name only and keeps the state laws in comments', () => {
    expect(scanned).not.toMatch(/export\s+default/);
    expect(source).toMatch(/export function roleOf/);
    expect(source).not.toMatch(/Math\.random/);
  });
});
