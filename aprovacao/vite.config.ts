import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// O front fica em web/; o build vai para dist-web/, servido pelo Express.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist-web', emptyOutDir: true },
  test: {
    root: '.',
    include: ['server/**/*.test.ts'],
    environment: 'node',
  },
});
