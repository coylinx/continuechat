// Dev-only stand-in for chrome.* so the real extension code runs in a normal page.
// - storage: backed by localStorage, shared across harness tabs (like chrome.storage), with onChanged events
// - runtime.sendMessage: calls the REAL background handlers in-page (IndexedDB works in pages too)
// - tabs.create: chatgpt.com / claude.ai URLs open the local fake site instead; other external URLs are blocked
import { handlers } from '../src/background/handlers';

const NS = 'ccdev:';
type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
const listeners: ((c: Changes, area: string) => void)[] = [];
const emit = (c: Changes, area: string) => { if (Object.keys(c).length) for (const l of listeners) l(c, area); };
const read = (raw: string | null) => (raw == null ? undefined : JSON.parse(raw));

function area(name: 'local' | 'session') {
  const pre = `${NS}${name}:`;
  const all = () => { const o: Record<string, unknown> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(pre)) o[k.slice(pre.length)] = read(localStorage.getItem(k)); } return o; };
  return {
    async get(keys?: string | string[] | Record<string, unknown> | null) {
      const a = all(); if (keys == null) return a;
      const ks = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      return Object.fromEntries(ks.filter((k) => k in a).map((k) => [k, a[k]]));
    },
    async set(v: Record<string, unknown>) {
      const c: Changes = {};
      for (const [k, val] of Object.entries(v)) { const s = JSON.stringify(val); if (s.length > 4_000_000) throw new Error('QUOTA_BYTES quota exceeded'); c[k] = { oldValue: read(localStorage.getItem(pre + k)), newValue: val }; localStorage.setItem(pre + k, s); }
      emit(c, name);
    },
    async remove(keys: string | string[]) { const c: Changes = {}; for (const k of Array.isArray(keys) ? keys : [keys]) { if (localStorage.getItem(pre + k) != null) c[k] = { oldValue: read(localStorage.getItem(pre + k)) }; localStorage.removeItem(pre + k); } emit(c, name); },
    async clear() { const c: Changes = {}; for (const k of Object.keys(all())) { c[k] = { oldValue: undefined }; localStorage.removeItem(pre + k); } emit(c, name); },
  };
}
// Changes made in other harness tabs (localStorage "storage" event only fires in the OTHER tabs).
window.addEventListener('storage', (e) => {
  if (!e.key?.startsWith(NS)) return; const [, areaName, ...rest] = e.key.split(':');
  emit({ [rest.join(':')]: { oldValue: read(e.oldValue), newValue: read(e.newValue) } }, areaName);
});

const params = new URLSearchParams(location.search);
const tabId = Number(params.get('tab') ?? sessionStorage.getItem('ccdev-tab') ?? Math.floor(Math.random() * 1e6));
sessionStorage.setItem('ccdev-tab', String(tabId));
const PAGES: Record<string, string> = { 'options/index.html': '/dev/options.html', 'print/index.html': '/dev/print.html', 'popup/index.html': '/dev/popup.html', 'privacy.html': '/site/privacy.html' };
const getURL = (p: string) => { const [path, hash] = p.split('#'); return location.origin + (PAGES[path] ?? '/' + path) + (hash != null ? '#' + hash : ''); };
const withTab = (url: string, id: number) => { const u = new URL(url, location.origin); u.searchParams.set('tab', String(id)); return u.toString(); };

(globalThis as any).chrome = {
  storage: { local: area('local'), session: area('session'), onChanged: { addListener: (f: (c: Changes, a: string) => void) => listeners.push(f) } },
  runtime: {
    id: 'dev', getURL, getManifest: () => ({ version: '0.2.0-dev' }),
    async sendMessage(msg: { type: keyof typeof handlers }) {
      const h = handlers[msg.type] as ((m: unknown, s: unknown) => Promise<unknown>) | undefined;
      if (!h) return { ok: false, error: `unknown rpc ${String(msg.type)}` };
      try { return { ok: true, data: structuredClone(await h(structuredClone(msg), { id: 'dev', tab: { id: tabId, index: 0 } })) }; }
      catch (e) { return { ok: false, error: (e as Error).message }; }
    },
    openOptionsPage: () => window.open(getURL('options/index.html')),
  },
  tabs: {
    async create({ url }: { url: string }) {
      const id = Math.floor(Math.random() * 1e6); const u = new URL(url, location.origin);
      const target = u.hostname === 'chatgpt.com' ? `/chatgpt/?tab=${id}` : u.hostname === 'claude.ai' ? `/claude/new?tab=${id}` : u.origin === location.origin ? withTab(url, id) : null;
      if (target) window.open(target, '_blank'); else console.warn('[dev] external tab blocked:', url);
      return { id, index: 1 };
    },
  },
  alarms: { get: async () => null, create: async () => undefined, onAlarm: { addListener() {} } },
};
console.info('[dev] chrome.* mock active · tab', tabId);
