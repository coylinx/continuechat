import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import * as db from '../src/shared/db';
import type { Conversation } from '../src/shared/types';
import { run, test } from './_harness';

const conv = (id: string, title: string, text: string, updatedAt = 1000): Conversation => ({ id, platform: 'claude', title, updatedAt, turns: [{ role: 'user', text: 'q' }, { role: 'assistant', text }] });

test('metas never carry turns; list metadata merge keeps saved text', async () => {
  await db.upsertConversation(conv('1', '旅行', '我们讨论了去杭州西湖的路线'));
  await db.upsertMetas([{ id: '1', platform: 'claude', title: '旅行计划（改名）', updatedAt: 2000 }, { id: '2', platform: 'claude', title: 'Parser', updatedAt: 1500, snippet: 'tokenizer tests' }]);
  const rows = await db.listMetas();
  assert.deepEqual(rows.map((r) => [r.key, r.title, r.turnCount]), [['claude:1', '旅行计划（改名）', 2], ['claude:2', 'Parser', 0]]);
  assert.ok(!('turns' in rows[0])); assert.equal((await db.getStored('claude:1'))!.turns!.length, 2);
  assert.deepEqual((await db.listMetas(['claude:2', 'missing'])).map((r) => r.key), ['claude:2']);
});
test('search finds Chinese words inside saved text and returns a snippet', async () => {
  const hits = await db.search('西湖');
  assert.equal(hits[0]?.key, 'claude:1'); assert.ok(hits[0].snippet.includes('西湖'), hits[0].snippet);
  assert.equal((await db.search('tokenizer'))[0]?.key, 'claude:2'); assert.deepEqual(await db.search('   '), []);
});
test('continue counter: atomic check-and-increment with refund', async () => {
  assert.equal(await db.getContinueCount(), 0);
  assert.deepEqual(await db.consumeContinue(2), { ok: true, used: 1 }); assert.deepEqual(await db.consumeContinue(2), { ok: true, used: 2 });
  assert.deepEqual(await db.consumeContinue(2), { ok: false, used: 2 });
  await db.refundContinue(); assert.equal(await db.getContinueCount(), 1);
  const all = await Promise.all([db.consumeContinue(3), db.consumeContinue(3), db.consumeContinue(3)]);
  assert.equal(all.filter((r) => r.ok).length, 2, 'concurrent consumers never exceed the limit');
});
test('folders: rename, file, unfile; delete keeps chats', async () => {
  await db.putFolder({ id: 'f1', name: 'Work', createdAt: 1, conversationKeys: [] });
  await db.setInFolder('f1', 'claude:1', true); await db.setInFolder('f1', 'claude:2', true); await db.setInFolder('f1', 'claude:1', false);
  await db.renameFolder('f1', 'Projects');
  assert.deepEqual(await db.listFolders(), [{ id: 'f1', name: 'Projects', createdAt: 1, conversationKeys: ['claude:2'] }]);
  await db.deleteFolder('f1'); assert.equal((await db.listFolders()).length, 0); assert.equal((await db.listMetas()).length, 2);
});
test('backup → wipe → import restores everything; import merges and validates', async () => {
  await db.putFolder({ id: 'f2', name: 'Keep', createdAt: 5, conversationKeys: ['claude:1'] }); await db.togglePin('claude:2');
  const backup = JSON.parse(JSON.stringify(await db.exportBackup()));
  assert.equal(backup.version, 2); assert.equal(backup.conversations.length, 2);
  await db.wipeAll(); assert.deepEqual(await db.stats(), { conversations: 0, withText: 0, folders: 0, pins: 0 });
  assert.deepEqual(await db.importBackup(backup), { conversations: 2, folders: 1, pins: 1 });
  assert.deepEqual(await db.stats(), { conversations: 2, withText: 1, folders: 1, pins: 1 });
  // Importing an older copy never replaces newer data or drops saved text.
  const older = { ...backup, conversations: [{ ...backup.conversations.find((c: any) => c.id === '1'), title: 'OLD', updatedAt: 1, turns: undefined }], folders: [{ id: 'f2', name: 'Keep', createdAt: 5, conversationKeys: ['claude:2'] }], pins: [] };
  await db.importBackup(older);
  const c1 = await db.getStored('claude:1'); assert.equal(c1!.title, '旅行计划（改名）'); assert.equal(c1!.turns!.length, 2);
  assert.deepEqual((await db.listFolders())[0].conversationKeys.sort(), ['claude:1', 'claude:2']);
  // v1 "export all chats" files import too; junk is rejected.
  assert.equal((await db.importBackup({ app: 'ContinueChat', conversations: [{ id: '9', platform: 'chatgpt', title: 'v1', updatedAt: 3 }, { id: 'bad', platform: 'other' }] })).conversations, 1);
  await assert.rejects(db.importBackup({ hello: 1 })); await assert.rejects(db.importBackup(null));
});
test('a built index is updated in place: new text and renames are searchable immediately', async () => {
  await db.search('西湖'); // index is built now
  await db.upsertConversation(conv('3', 'Notes', 'brand new phrase 量子计算'));
  assert.equal((await db.search('量子'))[0]?.key, 'claude:3');
  await db.upsertMetas([{ id: '3', platform: 'claude', title: 'Renamed zebra', updatedAt: 5 }]);
  assert.equal((await db.search('zebra'))[0]?.key, 'claude:3'); assert.equal((await db.search('量子'))[0]?.key, 'claude:3', 'rename keeps saved text indexed');
  assert.equal((await db.search('Notes')).length, 0, 'old title no longer matches');
});
test('stats: cached full-text count stays correct across upserts', async () => {
  const before = await db.stats();
  await db.upsertConversation(conv('4', 'New', 'text')); await db.upsertConversation(conv('4', 'New', 'text again'));
  const after = await db.stats(); assert.equal(after.withText, before.withText + 1); assert.equal(after.conversations, before.conversations + 1);
  await db.upsertConversation({ ...conv('4', 'New', ''), turns: [] }); assert.equal((await db.stats()).withText, before.withText);
});
void run();
