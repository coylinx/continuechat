import { readFileSync, writeFileSync } from 'node:fs';
import { LICENSE_PROXY_ORIGIN } from './config.mjs';
const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
m.version = JSON.parse(readFileSync('package.json', 'utf8')).version; // package.json is the single version source
m.host_permissions = m.host_permissions.map((h) => h.replace('__LICENSE_PROXY__', LICENSE_PROXY_ORIGIN));
writeFileSync('dist/manifest.json', JSON.stringify(m, null, 2));
console.log('manifest written');
