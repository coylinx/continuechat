// Cross-platform build (Windows cmd can't run `CC_ENTRY=x vite build`):
// typecheck → pages + background → each content script as a self-contained IIFE → manifest + privacy page.
// --dev → dist-dev/ ("ContinueChat DEV", with a reload hook for live testing); default → dist/ (release).
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { rmrf } from './fsutil.mjs';

const TSC = 'node_modules/typescript/bin/tsc', VITE = 'node_modules/vite/bin/vite.js';
const DEV = process.argv.includes('--dev'), OUT = DEV ? 'dist-dev' : 'dist';
function run(script, args, env = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', env: { ...process.env, CC_OUT: OUT, CC_DEV: DEV ? '1' : '0', ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!process.argv.includes('--no-typecheck')) run(TSC, ['--noEmit']);
rmrf(OUT); // start clean: no stale hashed assets from older builds
run(VITE, ['build', '--logLevel', 'warn']);
for (const entry of ['chatgpt', 'claude']) run(VITE, ['build', '--logLevel', 'warn'], { CC_ENTRY: entry });
run('scripts/copy-manifest.mjs', []);
if (existsSync('site/privacy.html')) copyFileSync('site/privacy.html', `${OUT}/privacy.html`);
console.log(`build ok → ${OUT}/`);
