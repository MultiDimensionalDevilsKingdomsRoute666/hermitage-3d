/*
 * Phase 3 R2 — portrait atlas verification (design-gallery §3.4/§3.5, §10 R2 gate; DEC-024,
 * DEC-030): pure-law determinism against the committed digest pin (no toktx in CI), slot-law
 * interplay with rooms/1812/layout.ts, the law module's purity fence, the committed artifact's
 * manifest row (≤ 0.7 MB, KTX 2.0 magic) and the license register row.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import * as layout from '../rooms/1812/layout';
import {
  ATLAS_COLUMNS,
  ATLAS_GUTTER_PX,
  ATLAS_INSET_PX,
  ATLAS_ROWS,
  ATLAS_SIZE_PX,
  encodePng,
  GUTTER_RGB,
  hash32,
  MISSING_SLOT,
  paintAtlas,
  rosterSlots,
  SALT_1812,
  SLOT_H_PX,
  SLOT_W_PX,
  SUPER_BLOCK_COUNT,
  SUPER_BLOCK_SLOTS,
  slotRoles,
  standInParams,
} from '../tools/gallery/atlas-law.mjs';

const sha256 = (b: Uint8Array | Buffer) => createHash('sha256').update(b).digest('hex');
const ROOT = resolve(__dirname, '..');
const LAW_PATH = resolve(ROOT, 'tools/gallery/atlas-law.mjs');
const DIGEST_PATH = resolve(ROOT, 'tools/gallery/atlas.digest.json');
const REGISTER_PATH = resolve(ROOT, 'docs/artistic-license.md');
const ROOM = resolve(ROOT, 'public/assets/military-gallery');
const ATLAS_REL = 'tex/military-gallery-portraits.ktx2';
const ATLAS_BYTES_MAX = 700_000; // §10 R2 exit gate
const KTX2_MAGIC = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

let atlas: Uint8Array | null = null;
const atlasOnce = () => {
  atlas ??= paintAtlas();
  return atlas;
};

describe('atlas law ↔ layout law (§3.4)', () => {
  it('re-declares the committed layout constants', () => {
    expect([ATLAS_SIZE_PX, ATLAS_COLUMNS, ATLAS_ROWS, SLOT_W_PX, SLOT_H_PX]).toEqual([
      layout.ATLAS_SIZE_PX,
      layout.ATLAS_COLUMNS,
      layout.ATLAS_ROWS,
      layout.SLOT_W_PX,
      layout.SLOT_H_PX,
    ]);
    expect([
      ATLAS_GUTTER_PX,
      ATLAS_INSET_PX,
      SUPER_BLOCK_SLOTS,
      SUPER_BLOCK_COUNT,
      MISSING_SLOT,
    ]).toEqual([
      layout.ATLAS_GUTTER_PX,
      layout.ATLAS_INSET_PX,
      layout.SUPER_BLOCK_SLOTS,
      layout.SUPER_BLOCK_COUNT,
      layout.MISSING_SLOT,
    ]);
  });

  it('ranks the roster exactly as slotOfRank and marks spare/missing/block cells', () => {
    const roles = slotRoles();
    const roster = rosterSlots();
    expect(roles).toHaveLength(357);
    expect(roster).toHaveLength(332);
    roster.forEach((slot, rank) => {
      expect(slot).toBe(layout.slotOfRank(rank));
    });
    expect([roster[0], roster[331]]).toEqual([6, 343]);
    expect(roles.slice(344, 356).every((r) => r === 'spare')).toBe(true);
    expect(roles.filter((r) => r === 'spare')).toHaveLength(12);
    expect(roles[356]).toBe('missing');
    for (let b = 0; b < 3; b += 1) {
      for (const s of layout.superBlockSlots(b)) expect(roles[s]).toBe('block');
    }
  });
});

describe('hash law (DEC-024)', () => {
  it('is salted, repeatable and collision-free over the grid', () => {
    expect(hash32(SALT_1812, 7)).toBe(hash32(SALT_1812, 7));
    expect(hash32(SALT_1812, 7)).not.toBe(hash32(`${SALT_1812}.`, 7));
    expect(new Set(Array.from({ length: 357 }, (_v, i) => hash32(SALT_1812, i))).size).toBe(357);
  });

  it('maps every cell into the §3.5 domains', () => {
    for (let s = 0; s < 357; s += 1) {
      const p = standInParams(s);
      expect(p.silhouette).toBeLessThan(3);
      expect(p.shoulder).toBeLessThan(3);
      expect(p.uniform).toBeLessThan(6);
      expect(p.facing).toBeLessThan(4);
      expect(p.umber).toBeLessThan(3);
      expect(p.face).toBeLessThan(4);
      expect(Math.abs(p.headOffset)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.umberValue - 1)).toBeLessThanOrEqual(0.08 + 1e-9);
    }
  });
});

describe('rasteriser (§3.5, DEC-024)', () => {
  it('reruns byte-identically and matches the committed digest pin', () => {
    const a = atlasOnce();
    const digest = sha256(a);
    expect(sha256(paintAtlas())).toBe(digest);
    const pin = JSON.parse(readFileSync(DIGEST_PATH, 'utf8')) as {
      salt: string;
      rgbaSha256: string;
      pngSha256: string;
      pngBytes: number;
    };
    expect(pin.salt).toBe(SALT_1812);
    expect(digest).toBe(pin.rgbaSha256);
    const png = encodePng(a, ATLAS_SIZE_PX, ATLAS_SIZE_PX);
    expect([sha256(png), png.length]).toEqual([pin.pngSha256, pin.pngBytes]);
  }, 180_000);

  it('paints gutters and the never-a-cell strips with GUTTER_RGB', () => {
    const a = atlasOnce();
    const px = (x: number, y: number) =>
      Array.from(a.subarray((y * 2048 + x) * 4, (y * 2048 + x) * 4 + 3));
    // The gutter is the 2-px border of every painted rect: a cell's outer edge, and the BLOCK's
    // outer edge only — block interiors are one continuous equestrian field (no inner seams).
    for (const [x, y] of [
      [0, 0],
      [1, 121],
      [2040, 1000],
      [500, 2044],
    ]) {
      expect(px(x ?? 0, y ?? 0)).toEqual([...GUTTER_RGB]);
    }
    expect(px(48, 60)).not.toEqual([...GUTTER_RGB]); // block interior, sky/ground
    expect(px(97, 121)).not.toEqual([...GUTTER_RGB]); // block interior, the rider's torso
  }, 180_000);

  it('encodes a stored-deflate RGB PNG', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 8, 7, 255]);
    const png = encodePng(rgba, 2, 2);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect([png[24], png[25]]).toEqual([8, 2]);
    const idatLen = new DataView(png.buffer).getUint32(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLen));
    expect(Array.from(raw)).toEqual([0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 9, 8, 7]);
  });
});

describe('purity fence (DEC-024)', () => {
  function stripCommentsAndStrings(text: string): string {
    const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const noLine = noBlock.replace(/\/\/[^\n]*/g, ' ');
    const noTemplate = noLine.replace(/`(?:\\[\s\S]|[^\\`])*`/g, "''");
    const noDouble = noTemplate.replace(/"(?:\\[\s\S]|[^\\"])*"/g, "''");
    return noDouble.replace(/'(?:\\[\s\S]|[^\\'])*'/g, "''");
  }

  const source = readFileSync(LAW_PATH, 'utf8');
  const scanned = stripCommentsAndStrings(source);

  it('imports nothing at all', () => {
    expect(source).not.toMatch(/^import\s/m);
    expect(scanned).not.toMatch(/from\s+'/);
  });

  it('uses no randomness, no engine-variant math, no process, no console, no require', () => {
    const banned = [
      'Math.random',
      'Math.sin(',
      'Math.cos(',
      'Math.tan(',
      'Math.exp(',
      'Math.pow(',
      'Math.log(',
      '**',
      'process.',
      'console.',
      'require(',
      'Date',
    ];
    for (const token of banned) {
      expect(scanned.includes(token), token).toBe(false);
    }
  });
});

describe('committed artifact (§10 R2 exit gate)', () => {
  const manifest = JSON.parse(readFileSync(resolve(ROOM, 'manifest.json'), 'utf8')) as {
    files: { path: string; bytes: number; kind: string }[];
  };

  it('lists the atlas as a ktx2 row within 0.7 MB, bytes matching disk', () => {
    const row = manifest.files.find((f) => f.path === ATLAS_REL);
    expect(row?.kind).toBe('ktx2');
    expect(row?.bytes).toBeLessThanOrEqual(ATLAS_BYTES_MAX);
    expect(statSync(resolve(ROOM, ATLAS_REL)).size).toBe(row?.bytes);
  });

  it('is a KTX 2.0 container', () => {
    expect(Array.from(readFileSync(resolve(ROOM, ATLAS_REL)).subarray(0, 12))).toEqual(KTX2_MAGIC);
  });
});

describe('license register (DEC-030)', () => {
  it('declares the v1 stand-ins, the all-332 rule and the v2 importer path', () => {
    const row = readFileSync(REGISTER_PATH, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('- **Portrait atlas'));
    for (const word of ['stand-in', 'DEC-030', '332', 'v2', 'public-domain']) {
      expect(row).toContain(word);
    }
  });
});
