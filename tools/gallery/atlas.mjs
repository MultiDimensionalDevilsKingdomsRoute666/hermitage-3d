/*
 * Military Gallery portrait atlas — producer (design-gallery §3.5 "build-time script, the only
 * producer of the atlas"; DEC-016 pins; DEC-024). Paints the pure law to the stage root as PNG,
 * writes the pure-law digest pin tools/gallery/atlas.digest.json (the CI determinism fence —
 * tests/gallery-atlas.test.ts recomputes it without toktx), writes 1/2 and 1/4 box-filtered
 * previews for the §10 R2 "mips inspected at M1" gate, and with --encode runs the pinned toktx.
 *
 *   pnpm asset:gallery-atlas            # paint + digest pin + mip previews
 *   pnpm asset:gallery-atlas --encode   # + toktx 4.4.2, ETC1S, --threads 1 → committed ktx2
 *   pnpm asset:manifest military-gallery
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLAS_SIZE_PX, encodePng, paintAtlas, SALT_1812 } from './atlas-law.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// The stage root convention is node_modules/.cache/zimny-asset-stage/<roomId> (tools/common.mjs).
const STAGE = join(ROOT, 'node_modules', '.cache', 'zimny-asset-stage', 'military-gallery');
export const ATLAS_PNG = join(STAGE, 'portrait-atlas.png');
export const ATLAS_KTX2 = join(
  ROOT,
  'public',
  'assets',
  'military-gallery',
  'tex',
  'military-gallery-portraits.ktx2',
);
export const DIGEST_PATH = join(ROOT, 'tools', 'gallery', 'atlas.digest.json');
export const TOKTX_VERSION = '4.4.2';
/** The albedo chain's flags (tools/gltf/military-gallery.mjs TOKTX_ARGS), verbatim. */
export const TOKTX_ARGS = [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  '128',
  '--threads',
  '1',
  '--genmipmap',
  '--assign_oetf',
  'srgb',
  '--assign_primaries',
  'bt709',
];

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Integer box filter — a stand-in for the encoder's mips, for eyeballing the M1 register. */
function boxDown(rgba, size, f) {
  const n = size / f;
  const out = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      for (let c = 0; c < 4; c += 1) {
        let sum = 0;
        for (let dy = 0; dy < f; dy += 1) {
          for (let dx = 0; dx < f; dx += 1) sum += rgba[((y * f + dy) * size + x * f + dx) * 4 + c];
        }
        out[(y * n + x) * 4 + c] = Math.floor(sum / (f * f) + 0.5);
      }
    }
  }
  return out;
}

const rgba = paintAtlas();
const png = encodePng(rgba, ATLAS_SIZE_PX, ATLAS_SIZE_PX);
mkdirSync(STAGE, { recursive: true });
writeFileSync(ATLAS_PNG, png);
for (const [f, level] of [
  [2, 1],
  [4, 2],
]) {
  const n = ATLAS_SIZE_PX / f;
  writeFileSync(
    join(STAGE, `portrait-atlas-mip${level}.png`),
    encodePng(boxDown(rgba, ATLAS_SIZE_PX, f), n, n),
  );
}
const digest = {
  salt: SALT_1812,
  width: ATLAS_SIZE_PX,
  height: ATLAS_SIZE_PX,
  rgbaSha256: sha256(rgba),
  pngSha256: sha256(png),
  pngBytes: png.length,
};
writeFileSync(DIGEST_PATH, `${JSON.stringify(digest, null, 2)}\n`);
console.log(`atlas painted → ${ATLAS_PNG}; rgba ${digest.rgbaSha256}`);

if (process.argv.includes('--encode')) {
  // toktx prints its banner to stderr (the requireTool precedent reads stdout + stderr).
  const probe = spawnSync('toktx', ['--version'], { encoding: 'utf8' });
  const version = `${probe.stdout ?? ''}${probe.stderr ?? ''}`;
  if (probe.error !== null && probe.error !== undefined && !version.includes(TOKTX_VERSION)) {
    throw new Error(`toktx not found — ${probe.error.message}`);
  }
  if (!version.includes(TOKTX_VERSION)) {
    throw new Error(`DEC-016 pins toktx ${TOKTX_VERSION}; found: ${version.trim()}`);
  }
  mkdirSync(dirname(ATLAS_KTX2), { recursive: true });
  execFileSync('toktx', [...TOKTX_ARGS, ATLAS_KTX2, ATLAS_PNG], { stdio: 'inherit' });
  console.log(`encoded → ${ATLAS_KTX2}; now run: pnpm asset:manifest military-gallery`);
}
