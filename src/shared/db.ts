// BACKGROUND ONLY: imported solely by the service worker so all data lives in the extension origin.
import { openDB, type DBSchema } from 'idb';
import MiniSearch from 'minisearch';
import { makeSnippet, tokenize } from './search';
import type { Backup, Conversation, ConversationMeta, Folder, MetaRow, Pin, SearchHit, StoredConversation } from './types';
import { convKey, isPlatform } from './types';

interface CCDB extends DBSchema {
  conversations: { key: string; value: StoredConversation };
  folders: { key: string; value: Folder };
  pins: { key: string; value: Pin };
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
  const rec: StoredConversation = { ...c, key: convKey(c.platform, c.id), fetchedAt: Date.now() };
  const db = await dbp; const had = !!(await db.get('conversations', rec.key))?.turns?.length;
  await db.put('conversations', rec); reindex([rec]);
  if (withTextCount !== undefined) withTextCount += Number(!!rec.turns?.length) - Number(had);
}
/** Merge list metadata without dropping already-fetched turns. */
export async function upsertMetas(metas: ConversationMeta[]) {
  const tx = (await dbp).transaction('conversations', 'readwrite'); const recs: StoredConversation[] = [];
  for (const m of metas) {
    const key = convKey(m.platform, m.id); const old = await tx.store.get(key);
    const rec: StoredConversation = { ...old, ...m, snippet: m.snippet ?? old?.snippet, key }; recs.push(rec); await tx.store.put(rec);
  }
  await tx.done; reindex(recs);
}
export async function getStored(key: string) { return (await dbp).get('conversations', key); }
export async function getMany(keys: string[]) { const db = await dbp; return (await Promise.all(keys.map((k) => db.get('conversations', k)))).filter((c): c is StoredConversation => !!c); }
export async function listStored() { return (await dbp).getAll('conversations'); }
const toMeta = ({ turns, fetchedAt: _f, ...m }: StoredConversation): MetaRow => ({ ...m, turnCount: turns?.length ?? 0 });
/** Rows without turns, newest first — keeps panel/popup messages small even with lots of saved text. */
export async function listMetas(keys?: string[]) {
  const rows = keys ? await getMany(keys) : await listStored();
  return rows.map(toMeta).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Deletes ALL local ContinueChat data (conversations index, folders, pins, usage). */
export async function wipeAll() { const db = await dbp; for (const s of ['conversations', 'folders', 'pins', 'usage'] as const) await db.clear(s); invalidateSearch(); withTextCount = undefined; }
export async function listFolders() { return (await (await dbp).getAll('folders')).sort((a, b) => a.createdAt - b.createdAt); }
export async function putFolder(f: Folder) { return (await dbp).put('folders', f); }
export async function renameFolder(id: string, name: string) {
  const db = await dbp; const f = await db.get('folders', id); if (!f) return; f.name = name; await db.put('folders', f);
}
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
/** Gives a continue back when the target tab could not be opened. */
export async function refundContinue() {
  const tx = (await dbp).transaction('usage', 'readwrite'); const m = monthKey();
  const cur = (await tx.store.get(m))?.continueCount ?? 0; if (cur > 0) await tx.store.put({ month: m, continueCount: cur - 1 }); await tx.done;
}

/** How many chats have saved text: costly to count (reads every record), so computed once and then kept current. */
let withTextCount: number | undefined;
export async function stats() {
  const db = await dbp;
  if (withTextCount === undefined) {
    let n = 0; for (let cur = await db.transaction('conversations').store.openCursor(); cur; cur = await cur.continue()) if (cur.value.turns?.length) n++;
    withTextCount = n;
  }
  return { conversations: await db.count('conversations'), withText: withTextCount, folders: await db.count('folders'), pins: await db.count('pins') };
}
export async function exportBackup(): Promise<Backup> {
  const db = await dbp;
  return { app: 'ContinueChat', kind: 'backup', version: 2, exportedAt: new Date().toISOString(), conversations: await db.getAll('conversations'), folders: await db.getAll('folders'), pins: await db.getAll('pins') };
}
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
/** Accepts a v2 backup or the v1 "export all chats" JSON ({conversations}). Merges: never deletes existing data. */
export async function importBackup(data: unknown) {
  const d = data as Partial<Backup> | null;
  if (!d || typeof d !== 'object' || d.app !== 'ContinueChat' || !Array.isArray(d.conversations)) throw new Error('not a ContinueChat backup');
  const db = await dbp; const tx = db.transaction(['conversations', 'folders', 'pins'], 'readwrite');
  let conversations = 0, folders = 0, pins = 0;
  for (const c of d.conversations) {
    if (!c || !isPlatform(c.platform) || !str(c.id)) continue;
    const key = convKey(c.platform, c.id); const old = await tx.objectStore('conversations').get(key);
    const turns = Array.isArray(c.turns) ? c.turns.filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string') : undefined;
    const next: StoredConversation = { id: c.id, platform: c.platform, key, title: typeof c.title === 'string' ? c.title : 'Untitled', updatedAt: Number(c.updatedAt) || 0,
      snippet: typeof c.snippet === 'string' ? c.snippet : undefined, turns: turns?.length ? turns : undefined, fetchedAt: Number(c.fetchedAt) || undefined };
    // Keep whichever copy is newer; never replace saved text with nothing.
    const merged = old && old.updatedAt > next.updatedAt ? { ...next, ...old, turns: old.turns ?? next.turns } : { ...old, ...next, turns: next.turns ?? old?.turns };
    await tx.objectStore('conversations').put(merged); conversations++;
  }
  for (const f of Array.isArray(d.folders) ? d.folders : []) {
    if (!f || !str(f.id) || typeof f.name !== 'string' || !Array.isArray(f.conversationKeys)) continue;
    const old = await tx.objectStore('folders').get(f.id); const keys = f.conversationKeys.filter(str);
    await tx.objectStore('folders').put({ id: f.id, name: f.name.slice(0, 100), createdAt: Number(f.createdAt) || Date.now(), conversationKeys: [...new Set([...(old?.conversationKeys ?? []), ...keys])] }); folders++;
  }
  for (const p of Array.isArray(d.pins) ? d.pins : []) { if (p && str(p.key)) { await tx.objectStore('pins').put({ key: p.key, pinnedAt: Number(p.pinnedAt) || Date.now() }); pins++; } }
  await tx.done; invalidateSearch(); withTextCount = undefined;
  return { conversations, folders, pins };
}

type Doc = { key: string; title: string; body: string; platform: string };
let index: MiniSearch<Doc> | undefined;
export function invalidateSearch() { index = undefined; }
const bodyOf = (c: StoredConversation) => [c.snippet ?? '', ...(c.turns ?? []).map((t) => t.text + ' ' + (t.attachments ?? []).map((a) => a.name).join(' '))].join('\n');
const docOf = (c: StoredConversation): Doc => ({ key: c.key, title: c.title, platform: c.platform, body: bodyOf(c) });
/** Keeps an already-built index current in place: opening a chat must not force a full rebuild on the next search. */
function reindex(recs: StoredConversation[]) {
  if (!index) return;
  for (const r of recs) { if (index.has(r.key)) index.replace(docOf(r)); else index.add(docOf(r)); }
}
export async function search(q: string): Promise<SearchHit[]> {
  if (!q.trim()) return [];
  if (!index) {
    index = new MiniSearch<Doc>({ fields: ['title', 'body'], storeFields: ['title', 'platform'], idField: 'key', tokenize,
      searchOptions: { boost: { title: 3 }, tokenize, prefix: true, fuzzy: (term) => (term.length >= 4 ? 0.2 : false), combineWith: 'AND' } });
    index.addAll((await listStored()).map(docOf));
  }
  const hits = index.search(q).slice(0, 50);
  const docs = new Map((await getMany(hits.map((h) => String(h.id)))).map((c) => [c.key, c]));
  return hits.map((r) => {
    const terms = [...new Set([...r.queryTerms, ...r.terms])]; const c = docs.get(String(r.id));
    return { key: String(r.id), title: String(r.title), platform: r.platform as SearchHit['platform'], score: r.score, terms, snippet: c ? makeSnippet(bodyOf(c), terms) : '' };
  });
}
