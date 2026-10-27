import { defineConfig } from 'vite';
import { resolve } from 'node:path';
// Content scripts can't be ES modules -> each built separately as a self-contained IIFE (see scripts/build.mjs).
const entry = process.env.CC_ENTRY;
const out = resolve(__dirname, process.env.CC_OUT || 'dist');
// Dev builds (npm run build:dev → dist-dev/) keep a reload hook; release builds compile it out.
const define = { __CC_DEV__: JSON.stringify(process.env.CC_DEV === '1') };
const page = (name: string) => resolve(__dirname, `src/${name}/index.html`);
export default defineConfig(entry ? {
  publicDir: false, define,
  build: { target: 'es2022', outDir: out, emptyOutDir: false, lib: { entry: resolve(__dirname, `src/content/${entry}.ts`), formats: ['iife'], name: 'cc_' + entry, fileName: () => `content/${entry}.js` } },
} : {
  root: 'src', publicDir: resolve(__dirname, 'public'), define,
  build: { target: 'es2022', outDir: out, emptyOutDir: true, modulePreload: false,
    rollupOptions: { input: { popup: page('popup'), options: page('options'), print: page('print'), background: resolve(__dirname, 'src/background/index.ts') },
      output: { entryFileNames: (c) => c.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js' } } },
});
