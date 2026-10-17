import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

// Multi-page entry (Phase 1): index.html is the palace, notes.html is the pure-DOM
// facade spec viewer at /notes. budget.mjs already counts every emitted js chunk.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    target: 'es2023',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(here, 'index.html'),
        notes: resolve(here, 'notes.html'),
      },
    },
  },
  test: {
    // Playwright specs live in tests/e2e and match Vitest's default include
    // (**/*.{test,spec}.?(c|m)[jt]s?(x)); keep Vitest on unit tests only. Defaults (node_modules,
    // dist …) stay intact — only the Playwright directory is fenced off.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
