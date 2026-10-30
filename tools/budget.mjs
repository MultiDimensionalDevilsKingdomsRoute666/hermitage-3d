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
// The RU column rides a lazy chunk (design-i18n-notes.md R2; DEC-020): counted by the
// total gate above AND measured separately at its own declared ceiling. The marker string
// is unique to src/i18n/ru.ts (the Jordan staircase title, stored data).
const RU_CHUNK_MARKER = 'Иорданская лестница';
const RU_CHUNK_LIMIT = 12000;
let ruGzip = null;
try {
  for (const name of readdirSync(distAssets)) {
    if (!name.endsWith('.js')) continue;
    const buffer = readFileSync(join(distAssets, name));
    total += gzipSync(buffer, { level: 9 }).length;
    chunks += 1;
    if (buffer.includes(RU_CHUNK_MARKER)) {
      ruGzip = gzipSync(buffer, { level: 9 }).length;
    }
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
if (ruGzip === null) {
  console.error('budget: the RU lazy chunk not found — the dynamic import must split it out');
  process.exit(1);
}
console.log(`budget: payload ru chunk: ${ruGzip} B of ${RU_CHUNK_LIMIT} B ok`);
if (ruGzip > RU_CHUNK_LIMIT) {
  console.error('budget: the RU chunk exceeded its declared ceiling — failing build stage');
  process.exit(1);
}

// Payload rows — design-staircase.md §3.3/§9, DEC-016. Additive: the JS rows above are untouched
// and still gate first. Raw bytes of the committed tree, no git plumbing: each public/assets/<room>/
// vs its manifest's budget.payloadBytesMax (≤ 8 000 000), the exterior row (4 000 000 B), the
// shared public/basis/ row (600 000 B — common.mjs BASIS_CAP; the 500 000 stub here was
// stale and corrected 2026-10-30 with the trace: collectPayloadRows() enforces 600 000).
// Every row prints; any breach exits 1 naming room and row.
import { collectPayloadRows } from './common.mjs';

let breached = 0;
for (const r of collectPayloadRows()) {
  console.log(
    `budget: payload ${r.row} ${r.id}: ${r.bytes} B of ${r.cap} B ${r.ok ? 'ok' : 'FAIL'}${r.error ? ` — ${r.error}` : ''}`,
  );
  if (!r.ok) {
    console.error(`budget: payload breach — row "${r.row}" room "${r.id}"`);
    breached += 1;
  }
}
if (breached > 0) {
  console.error(`budget: ${breached} payload row(s) breached — failing build stage`);
  process.exit(1);
}
