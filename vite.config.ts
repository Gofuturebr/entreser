import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Fase 1–2 (front-end): os fixtures de `specs/fixtures/` são servidos
// estaticamente. O corpus é carregado em runtime — trocar o JSON não
// exige tocar em código (01-build-spec.md §4 e §9.5).
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'specs/fixtures',
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
