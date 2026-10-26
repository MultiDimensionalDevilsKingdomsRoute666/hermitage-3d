// tests/rooms/1812-lightmaps.test.ts
// R4 (design-gallery.md §4.6, D-7): the six committed ktx2 headers pin the split's
// resolution law and the no-mip bake law — the architecture chart = the manifest's res,
// the kit chart = the layout law's lightmap.sizePx (the one home the kit res already has,
// D-7: not duplicated into the manifest), levelCount = 1 (toktx --genmipmap OFF — a mip
// chain bleeds across the 2 px cell pads), BasisLZ supercompression (ETC1S). Header reads
// only — no toktx, no Blender; the rows exist once the bake publishes (all-or-nothing).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const roomDir = resolve(repoRoot, 'public/assets/military-gallery');

type Manifest = { lightmaps: { states: string[]; res: number | null } };
type Layout = { lightmap: { sizePx: number } };

const manifestPath = resolve(roomDir, 'manifest.json');
const manifest = exists(manifestPath)
  ? (JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest)
  : null;
const layout = JSON.parse(
  readFileSync(resolve(repoRoot, 'tools/gallery/layout.json'), 'utf8'),
) as Layout;

function exists(path: string): boolean {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

/** The baked set exists only when the manifest names its states (the all-or-nothing law). */
const baked = manifest !== null && manifest.lightmaps.states.length === 3;
const only = describe.skipIf(!baked);

const U32 = (buf: Buffer, at: number): number => buf.readUInt32LE(at);

function headerOf(rel: string): { width: number; height: number; levels: number; scheme: number } {
  const buf = readFileSync(resolve(roomDir, rel));
  expect([...buf.subarray(0, 4)], `${rel} magic`).toEqual([0xab, 0x4b, 0x54, 0x58]); // «KTX
  return {
    width: U32(buf, 20),
    height: U32(buf, 24),
    levels: U32(buf, 40),
    scheme: U32(buf, 44),
  };
}

only('the 1812 lightmaps (six committed ktx2 headers)', () => {
  it('the architecture chart matches the manifest res', () => {
    expect(manifest?.lightmaps.res, 'manifest res').toBeGreaterThan(0);
    for (const file of ['day', 'dusk', 'night']) {
      const header = headerOf(`lm/${file}.ktx2`);
      expect(header.width, `lm/${file}.ktx2 width`).toBe(manifest?.lightmaps.res);
      expect(header.height, `lm/${file}.ktx2 is square`).toBe(header.width);
    }
  });
  it('the kit chart matches the layout law sizePx', () => {
    for (const file of ['day', 'dusk', 'night']) {
      const header = headerOf(`lm/kit-${file}.ktx2`);
      expect(header.width, `lm/kit-${file}.ktx2 width`).toBe(layout.lightmap.sizePx);
      expect(header.height, `lm/kit-${file}.ktx2 is square`).toBe(header.width);
    }
  });
  it('every level carries exactly one mip (the no-mip law) and BasisLZ compression', () => {
    for (const file of ['day', 'dusk', 'night']) {
      for (const rel of [`lm/${file}.ktx2`, `lm/kit-${file}.ktx2`]) {
        const header = headerOf(rel);
        expect(header.levels, `${rel} levelCount`).toBe(1);
        expect(header.scheme, `${rel} supercompressionScheme (BasisLZ)`).toBe(1);
      }
    }
  });
});
