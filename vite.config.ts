import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

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
});
