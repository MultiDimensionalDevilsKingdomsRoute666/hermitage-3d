// tools/reencode.mjs
// §5 re-encode law (design-staircase §4 states, r17c): re-encode a room's surviving DENOISED
// linear EXR into the committed 8-bit ETC1S ktx2 at the manifest's white point. Never consumes
// the old PNG or the old ktx2. Deterministic: same EXR + white point → byte-identical outputs
// (toktx single-threaded, no mips, no clock, no network). Publish is all-or-nothing per state.
// The manifest's lightmaps.intensity record is the single source of truth for the white points;
// changing a white point means editing the manifest first, then re-encoding.
// R-UX4 (walkthrough-UX pass): a state carrying a compose recipe (tools/lm-recipes.mjs) first
// composes its source EXRs linearly (tools/lm_compose.py) and encodes the composed EXR.
//
//   node tools/reencode.mjs <room> <state|all>     state aliases: night → nightChandeliers
//
// Node driver only — never imported by src.
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSETS_DIR,
  BLENDER,
  ChainError,
  readToolchain,
  requirePinned,
  requireTool,
  run,
  STAGE_ROOT,
  sha256,
} from './common.mjs';
import { composeArgs, composeRecipeFor } from './lm-recipes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENCODE_PY = join(HERE, 'reencode-encode.py');
const COMPOSE_PY = join(HERE, 'lm_compose.py');
const TOKTX_INSTALL = 'install KTX-Software 4.4.2 (brew install ktx) so `toktx` is on PATH';

const STATES = ['day', 'dusk', 'nightChandeliers'];
const ALIAS = { night: 'nightChandeliers' };
const FILE_BY_STATE = { day: 'day', dusk: 'dusk', nightChandeliers: 'night' };

// Pinned transcode flags — the same ETC1S economics as the bake (§5: linear irradiance data).
const TOKTX_FLAGS = [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  '128',
  '--threads',
  '1',
  '--assign_oetf',
  'linear',
  '--assign_primaries',
  'bt709',
];

function fail(message, hint) {
  throw new ChainError(hint === undefined ? message : `${message} (${hint})`);
}

function parseArgs(argv) {
  const [room, stateArg] = argv;
  if (!room || !stateArg) fail('usage: node tools/reencode.mjs <room> <state|all>');
  const state = ALIAS[stateArg] ?? stateArg;
  if (state !== 'all' && !STATES.includes(state)) {
    fail(`unknown state '${stateArg}'`, `one of ${STATES.join(', ')}, night, all`);
  }
  return { room, states: state === 'all' ? STATES : [state] };
}

function readManifest(room) {
  const path = join(ASSETS_DIR, room, 'manifest.json');
  if (!existsSync(path)) fail(`no manifest at ${path}`, 'room id must match a committed room');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const intensity = manifest.lightmaps?.intensity;
  if (intensity === null || typeof intensity !== 'object') {
    fail(`${room}: lightmaps.intensity is null — nothing to re-encode (canary / unbaked room)`);
  }
  return { path, manifest };
}

function whitePointOf(manifest, room, state) {
  const value = manifest.lightmaps.intensity[state];
  if (!Number.isFinite(value) || value <= 0) {
    fail(`${room}: lightmaps.intensity.${state} must be finite and > 0, got ${value}`);
  }
  return value;
}

/** The bake's DENOISED linear EXR (bake-<state>/lm/<file>.exr; the raw one is <file>.raw.exr). */
function denoisedExr(room, state) {
  const file = FILE_BY_STATE[state];
  const path = join(STAGE_ROOT, room, `bake-${file}`, 'lm', `${file}.exr`);
  if (!existsSync(path)) {
    fail(`missing denoised EXR ${path}`, 'run the bake first; this tool never re-bakes');
  }
  return path;
}

function reencodeState(room, state, manifest, work) {
  const whitePoint = whitePointOf(manifest, room, state);
  let exr = denoisedExr(room, state);
  // R-UX4 compose law (tools/lm-recipes.mjs): a state with a recipe encodes the linear sum of
  // its declared sources (staged denoised EXRs, the driver's own path convention) produced by
  // lm_compose.py; the composed EXR then feeds the UNCHANGED single-input encode/transcode/
  // publish path. Sources resolve by bake-rig state id, so aliases flow through FILE_BY_STATE.
  const recipe = composeRecipeFor(room, state);
  if (recipe !== null) {
    const resolved = recipe.map((term) => ({
      path: denoisedExr(room, term.source),
      scale: term.scale,
    }));
    const composed = join(STAGE_ROOT, `${room}.${state}.composite.exr`);
    const terms = recipe.map((t) => `${t.source}×${t.scale}`).join(' + ');
    console.log(`== ${room} ${state}: compose ${terms}`);
    run(BLENDER, [
      '-b',
      '--factory-startup',
      '-noaudio',
      '-P',
      COMPOSE_PY,
      '--',
      ...composeArgs(composed, resolved),
    ]);
    exr = composed;
  }
  const file = FILE_BY_STATE[state];
  const png = join(work, `${file}.png`);
  const ktx2 = join(work, `${file}.ktx2`);
  console.log(`\n== ${room} ${state}: whitePoint=${whitePoint}`);
  run(BLENDER, [
    '-b',
    '--factory-startup',
    '-noaudio',
    '-P',
    ENCODE_PY,
    '--',
    exr,
    png,
    String(whitePoint),
  ]);
  run('toktx', [...TOKTX_FLAGS, ktx2, png]);
  if (!existsSync(ktx2)) fail(`toktx produced no file at ${ktx2}`);
  // Publish only now: encode + transcode both succeeded (all-or-nothing per state).
  const rel = `lm/${file}.ktx2`;
  const dest = join(ASSETS_DIR, room, rel);
  copyFileSync(ktx2, dest);
  const bytes = readFileSync(dest);
  const sha = sha256(bytes);
  const row = manifest.files.find((f) => f.path === rel);
  if (row === undefined) fail(`${room}: manifest has no files row for ${rel}`);
  row.bytes = bytes.length;
  row.sha256 = sha;
  console.log(`published ${dest} (${bytes.length} bytes, sha256 ${sha})`);
}

function main() {
  const { room, states } = parseArgs(process.argv.slice(2));
  const tc = readToolchain();
  requireTool('toktx', ['--version'], requirePinned(tc, 'toktx'), TOKTX_INSTALL);
  if (!existsSync(BLENDER)) {
    fail(`Blender not found at ${BLENDER}`, 'set ZIMNY_BLENDER to the Blender binary');
  }
  const { path, manifest } = readManifest(room);
  const work = mkdtempSync(join(tmpdir(), 'zimny-reencode-'));
  try {
    for (const state of states) reencodeState(room, state, manifest, work);
    // The record is already the source of truth; rewrite it verbatim so the file is self-stating.
    manifest.lightmaps.intensity = Object.fromEntries(
      STATES.map((s) => [s, whitePointOf(manifest, room, s)]),
    );
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`\nmanifest rewritten: ${path}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`reencode: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
