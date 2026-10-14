// Packs dist/ into release/continuechat-v<version>.zip (Chrome Web Store upload / tester build)
// and mirrors it to release/unpacked/ for "Load unpacked". Run after `npm run build`.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { copyDir, rmrf } from './fsutil.mjs';

if (!existsSync('dist/manifest.json')) { console.error('dist/ missing — run npm run build first'); process.exit(1); }
const { version } = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = ~0; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
const walk = (d) => readdirSync(d).flatMap((f) => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);

const files = walk('dist').sort();
const local = []; const central = []; let offset = 0;
for (const f of files) {
  const name = Buffer.from(relative('dist', f).split('\\').join('/'));
  const raw = readFileSync(f); const comp = deflateRawSync(raw, { level: 9 }); const crc = crc32(raw);
  const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
  h.writeUInt32LE(0, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(name.length, 26);
  const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
  c.writeUInt32LE(0, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
  local.push(h, name, comp); central.push(c, name); offset += h.length + name.length + comp.length;
}
const cd = Buffer.concat(central); const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);

mkdirSync('release', { recursive: true });
const zip = `release/continuechat-v${version}.zip`;
writeFileSync(zip, Buffer.concat([...local, cd, end]));
rmrf('release/unpacked'); copyDir('dist', 'release/unpacked');
console.log(`packed ${files.length} files → ${zip} and release/unpacked/`);
