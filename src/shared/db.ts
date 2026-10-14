// BACKGROUND ONLY: imported solely by the service worker so all data lives in the extension origin.
import { openDB, type DBSchema } from 'idb';
import MiniSearch from 'minisearch';
import type { Conversation, ConversationMeta, Folder, StoredConversation } from './types';
import { convKey } from './types';

interface CCDB extends DBSchema {
  conversations: { key: string; value: StoredConversation };
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
/** Merge list metadata without dropping already-fetched turns. */
export async function upsertMetas(metas: ConversationMeta[]) {
  const tx = (await dbp).transaction('conversations', 'readwrite');
  for (const m of metas) { const key = convKey(m.platform, m.id); const old = await tx.store.get(key); await tx.store.put({ ...old, ...m, key }); }
  await tx.done; invalidateSearch();
}
export async function getStored(key: string) { return (await dbp).get('conversations', key); }
export async function listStored() { return (await dbp).getAll('conversations'); }

/** Deletes ALL local ContinueChat data (conversations index, folders, pins, usage). */
export async function wipeAll() { const db = await dbp; for (const s of ['conversations', 'folders', 'pins', 'usage'] as const) await db.clear(s); invalidateSearch(); }
export async function listFolders() { return (await dbp).getAll('folders'); }
export async function putFolder(f: Folder) { return (await dbp).put('folders', f); }
export async function deleteFolder(id: string) { return (await dbp).delete('folders', id); } // conversations untouched
export async function setInFolder(folderId: string, key: string, inFolder: boolean) {
  const db = await dbp; const f = await db.get('folders', folderId); if (!f) return;
  f.conversationKeys = f.conversationKeys.filter((k) => k !== key); if (inFolder) f.conversationKeys.unshift(key);
  await db.put('folders', f);
}
export async function listPins() { return (await (await dbp).getAll('pins')).sort((a, b) => b.pinnedAt - a.pinnedAt); }
export async function togglePin(key: string) {
  const db = await dbp;
  if (await db.get('pins', key)) await db.delete('pins', key); else await db.put('pins', { key, pinnedAt: Date.now() });
}

/** Month key "YYYY-MM" — counters reset naturally on the 1st (local time). */
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export async function getContinueCount() { return (await (await dbp).get('usage', monthKey()))?.continueCount ?? 0; }
/** Atomic (single readwrite tx) check-and-increment; limit=Infinity for Pro. Shared across all sites. */
export async function consumeContinue(limit: number) {
  const tx = (await dbp).transaction('usage', 'readwrite'); const m = monthKey();
  const cur = (await tx.store.get(m))?.continueCount ?? 0;
  if (cur >= limit) { await tx.done; return { ok: false, used: cur }; }
  await tx.store.put({ month: m, continueCount: cur + 1 }); await tx.done;
  return { ok: true, used: cur + 1 };
}

type Doc = { key: string; title: string; body: string; platform: string };
let index: MiniSearch<Doc> | undefined;
export function invalidateSearch() { index = undefined; }
export async function search(q: string) {
  if (!index) {
    index = new MiniSearch<Doc>({ fields: ['title', 'body'], storeFields: ['title', 'platform'], idField: 'key', searchOptions: { boost: { title: 3 } } });
    index.addAll((await listStored()).map((c) => ({ key: c.key, title: c.title, platform: c.platform,
      body: [c.snippet ?? '', ...(c.turns ?? []).map((t) => t.text + ' ' + (t.attachments ?? []).map((a) => a.name).join(' '))].join('\n') })));
  }
  return index.search(q, { prefix: true, fuzzy: 0.2 }).slice(0, 50).map((r) => ({ key: String(r.id), title: String(r.title), platform: String(r.platform), score: r.score }));
}
