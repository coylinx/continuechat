import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// Content scripts can't be ES modules -> each built separately as a self-contained IIFE.
const entry = process.env.CC_ENTRY;
export default defineConfig(entry ? {
  publicDir: false,
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: false, lib: { entry: resolve(__dirname, `src/content/${entry}.ts`), formats: ['iife'], name: 'cc_' + entry, fileName: () => `content/${entry}.js` } },
} : {
  root: 'src', publicDir: resolve(__dirname, 'public'),
  build: { target: 'es2022', outDir: resolve(__dirname, 'dist'), emptyOutDir: true, modulePreload: false,
    rollupOptions: { input: { popup: resolve(__dirname, 'src/popup/index.html'), options: resolve(__dirname, 'src/options/index.html'), background: resolve(__dirname, 'src/background/index.ts') },
      output: { entryFileNames: (c) => c.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js' } } },
});
