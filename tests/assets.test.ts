/// <reference types="node" />
// Asset-chain fence — design-staircase.md §3.2 rule 5. Validates COMMITTED artifacts only:
// manifest contract, bytes + sha256 recompute, GLB/KTX2 markers, declared caps, payload-budget rows.
// Blender, toktx and gltf-transform never run here.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

type FileRow = { path: string; bytes: number; sha256: string; kind: 'glb' | 'ktx2' | 'manifest' };
type Geometry = {
  meshes: { name: string; instances: number; primitives: number; triangles: number }[];
  trianglesUnique: number;
  trianglesDrawn: number;
  extensionsRequired: string[];
};
type Manifest = {
  id: string;
  files: FileRow[];
  geometry: Geometry;
  lightmaps: { states: string[]; res: number | null; intensity: number | null };
  budget: { trianglesMax: number; textureBytesMax: number; payloadBytesMax: number };
  toolchain: Record<'blender' | 'toktx' | 'gltfTransformCli' | 'three', string>;
};
type GltfJson = {
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  buffers?: { uri?: string; byteLength: number }[];
  images?: { uri?: string; mimeType?: string }[];
  textures?: { source?: number; extensions?: Record<string, unknown> }[];
  meshes: { name?: string; primitives: { attributes: Record<string, number> }[] }[];
};
type PayloadRow = {
  id: string;
  row: 'room' | 'exterior' | 'shared';
  bytes: number;
  cap: number;
  ok: boolean;
  error?: string;
};
type Common = {
  PLACEHOLDER: RegExp;
  KTX2_MAGIC: Uint8Array;
  ROOM_CAP_MAX: number;
  parseGlbJson: (buf: Buffer) => GltfJson;
  geometrySummary: (json: GltfJson) => Geometry;
  collectPayloadRows: (publicDir: string) => PayloadRow[];
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHECK_DIR = join(ROOT, 'public', 'assets', '_check');
const MANIFEST = join(CHECK_DIR, 'manifest.json');
const TOOLCHAIN_KEYS = ['blender', 'toktx', 'gltfTransformCli', 'three'] as const;
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');
const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));
const walk = (dir: string, base = dir): string[] =>
  readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory()
        ? walk(p, base)
        : [
            p
              .slice(base.length + 1)
              .split('\\')
              .join('/'),
          ];
    });

// Non-literal specifier: TS types it as any, so no declaration file is needed for the .mjs.
// Top-level await (not beforeAll): describe-scope consumers below run at collection time.
const common = (await import(join(ROOT, 'tools', 'common.mjs'))) as unknown as Common;

describe('tools/toolchain.json', () => {
  const tc = readJson(join(ROOT, 'tools', 'toolchain.json')) as Record<string, unknown>;
  it('has exactly the four pins as strings', () => {
    expect(Object.keys(tc).sort()).toEqual([...TOOLCHAIN_KEYS].sort());
    for (const k of TOOLCHAIN_KEYS) expect(typeof tc[k]).toBe('string');
  });
  it('pins three to the installed dependency', () => {
    const pkg = readJson(join(ROOT, 'package.json')) as { dependencies: Record<string, string> };
    expect(tc.three).toBe(pkg.dependencies.three);
  });
  it('blender and toktx are real versions, not placeholders', () => {
    expect(common.PLACEHOLDER.test(String(tc.blender))).toBe(false);
    expect(common.PLACEHOLDER.test(String(tc.toktx))).toBe(false);
  });
});

// Generic room fence: every committed room directory with a manifest (canary + real rooms)
// validates its contract rows, byte counts and sha256 recompute. Room-specific CONTENT assertions
// live in the canary block below.
const ROOMS_DIR = join(ROOT, 'public', 'assets');
const committedRooms = existsSync(ROOMS_DIR)
  ? readdirSync(ROOMS_DIR)
      .sort()
      .filter((n) => existsSync(join(ROOMS_DIR, n, 'manifest.json')))
  : [];

describe.each(committedRooms)('public/assets/%s (room contract)', (room) => {
  const dir = join(ROOMS_DIR, room);
  const manifest = readJson(join(dir, 'manifest.json')) as Manifest;
  it('manifest contract (§8.1): keys, id, lightmaps shape, budget shape', () => {
    expect(manifest.id).toBe(room);
    expect(Object.keys(manifest).sort()).toEqual([
      'budget',
      'files',
      'geometry',
      'id',
      'lightmaps',
      'toolchain',
    ]);
    expect(manifest.lightmaps).toEqual({ states: [], res: null, intensity: null });
    expect(manifest.budget.trianglesMax).toBeGreaterThan(0);
    expect(manifest.budget.textureBytesMax).toBeGreaterThan(0);
    expect(manifest.budget.payloadBytesMax).toBeGreaterThan(0);
    expect(manifest.budget.payloadBytesMax).toBeLessThanOrEqual(common.ROOM_CAP_MAX);
  });
  it('rows recompute to the committed bytes + sha256, sorted, no unlisted artifacts', () => {
    const onDisk = walk(dir).filter((p) => p !== 'manifest.json');
    expect(manifest.files.map((f) => f.path)).toEqual(onDisk);
    for (const f of manifest.files) {
      const buf = readFileSync(join(dir, f.path));
      expect(buf.length, f.path).toBe(f.bytes);
      expect(sha(buf), f.path).toBe(f.sha256);
    }
  });
  it('geometry summary matches the committed glb', () => {
    const glbRow = manifest.files.find((f) => f.kind === 'glb');
    const json = common.parseGlbJson(readFileSync(join(dir, glbRow?.path ?? '')));
    expect(common.geometrySummary(json)).toEqual(manifest.geometry);
  });
  it('single-buffer GLB (strict GLB rule)', () => {
    const glbRow = manifest.files.find((f) => f.kind === 'glb');
    const json = common.parseGlbJson(readFileSync(join(dir, glbRow?.path ?? '')));
    expect(json.buffers?.length).toBe(1);
    expect(json.buffers?.[0]?.uri).toBeUndefined();
  });
});

describe('public/assets/_check canary', () => {
  it('is committed (run pnpm asset once and commit public/assets/_check)', () => {
    expect(existsSync(MANIFEST)).toBe(true);
  });
  const manifest = existsSync(MANIFEST) ? (readJson(MANIFEST) as Manifest) : null;
  const only = describe.skipIf(manifest === null);

  only('manifest contract (§8.1)', () => {
    const m = manifest as Manifest;
    it('has id, files, geometry, lightmaps, budget, toolchain', () => {
      expect(m.id).toBe('_check');
      expect(Object.keys(m).sort()).toEqual([
        'budget',
        'files',
        'geometry',
        'id',
        'lightmaps',
        'toolchain',
      ]);
      expect(m.lightmaps).toEqual({ states: [], res: null, intensity: null });
      expect(m.budget).toEqual({
        trianglesMax: 5000,
        textureBytesMax: 500000,
        payloadBytesMax: 500000,
      });
    });
    it('rows are well-formed and sorted by path', () => {
      expect(m.files.length).toBeGreaterThanOrEqual(2);
      for (const f of m.files) {
        expect(['glb', 'ktx2']).toContain(f.kind);
        expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(Number.isInteger(f.bytes) && f.bytes > 0).toBe(true);
        expect(f.path.startsWith('/') || f.path.includes('..')).toBe(false);
      }
      expect(m.files.map((f) => f.path)).toEqual([...m.files.map((f) => f.path)].sort());
    });
    it('toolchain copies toolchain.json verbatim with no placeholders', () => {
      const tc = readJson(join(ROOT, 'tools', 'toolchain.json')) as Manifest['toolchain'];
      expect(m.toolchain).toEqual(tc);
      for (const k of TOOLCHAIN_KEYS) expect(common.PLACEHOLDER.test(m.toolchain[k])).toBe(false);
    });
  });

  only('determinism markers', () => {
    const m = manifest as Manifest;
    it('every row recomputes to the committed bytes + sha256', () => {
      for (const f of m.files) {
        const buf = readFileSync(join(CHECK_DIR, f.path));
        expect(buf.length, f.path).toBe(f.bytes);
        expect(sha(buf), f.path).toBe(f.sha256);
      }
    });
    it('no unlisted artifacts in the room directory', () => {
      const onDisk = walk(CHECK_DIR).filter((p) => p !== 'manifest.json');
      expect(onDisk).toEqual(m.files.map((f) => f.path));
    });
    it('ktx2 rows carry the KTX 2.0 magic', () => {
      for (const f of m.files.filter((r) => r.kind === 'ktx2')) {
        const head = readFileSync(join(CHECK_DIR, f.path)).subarray(0, 12);
        expect(Buffer.from(head).equals(Buffer.from(common.KTX2_MAGIC)), f.path).toBe(true);
      }
    });
  });

  only('glb conventions (rules 2-4)', () => {
    const m = manifest as Manifest;
    const glbRow = m.files.find((f) => f.kind === 'glb');
    const json = glbRow ? common.parseGlbJson(readFileSync(join(CHECK_DIR, glbRow.path))) : null;
    it('exactly one glb named <room>.glb', () => {
      expect(m.files.filter((f) => f.kind === 'glb').map((f) => f.path)).toEqual(['_check.glb']);
    });
    it('requires meshopt + basisu, never draco', () => {
      const g = json as GltfJson;
      expect(g.extensionsRequired).toContain('EXT_meshopt_compression');
      expect(g.extensionsRequired).toContain('KHR_texture_basisu');
      expect(g.extensionsUsed ?? []).not.toContain('KHR_draco_mesh_compression');
    });
    it('references the albedo as an external KTX2', () => {
      const g = json as GltfJson;
      expect(g.images).toEqual([{ uri: 'tex/albedo.ktx2', mimeType: 'image/ktx2' }]);
      expect(g.textures?.length).toBe(1);
      expect(g.textures?.[0]?.extensions?.KHR_texture_basisu).toEqual({ source: 0 });
      expect(m.files.some((f) => f.path === 'tex/albedo.ktx2')).toBe(true);
    });
    it('every primitive has uv + lm (TEXCOORD_0/1) and no tangents', () => {
      for (const mesh of (json as GltfJson).meshes)
        for (const p of mesh.primitives) {
          expect(p.attributes.TEXCOORD_0, mesh.name).toBeDefined();
          expect(p.attributes.TEXCOORD_1, mesh.name).toBeDefined();
          expect(p.attributes.TANGENT, mesh.name).toBeUndefined();
        }
    });
    it('geometry summary matches the committed glb and the canary content', () => {
      const geo = common.geometrySummary(json as GltfJson);
      expect(geo).toEqual(m.geometry);
      const names = new Set(geo.meshes.map((x) => x.name));
      for (const n of ['floor', 'arch', 'sconce', 'baluster']) expect(names.has(n), n).toBe(true);
      expect(
        geo.meshes.filter((x) => x.name === 'baluster').reduce((t, x) => t + x.instances, 0),
      ).toBe(3);
      expect(geo.meshes.find((x) => x.name === 'sconce')?.primitives).toBe(2); // iron + emissive glow
      expect(geo.meshes.find((x) => x.name === 'floor')?.triangles).toBe(8);
    });
  });

  only('declared caps hold', () => {
    const m = manifest as Manifest;
    it('triangles / texture bytes / payload bytes are within budget', () => {
      const tex = m.files.filter((f) => f.kind === 'ktx2').reduce((t, f) => t + f.bytes, 0);
      const payload = m.files.reduce((t, f) => t + f.bytes, 0);
      expect(m.geometry.trianglesDrawn).toBeLessThanOrEqual(m.budget.trianglesMax);
      expect(tex).toBeLessThanOrEqual(m.budget.textureBytesMax);
      expect(payload).toBeLessThanOrEqual(m.budget.payloadBytesMax);
      expect(m.budget.payloadBytesMax).toBeLessThanOrEqual(common.ROOM_CAP_MAX);
    });
  });
});

describe('budget payload rows (tools/common.mjs collectPayloadRows)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'zimny-budget-'));
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
  const room = (id: string, cap: unknown, bytes: number, withManifest = true) => {
    const dir = join(tmp, 'public', 'assets', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${id}.glb`), Buffer.alloc(bytes, 1));
    if (withManifest)
      writeFileSync(
        join(dir, 'manifest.json'),
        JSON.stringify({ id, budget: { payloadBytesMax: cap } }),
      );
  };
  const rowOf = (rows: PayloadRow[], id: string) => rows.find((r) => r.id === id) as PayloadRow;

  it('empty tree prints exterior 0 B and basis 0 B, both ok', () => {
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rows.map((r) => r.id)).toEqual(['exterior', 'basis']);
    expect(rowOf(rows, 'exterior')).toMatchObject({
      row: 'exterior',
      bytes: 0,
      cap: 4000000,
      ok: true,
    });
    expect(rowOf(rows, 'basis')).toMatchObject({ row: 'shared', bytes: 0, cap: 600000, ok: true });
  });
  it('rooms budget against their manifest cap (manifest bytes count too)', () => {
    room('alpha', 10000, 1000);
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    const a = rowOf(rows, 'alpha');
    expect(a.row).toBe('room');
    expect(a.cap).toBe(10000);
    expect(a.bytes).toBeGreaterThan(1000);
    expect(a.ok).toBe(true);
  });
  it('flags a breach in-process without exiting', () => {
    room('beta', 500, 1000);
    expect(rowOf(common.collectPayloadRows(join(tmp, 'public')), 'beta')).toMatchObject({
      ok: false,
      cap: 500,
    });
  });
  it('rejects a missing manifest and an over-ceiling cap', () => {
    room('gamma', 1, 10, false);
    room('delta', 9000000, 10);
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rowOf(rows, 'gamma')).toMatchObject({
      ok: false,
      error: 'manifest.json missing',
      cap: 8000000,
    });
    expect(rowOf(rows, 'delta').ok).toBe(false);
    expect(rowOf(rows, 'delta').error).toMatch(/payloadBytesMax/);
  });
  it('exterior and basis rows count raw bytes and breach past their caps', () => {
    mkdirSync(join(tmp, 'public', 'assets', 'exterior'), { recursive: true });
    writeFileSync(join(tmp, 'public', 'assets', 'exterior', 'x.bin'), Buffer.alloc(4000001));
    mkdirSync(join(tmp, 'public', 'basis'), { recursive: true });
    writeFileSync(join(tmp, 'public', 'basis', 'basis_transcoder.wasm'), Buffer.alloc(1234));
    const rows = common.collectPayloadRows(join(tmp, 'public'));
    expect(rowOf(rows, 'exterior')).toMatchObject({ bytes: 4000001, ok: false });
    expect(rowOf(rows, 'basis')).toMatchObject({ bytes: 1234, ok: true });
    expect(rows.some((r) => r.id === 'exterior' && r.row === 'room')).toBe(false);
  });
});
