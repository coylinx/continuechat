// Bundles each tests/*.test.ts with esbuild and runs it in Node. Exits non-zero on the first failure.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('node_modules/.cache/tests'); mkdirSync(out, { recursive: true });
const only = process.argv[2];
const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts') && (!only || f.includes(only)));
let failed = 0;
for (const f of files) {
  const outfile = resolve(out, f.replace(/\.ts$/, '.mjs'));
  await build({ entryPoints: [resolve('tests', f)], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n✗ ${failed} test file(s) failed` : `\n✓ ${files.length} test file(s) passed`);
process.exit(failed ? 1 : 0);
