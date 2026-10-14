import { copyFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
// Node 24's native recursive fs.rmSync / fs.cpSync misbehave under non-ASCII Windows paths (e.g. D:\项目\…):
// rmSync silently does nothing and cpSync kills the process. Plain per-file calls work, so walk the tree ourselves.
export function rmrf(p) {
  if (!existsSync(p)) return;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) rmrf(join(p, f)); rmdirSync(p); }
  else unlinkSync(p);
}
export function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(src)) { const s = join(src, f), d = join(dst, f); if (statSync(s).isDirectory()) copyDir(s, d); else copyFileSync(s, d); }
}
