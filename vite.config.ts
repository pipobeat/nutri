import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/ (PWA com service worker, para GitHub Pages ou qualquer host estático)
// `npm run build:single`  → dist-single/index.html (um único arquivo, para pré-visualização)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'single' ? { outDir: 'dist-single', copyPublicDir: false } : { outDir: 'dist', chunkSizeWarningLimit: 1200 },
  define: { __SINGLE__: JSON.stringify(mode === 'single') },
  server: { host: true },
}));
