// Cross-platform build (Windows cmd can't run `CC_ENTRY=x vite build`):
// typecheck → pages + background → each content script as a self-contained IIFE → manifest + privacy page.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { rmrf } from './fsutil.mjs';

const TSC = 'node_modules/typescript/bin/tsc', VITE = 'node_modules/vite/bin/vite.js';
function run(script, args, env = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!process.argv.includes('--no-typecheck')) run(TSC, ['--noEmit']);
rmrf('dist'); // start clean: no stale hashed assets from older builds
run(VITE, ['build', '--logLevel', 'warn']);
for (const entry of ['chatgpt', 'claude']) run(VITE, ['build', '--logLevel', 'warn'], { CC_ENTRY: entry });
run('scripts/copy-manifest.mjs', []);
if (existsSync('site/privacy.html')) copyFileSync('site/privacy.html', 'dist/privacy.html');
console.log('build ok → dist/');
