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
  (await dbp).put('conversations', { ...c, key: convKey(c.platform, c.id) });
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
export async function incContinueCount() {
  const db = await dbp; const m = monthKey();
  const cur = (await db.get('usage', m))?.continueCount ?? 0;
  await db.put('usage', { month: m, continueCount: cur + 1 });
}

/** Simple in-memory full-text index rebuilt from IndexedDB. */
export async function buildSearchIndex() {
  const ms = new MiniSearch<{ key: string; title: string; body: string }>({ fields: ['title', 'body'], storeFields: ['title'], idField: 'key' });
  const all = await (await dbp).getAll('conversations');
  ms.addAll(all.map((c) => ({ key: c.key, title: c.title, body: c.turns.map((t) => t.text).join('\n') })));
  return ms;
}
