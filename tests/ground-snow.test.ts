// tests/ground-snow.test.ts
/**
 * R12 — the ground-snow look (design-ground-snow.md §§1–4).
 * Pins the purity fence, the laws, the bit-exact identities at wSnow = 0 and 1,
 * the GLSL/TS agreement, and the splice-and-throw discipline.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GROUND_SNOW_FRAGMENT_BODY,
  GROUND_SNOW_UNIFORMS,
  patchGroundSnowSlot,
} from '../src/procedural/ground-snow';
import {
  GROUND_BOUNCE_LINEAR,
  GROUND_LANE,
  GROUND_SNOW_FRESH_LINEAR,
  GROUND_SNOW_TRAMPLED_LINEAR,
  GROUND_TRAMPLE_BASE,
  groundSnowAlbedo,
  snowBounceGround,
  trampleField,
} from '../src/world/ground-snow';
import type { LinearRgb } from '../src/world/night-facade';
import { WINDOW_WARM_LINEAR, warmGround } from '../src/world/night-facade';
import { SNOW_ALBEDO_LINEAR } from '../src/world/snow-season';

const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

interface FakeMaterial {
  onBeforeCompile?: (shader: FakeShader) => void;
  customProgramCacheKey?: () => string;
}

interface FakeShader {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
  fragmentShader: string;
}

describe('ground-snow purity fence', () => {
  it('src/world/ground-snow.ts imports no three, DOM, clock or randomness', () => {
    const raw = readFileSync('src/world/ground-snow.ts', 'utf8');
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');

    const forbidden = [
      /from\s+['"]three/,
      /node:/,
      /document/,
      /window/,
      /localStorage/,
      /performance/,
      /Date/,
      /setTimeout/,
      /Math\.random/,
    ];
    for (const pattern of forbidden) {
      expect(code).not.toMatch(pattern);
    }
  });
});

describe('trampleField', () => {
  it('is symmetric in x', () => {
    for (const x of [0, 5, 10, 14, 18, 22, 60]) {
      expect(trampleField(x)).toBe(trampleField(-x));
    }
  });

  it('is exactly 1 inside the lane core', () => {
    for (const x of [0, 3, 9.5, GROUND_LANE.coreHalfM, -GROUND_LANE.coreHalfM]) {
      expect(trampleField(x)).toBe(1);
    }
  });

  it('is exactly the base beyond the lane edge', () => {
    for (const x of [GROUND_LANE.edgeHalfM, 40, 300, -300]) {
      expect(trampleField(x)).toBe(GROUND_TRAMPLE_BASE);
    }
  });

  it('is monotone non-increasing across the falloff and stays in range', () => {
    let previous = trampleField(GROUND_LANE.coreHalfM);
    for (let x = GROUND_LANE.coreHalfM; x <= GROUND_LANE.edgeHalfM; x += 0.25) {
      const value = trampleField(x);
      expect(value).toBeLessThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(GROUND_TRAMPLE_BASE);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });
});

describe('groundSnowAlbedo', () => {
  const asphalt: LinearRgb = [0.0497, 0.0497, 0.0497];

  it('returns asphalt bit-exactly at wSnow = 0', () => {
    for (const x of [0, 15, 300]) {
      const out = groundSnowAlbedo(x, 0, asphalt);
      expect(out[0]).toBe(asphalt[0]);
      expect(out[1]).toBe(asphalt[1]);
      expect(out[2]).toBe(asphalt[2]);
    }
  });

  it('is fully trampled in the lane at wSnow = 1', () => {
    const out = groundSnowAlbedo(0, 1, asphalt);
    expect(out[0]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[0]);
    expect(out[1]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[1]);
    expect(out[2]).toBe(GROUND_SNOW_TRAMPLED_LINEAR[2]);
  });

  it('settles to mix(FRESH, TRAMPLED, BASE) beyond the lane edge at wSnow = 1', () => {
    const out = groundSnowAlbedo(GROUND_LANE.edgeHalfM, 1, asphalt);
    for (let c = 0; c < 3; c += 1) {
      const fresh = GROUND_SNOW_FRESH_LINEAR[c] ?? Number.NaN;
      const trampled = GROUND_SNOW_TRAMPLED_LINEAR[c] ?? Number.NaN;
      expect(out[c]).toBe(lerp(fresh, trampled, GROUND_TRAMPLE_BASE));
    }
  });
});

describe('snowBounceGround', () => {
  const h: LinearRgb = [0.31, 0.27, 0.42];

  it('is 0.25 * h bit-exactly at wSnow = 0', () => {
    const out = snowBounceGround(h, 0);
    expect(out[0]).toBe(0.25 * h[0]);
    expect(out[1]).toBe(0.25 * h[1]);
    expect(out[2]).toBe(0.25 * h[2]);
  });

  it('is h * GROUND_BOUNCE_LINEAR bit-exactly at wSnow = 1', () => {
    const out = snowBounceGround(h, 1);
    expect(out[0]).toBe(h[0] * GROUND_BOUNCE_LINEAR[0]);
    expect(out[1]).toBe(h[1] * GROUND_BOUNCE_LINEAR[1]);
    expect(out[2]).toBe(h[2] * GROUND_BOUNCE_LINEAR[2]);
  });

  it('is absorbed by warmGround at full night for every snow weight', () => {
    for (const w of [0, 0.5, 1]) {
      const out = warmGround(snowBounceGround(h, w), WINDOW_WARM_LINEAR, 1);
      expect(out[0]).toBe(WINDOW_WARM_LINEAR[0]);
      expect(out[1]).toBe(WINDOW_WARM_LINEAR[1]);
      expect(out[2]).toBe(WINDOW_WARM_LINEAR[2]);
    }
  });
});

describe('ground-snow constants', () => {
  it('re-exports the season law\u2019s fresh albedo by reference', () => {
    expect(GROUND_SNOW_FRESH_LINEAR).toBe(SNOW_ALBEDO_LINEAR);
  });

  it('is darker than fresh snow on every channel', () => {
    for (let c = 0; c < 3; c += 1) {
      const fresh = GROUND_SNOW_FRESH_LINEAR[c] ?? Number.NaN;
      const trampled = GROUND_SNOW_TRAMPLED_LINEAR[c] ?? Number.NaN;
      expect(trampled).toBeLessThan(fresh);
    }
  });

  it('has a lane core inside its edge', () => {
    expect(GROUND_LANE.coreHalfM).toBeLessThan(GROUND_LANE.edgeHalfM);
  });
});

describe('GLSL / TS agreement', () => {
  const glslFloat = (x: number): string => (Number.isInteger(x) ? `${x}.0` : `${x}`);

  it('emits the lane, base and albedo constants into the fragment body', () => {
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(GROUND_LANE.coreHalfM));
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(GROUND_LANE.edgeHalfM));
    expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(GROUND_TRAMPLE_BASE));
    for (const channel of [...GROUND_SNOW_FRESH_LINEAR, ...GROUND_SNOW_TRAMPLED_LINEAR]) {
      expect(GROUND_SNOW_FRAGMENT_BODY).toContain(glslFloat(channel));
    }
  });
});

describe('patchGroundSnowSlot', () => {
  const vertexWithAnchors = [
    '#include <common>',
    'void main() {',
    '#include <worldpos_vertex>',
    '}',
  ].join('\n');
  const fragmentWithAnchors = [
    '#include <common>',
    'void main() {',
    '#include <color_fragment>',
    '}',
  ].join('\n');

  const makeMaterial = (): FakeMaterial => ({});

  const makeShader = (vertexShader: string, fragmentShader: string): FakeShader => ({
    uniforms: {},
    vertexShader,
    fragmentShader,
  });

  it('installs the compile hook and the cache key', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    expect(material.onBeforeCompile).toBeTypeOf('function');
    expect(material.customProgramCacheKey).toBeTypeOf('function');
    expect(material.customProgramCacheKey?.()).toBe('Ground/snow-slot@1');
  });

  it('throws when an anchor is missing', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    const hook = material.onBeforeCompile;
    expect(hook).toBeTypeOf('function');
    expect(() => hook?.(makeShader('void main() {}', fragmentWithAnchors))).toThrow();
    expect(() => hook?.(makeShader(vertexWithAnchors, 'void main() {}'))).toThrow();
  });

  it('splices the varying, the uniform and the trample law', () => {
    const material = makeMaterial();
    patchGroundSnowSlot(material as unknown as Parameters<typeof patchGroundSnowSlot>[0]);
    const shader = makeShader(vertexWithAnchors, fragmentWithAnchors);
    material.onBeforeCompile?.(shader);
    expect(shader.vertexShader).toContain('vGroundXZ');
    expect(shader.fragmentShader).toContain('uSnow');
    expect(shader.fragmentShader).toContain('groundTrample');
    expect(shader.uniforms.uSnow).toBe(GROUND_SNOW_UNIFORMS.uSnow);
  });
});
