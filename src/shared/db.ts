// BACKGROUND ONLY: imported solely by the service worker so all data lives in the extension origin.
import { openDB, type DBSchema } from 'idb';
import MiniSearch from 'minisearch';
import type { Conversation, Folder } from './types';
import { convKey } from './types';

interface CCDB extends DBSchema {
  conversations: { key: string; value: Conversation & { key: string } };
  folders: { key: string; value: Folder };
  pins: { key: string; value: { key: string; pinnedAt: number } };
  usage: { key: string; value: { month: string; continueCount: number } };
}

export const dbp = openDB<CCDB>('continuechat', 1, {
  upgrade(db) {
    db.createObjectStore('conversations', { keyPath: 'key' });
    db.createObjectStore('folders', { keyPath: 'id' });
    db.createObjectStore('pins', { keyPath: 'key' });
    db.createObjectStore('usage', { keyPath: 'month' });
  },
});

export async function upsertConversation(c: Conversation) {
  await (await dbp).put('conversations', { ...c, key: convKey(c.platform, c.id) }); invalidateSearch();
}
export async function listFolders() { return (await dbp).getAll('folders'); }
export async function putFolder(f: Folder) { return (await dbp).put('folders', f); }
export async function togglePin(key: string) {
  const db = await dbp;
  if (await db.get('pins', key)) await db.delete('pins', key);
  else await db.put('pins', { key, pinnedAt: Date.now() });
}

/** Month key "YYYY-MM" — counters reset naturally on the 1st (local time). */
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export async function getContinueCount() { return (await (await dbp).get('usage', monthKey()))?.continueCount ?? 0; }
/** Atomic (single readwrite tx) check-and-increment; limit=Infinity for premium. */
export async function consumeContinue(limit: number) {
  const tx = (await dbp).transaction('usage', 'readwrite'); const m = monthKey();
  const cur = (await tx.store.get(m))?.continueCount ?? 0;
  if (cur >= limit) { await tx.done; return { ok: false, used: cur }; }
  await tx.store.put({ month: m, continueCount: cur + 1 }); await tx.done;
  return { ok: true, used: cur + 1 };
}

let index: MiniSearch<{ key: string; title: string; body: string }> | undefined;
export async function search(q: string) {
  index ??= await buildSearchIndex();
  return index.search(q, { prefix: true, fuzzy: 0.2 }).slice(0, 50).map((r) => ({ key: String(r.id), title: String(r.title), score: r.score }));
}
export function invalidateSearch() { index = undefined; }
/** Simple in-memory full-text index rebuilt from IndexedDB. */
export async function buildSearchIndex() {
  const ms = new MiniSearch<{ key: string; title: string; body: string }>({ fields: ['title', 'body'], storeFields: ['title'], idField: 'key' });
  const all = await (await dbp).getAll('conversations');
  ms.addAll(all.map((c) => ({ key: c.key, title: c.title, body: c.turns.map((t) => t.text).join('\n') })));
  return ms;
}
