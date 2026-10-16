// JS gzip budget — design-sky-time.md §11. Fixed gzip configuration; counts
// every emitted .js chunk in dist/assets (bootstrap, dynamic imports included).
// Runs in the build stage: Vitest precedes build, dist must be fresh.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const LIMIT_BYTES = 350000;
const distAssets = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');

let total = 0;
let chunks = 0;
try {
  for (const name of readdirSync(distAssets)) {
    if (!name.endsWith('.js')) continue;
    total += gzipSync(readFileSync(join(distAssets, name)), { level: 9 }).length;
    chunks += 1;
  }
} catch {
  console.error('budget: dist/assets missing — run pnpm build first');
  process.exit(1);
}

console.log(`budget: ${chunks} js chunk(s), ${total} gzip bytes of ${LIMIT_BYTES}`);
if (total > LIMIT_BYTES) {
  console.error('budget: exceeded — failing build stage');
  process.exit(1);
}
