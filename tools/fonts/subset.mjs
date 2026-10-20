// tools/fonts/subset.mjs — reproducible font build, design-i18n-notes.md §2.1 (r24t).
// Ensures the pinned-toolchain venv (fontTools + brotli), runs the subset worker
// (tools/fonts/subset.py), and publishes the OFL beside the committed woff2 files.
// The source of truth for the font versions is package.json/lockfile (@ibm/plex-sans,
// @ibm/plex-serif — the npm releases are the pinned source tags); outputs are committed.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const venvPython = join(repo, 'tools', 'fonts', '.venv', 'bin', 'python');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: repo, ...options });
  if (result.error !== undefined || result.status !== 0) {
    process.exitCode = 1;
    throw new Error(`failed: ${command} ${args.join(' ')}`);
  }
}

if (!existsSync(venvPython)) {
  console.error('subset: creating tools/fonts/.venv (python3 venv, fonttools + brotli)');
  run('python3', ['-m', 'venv', join(repo, 'tools', 'fonts', '.venv')]);
  run(venvPython, ['-m', 'pip', 'install', '-q', 'fonttools', 'brotli']);
} else {
  // The venv predates a fresh checkout or was pruned — verify the imports are live.
  const probe = spawnSync(venvPython, ['-c', 'import fontTools, brotli']);
  if (probe.status !== 0) {
    run(venvPython, ['-m', 'pip', 'install', '-q', 'fonttools', 'brotli']);
  }
}

run(venvPython, [join(here, 'subset.py')]);

const ofl = join(repo, 'public', 'fonts', 'OFL.txt');
mkdirSync(dirname(ofl), { recursive: true });
copyFileSync(join(repo, 'node_modules/@ibm/plex-sans/LICENSE.txt'), ofl);
for (const file of ['plex-sans-400.woff2', 'plex-sans-500.woff2', 'plex-serif-400.woff2']) {
  const path = join(repo, 'public', 'fonts', file);
  if (!existsSync(path)) throw new Error(`subset: expected output missing: ${file}`);
  console.log(`subset: ${file} ${statSync(path).size} bytes`);
}
console.log(`subset: OFL.txt published beside the fonts (IBM Plex, SIL OFL 1.1)`);
