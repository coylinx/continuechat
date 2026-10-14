import assert from 'node:assert/strict';
import { parseChatGPTConversation, type ChatGPTConversationJSON } from '../src/content/adapters/chatgpt';
import { parseClaudeConversation, type ClaudeConversationJSON } from '../src/content/adapters/claude';
import { forEachPage, type ListPage } from '../src/content/adapters/types';
import type { ConversationMeta } from '../src/shared/types';
import { run, test } from './_harness';

const msg = (role: string, parts: unknown[], extra: Record<string, unknown> = {}) => ({ author: { role }, content: { content_type: 'text', parts }, ...extra });
test('ChatGPT: walks the visible branch and skips hidden/system/tool/thinking nodes', () => {
  const d: ChatGPTConversationJSON = { title: 'T', update_time: 1760000000, current_node: 'a2', mapping: {
    root: { parent: null, message: null },
    sys: { parent: 'root', message: msg('system', ['you are…']) },
    ctx: { parent: 'sys', message: { author: { role: 'user' }, content: { content_type: 'user_editable_context', parts: ['custom instructions'] } } },
    hid: { parent: 'ctx', message: msg('user', ['hidden'], { metadata: { is_visually_hidden_from_conversation: true } }) },
    u1: { parent: 'hid', message: msg('user', ['Hello', { asset_pointer: 'img' }]) },
    old: { parent: 'u1', message: msg('assistant', ['OLD BRANCH']) },
    th: { parent: 'u1', message: { author: { role: 'assistant' }, content: { content_type: 'thoughts', parts: ['thinking…'] } } },
    tool: { parent: 'th', message: msg('assistant', ['{"query":"x"}'], { recipient: 'browser' }) },
    tr: { parent: 'tool', message: msg('tool', ['results']) },
    a1: { parent: 'tr', message: msg('assistant', ['Part one']) },
    a2: { parent: 'a1', message: msg('assistant', ['Part two']) },
  } };
  const c = parseChatGPTConversation('id1', d);
  assert.deepEqual(c.turns, [{ role: 'user', text: 'Hello' }, { role: 'assistant', text: 'Part one\n\nPart two' }]);
  assert.equal(c.updatedAt, 1760000000 * 1000); assert.equal(c.title, 'T');
});
test('ChatGPT: survives a cycle and a missing mapping', () => {
  const c = parseChatGPTConversation('x', { current_node: 'a', mapping: { a: { parent: 'b', message: msg('user', ['A']) }, b: { parent: 'a', message: msg('assistant', ['B']) } } });
  assert.deepEqual(c.turns.map((t) => t.text), ['B', 'A']);
  assert.deepEqual(parseChatGPTConversation('y', {}).turns, []); assert.equal(parseChatGPTConversation('y', {}).title, 'Untitled');
});

const cm = (uuid: string, sender: string, index: number, text: string, parent?: string, extra: Record<string, unknown> = {}) => ({ uuid, sender, index, text, parent_message_uuid: parent, ...extra });
const ROOT = '00000000-0000-4000-8000-000000000000';
test('Claude: follows current_leaf_message_uuid (user switched back to an older branch)', () => {
  const d: ClaudeConversationJSON = { name: 'C', updated_at: '2026-10-13T10:00:00Z', current_leaf_message_uuid: 'a1', chat_messages: [
    cm('u1', 'human', 0, 'Question', ROOT), cm('a1', 'assistant', 1, 'Answer v1', 'u1'), cm('a2', 'assistant', 2, 'Answer v2 (retry)', 'u1'), cm('u2', 'human', 3, 'Follow-up on v2', 'a2'),
  ] };
  assert.deepEqual(parseClaudeConversation('c', d).turns.map((t) => t.text), ['Question', 'Answer v1']);
});
test('Claude: without current_leaf, uses the highest index leaf', () => {
  const d: ClaudeConversationJSON = { chat_messages: [cm('u1', 'human', 0, 'Q', ROOT), cm('a1', 'assistant', 1, 'A1', 'u1'), cm('a2', 'assistant', 2, 'A2', 'u1'), cm('u2', 'human', 3, 'Q2', 'a2')] };
  assert.deepEqual(parseClaudeConversation('c', d).turns.map((t) => t.text), ['Q', 'A2', 'Q2']);
});
test('Claude: no parent links → all messages in index order (not just the last one)', () => {
  const d: ClaudeConversationJSON = { chat_messages: [cm('b', 'assistant', 1, 'A'), cm('a', 'human', 0, 'Q'), cm('c', 'human', 2, 'Q2')] };
  assert.deepEqual(parseClaudeConversation('c', d).turns.map((t) => t.text), ['Q', 'A', 'Q2']);
});
test('Claude: content blocks, attachments with extracted text only', () => {
  const d: ClaudeConversationJSON = { chat_messages: [
    cm('u1', 'human', 0, '', ROOT, { content: [{ type: 'text', text: 'Read this' }], attachments: [{ file_name: 'notes.txt', extracted_content: 'NOTES' }, { file_name: 'pic.png' }] }),
    cm('a1', 'assistant', 1, '', 'u1', { content: [{ type: 'thinking' }, { type: 'text', text: 'Done.' }] }),
  ] };
  const c = parseClaudeConversation('c', d);
  assert.deepEqual(c.turns, [{ role: 'user', text: 'Read this', attachments: [{ name: 'notes.txt', text: 'NOTES' }] }, { role: 'assistant', text: 'Done.' }]);
});

const metas = (from: number, n: number): ConversationMeta[] => Array.from({ length: n }, (_, i) => ({ id: 'c' + (from + i), platform: 'chatgpt', title: 't', updatedAt: 0 }));
test('pagination walks pages until a short page', async () => {
  const calls: number[] = []; const got: string[] = [];
  const total = await forEachPage(async (o, l) => { calls.push(o); return { metas: metas(o, Math.min(l, 250 - o)), count: Math.min(l, 250 - o) }; },
    { pageSize: 100, maxPages: 10, onPage: (m) => { got.push(...m.map((x) => x.id)); } });
  assert.deepEqual(calls, [0, 100, 200]); assert.equal(total, 250); assert.equal(new Set(got).size, 250);
});
test('pagination stops when the API ignores offset (same page again)', async () => {
  let calls = 0;
  const total = await forEachPage(async () => { calls++; return { metas: metas(0, 100), count: 100 }; }, { pageSize: 100, maxPages: 10, onPage: () => {} });
  assert.equal(calls, 2); assert.equal(total, 100);
});
test('pagination continues past a page that was entirely filtered out (archived)', async () => {
  const pages: ListPage[] = [{ metas: [], count: 100 }, { metas: metas(100, 30), count: 30 }];
  let i = 0; const total = await forEachPage(async () => pages[i++], { pageSize: 100, maxPages: 10, onPage: () => {} });
  assert.equal(i, 2); assert.equal(total, 30);
});
test('pagination honours maxPages', async () => {
  let calls = 0; await forEachPage(async (o) => { calls++; return { metas: metas(o, 100), count: 100 }; }, { pageSize: 100, maxPages: 3, onPage: () => {} });
  assert.equal(calls, 3);
});
void run();
