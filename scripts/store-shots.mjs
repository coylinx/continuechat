// Chrome Web Store screenshots from the dev harness (real panel code, showcase chats; never touches chatgpt.com / claude.ai).
// Needs `npm run dev` running and Google Chrome installed. Usage: node scripts/store-shots.mjs  → store-assets/cws/*.png
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BASE = 'http://localhost:5179', PORT = 9333, OUT = resolve('store-assets/cws');
const VIEW = { width: 1160, height: 610 }; // the harness viewport; framed into 1280×800 below
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(join(OUT, 'raw'), { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'cc-shots-'));
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--force-color-profile=srgb', '--lang=en-US', '--accept-lang=en-US', '--no-proxy-server', 'about:blank'],
  { stdio: 'ignore', env: { ...process.env, LANG: 'en_US.UTF-8', LANGUAGE: 'en_US', LC_ALL: 'en_US.UTF-8' } }); // UI language follows navigator.language
let page;
for (let i = 0; i < 50 && !page; i++) {
  await sleep(200);
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!page) throw new Error('Chrome did not start');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (body) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${HELPERS} ${body} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const view = (o) => send('Emulation.setDeviceMetricsOverride', { ...o, deviceScaleFactor: 2, mobile: false });
const nav = async (url, wait = 1500) => { await send('Page.navigate', { url }); await sleep(wait); };
const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(file, Buffer.from(r.data, 'base64')); };

// In-page helpers: the panel and the dialog layer live in open shadow roots.
const HELPERS = `
  const P = () => document.getElementById('continuechat-root')?.shadowRoot;
  const L = () => document.getElementById('continuechat-layer')?.shadowRoot;
  const wait = async (fn, ms = 8000) => { const t = Date.now(); for (;;) { const v = fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timeout: ' + fn); await new Promise((r) => setTimeout(r, 100)); } };
  const rpc = async (type, req = {}) => { const r = await chrome.runtime.sendMessage({ type, ...req }); if (!r.ok) throw new Error(r.error); return r.data; };
  const typeInto = (el, text) => { el.focus(); el.value = text; el.dispatchEvent(new Event('input', { bubbles: true })); };
`;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setLocaleOverride', { locale: 'en-US' });
await view(VIEW);

// 1 — ChatGPT side: showcase data, folders and pins, the Kyoto chat open.
await nav(`${BASE}/claude/new?showcase`, 2500); // first visit syncs the Claude list too (search shows both sites)
await nav(`${BASE}/chatgpt/`, 2500);
await ev(`
  await wait(() => P()?.querySelector('.search'));
  const travel = (await rpc('db:createFolder', { name: 'Travel' })).folder;
  const work = (await rpc('db:createFolder', { name: 'Work' })).folder;
  await rpc('db:createFolder', { name: 'Learning' });
  for (const k of ['chatgpt:g0000-show', 'claude:c0001-show']) await rpc('db:setInFolder', { folderId: travel.id, key: k, inFolder: true });
  for (const k of ['chatgpt:g0002-show', 'chatgpt:g0009-show', 'claude:c0003-show']) await rpc('db:setInFolder', { folderId: work.id, key: k, inFolder: true });
  for (const k of ['chatgpt:g0002-show', 'claude:c0000-show']) await rpc('db:togglePin', { key: k });
`);
await nav(`${BASE}/chatgpt/c/g0000-show`, 2500);
await ev(`
  await wait(() => P()?.querySelector('[data-cont]'));
  const f = [...P().querySelectorAll('[data-ftoggle]')].find((b) => b.textContent.includes('Travel')); f?.click();
  await new Promise((r) => setTimeout(r, 600));
`);
await shot(join(OUT, 'raw/1-panel.png'));

// 2 — the Continue dialog.
await ev(`P().querySelector('[data-cont]').click(); await wait(() => L()?.querySelector('[data-go]')); await new Promise((r) => setTimeout(r, 500));`);
await shot(join(OUT, 'raw/2-continue.png'));

// 3 — the Claude tab it opens, message box filled, nothing sent.
const target = await ev(`
  let url; window.open = (u) => { url = u; return null; };
  L().querySelector('[data-go]').click(); await wait(() => url); return new URL(url, location.origin).href;
`);
await nav(target, 3500);
await ev(`await wait(() => document.getElementById('box').textContent.length > 200); await new Promise((r) => setTimeout(r, 800));`);
await shot(join(OUT, 'raw/3-prefilled.png'));

// 4 — search across both sites.
await nav(`${BASE}/chatgpt/c/g0000-show`, 2500);
await ev(`
  const s = await wait(() => P()?.querySelector('.search')); typeInto(s, 'kyoto');
  await wait(() => P().querySelectorAll('.res').length >= 2); await new Promise((r) => setTimeout(r, 500));
`);
await shot(join(OUT, 'raw/4-search.png'));

// 5 — export.
await ev(`
  const s = P().querySelector('.search'); typeInto(s, ''); await new Promise((r) => setTimeout(r, 400));
  P().querySelector('[data-exp]').click(); await wait(() => L()?.querySelector('[data-list] input'));
  const boxes = [...L().querySelectorAll('[data-list] input[type=checkbox]')].slice(0, 4); for (const b of boxes) b.click();
  L().querySelector('[data-next]').click(); // step 2: pick the format
  await new Promise((r) => setTimeout(r, 700));
`);
await shot(join(OUT, 'raw/5-export.png'));

// Frame each capture into a 1280×800 store screenshot with a caption.
const CAPTIONS = [
  ['1-panel', 'Your ChatGPT and Claude chats, organized', 'Folders, pins and both sites in one panel — right in the sidebar.', 'chatgpt.com'],
  ['2-continue', 'Continue any chat in the other assistant', 'Pick how much context to bring. Code blocks and tables are never cut in half.', 'chatgpt.com'],
  ['3-prefilled', 'Lands ready to send — never sent for you', 'The other site opens with the message box filled. You read it and press send.', 'claude.ai'],
  ['4-search', 'Find any conversation in a second', 'Local search across titles and the chats you open, on both sites.', 'chatgpt.com'],
  ['5-export', 'Export to Markdown, JSON or PDF', 'Back up one chat or many. Everything stays in your browser.', 'chatgpt.com'],
];
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
for (const [name, title, sub, host] of CAPTIONS) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1280px;height:800px;overflow:hidden}
    body{font-family:"Ubuntu Sans","Inter",system-ui,sans-serif;background:radial-gradient(520px 300px at 12% 0%,rgba(47,91,255,.14),transparent 70%),radial-gradient(520px 300px at 95% 100%,rgba(255,160,80,.12),transparent 70%),#f6f4ee;color:#111113;-webkit-font-smoothing:antialiased}
    .cap{text-align:center;padding:30px 40px 0}h1{margin:0;font-size:38px;letter-spacing:-.03em;font-weight:780}p{margin:8px 0 0;color:#55545c;font-size:18px}
    .win{position:absolute;left:60px;top:132px;width:1160px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 4px rgba(17,17,19,.06),0 30px 60px -18px rgba(17,17,19,.32);border:1px solid rgba(17,17,19,.1)}
    .bar{height:40px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#efede6;border-bottom:1px solid rgba(17,17,19,.08)}
    .bar i{width:11px;height:11px;border-radius:50%;background:rgba(17,17,19,.16)}.url{flex:1;margin:0 70px 0 18px;height:24px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font:13px ui-monospace,monospace;color:#6b6a72}
    img{display:block;width:1160px;height:610px}
  </style></head><body><div class="cap"><h1>${title}</h1><p>${sub}</p></div>
  <div class="win"><div class="bar"><i></i><i></i><i></i><div class="url">${host}</div></div><img src="file://${join(OUT, 'raw', name + '.png')}"></div></body></html>`;
  const f = join(OUT, 'raw', name + '.html'); writeFileSync(f, html);
  await nav('file://' + f, 800);
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1280, height: 800, scale: 1 } });
  writeFileSync(join(OUT, `screenshot-${name}.png`), Buffer.from(r.data, 'base64'));
}

ws.close(); chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true });
console.log('screenshots →', OUT);
