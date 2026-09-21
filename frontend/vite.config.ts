import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { license: { fileName: 'third-party-licenses.txt' } },
  server: {
    port: 5173, strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5080',
      '/hubs': { target: 'http://127.0.0.1:5080', ws: true },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
