import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import refresh from 'vite-plugin-refresh';
import svg from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: { tsconfigPath: 'src/tsconfig.json' } }),
    refresh(),
    svg(),
  ],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false,
  },
});
