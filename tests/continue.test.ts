import assert from 'node:assert/strict';
import { buildContext, normalizeTurns, type ContextLabels } from '../src/shared/continue';
import { toJSON, toMarkdown } from '../src/shared/export';
import type { Conversation, Turn } from '../src/shared/types';
import { run, test } from './_harness';

const code = (i: number) => '```ts\n' + Array.from({ length: 60 }, (_, k) => `const v${i}_${k} = compute(${k}); // line ${k}`).join('\n') + '\n```';
const table = (i: number) => `| col A | col B | col C |\n|---|---|---|\n` + Array.from({ length: 20 }, (_, k) => `| a${i}-${k} | b${i}-${k} | c${i}-${k} |`).join('\n');
const turns: Turn[] = [];
for (let i = 0; i < 16; i++) {
  turns.push({ role: 'user', text: `Question ${i}: refactor module ${i}?` });
  turns.push({ role: 'assistant', text: `Answer ${i}. Here is code:\n\n${code(i)}\n\nAnd a table:\n\n${table(i)}\n\nEND-${i}` });
}
const conv: Conversation = { id: 'x', platform: 'claude', title: 'Synthetic', updatedAt: Date.now(), turns };
const fences = (s: string) => (s.match(/^```/gm) ?? []).length;

const r8 = buildContext(conv, { turns: 8 });
test('overflow reported for 8 turns (>12k)', () => { assert.ok(r8.fullLength > 12000); assert.equal(r8.overflow, r8.fullLength - 12000); });
test('trimmed text fits budget', () => assert.ok(r8.text.length <= 12000, `len ${r8.text.length}`));
test('trim drops earliest, keeps latest', () => { assert.ok(r8.text.includes('END-15')); assert.ok(!r8.text.includes('Question 12:')); });
test('trimmedChars ≈ removed amount', () => assert.ok(r8.trimmedChars >= r8.overflow && r8.trimmedChars < r8.overflow + 3500, String(r8.trimmedChars)));
test('code fences balanced after trim', () => assert.equal(fences(r8.text) % 2, 0));
test('no partial code block / table row at cut', () => {
  for (const m of r8.text.matchAll(/```ts\n([\s\S]*?)```/g)) assert.equal(m[1].trim().split('\n').length, 60);
  for (const line of r8.text.split('\n')) if (line.startsWith('|')) assert.ok(line.endsWith('|'), line);
});
const r4 = buildContext(conv, { turns: 4 });
test('Bring 4 turns: 4 turns, no overflow', () => { assert.equal(r4.includedTurns, 4); assert.equal(r4.overflow, 0); assert.equal(r4.text.length, r4.fullLength); });
test('Bring 4 turns: code/tables intact', () => { assert.equal(fences(r4.text), 4); assert.ok(r4.text.includes(table(15))); assert.ok(r4.text.includes(code(14))); });
test('all turns huge still fits', () => { const ra = buildContext(conv, { turns: 'all' }); assert.ok(ra.text.length <= 12000); assert.equal(fences(ra.text) % 2, 0); });
test('every budget option is respected', () => { for (const b of [8000, 12000, 24000, 48000]) { const r = buildContext(conv, { turns: 'all', charBudget: b }); assert.ok(r.text.length <= b, `${b}: ${r.text.length}`); assert.equal(fences(r.text) % 2, 0); } });

test('single oversized code block: fits, fence re-opened & balanced', () => {
  const big: Conversation = { ...conv, turns: [{ role: 'assistant', text: '```py\n' + Array.from({ length: 800 }, (_, k) => `x${k} = ${k}`).join('\n') + '\n```' }] };
  const r = buildContext(big, { turns: 4 }); assert.ok(r.text.length <= 12000, String(r.text.length)); assert.equal(fences(r.text) % 2, 0); assert.ok(r.text.includes('x799 = 799'));
});
test('single huge line (no newlines) still fits the budget exactly', () => {
  const big: Conversation = { ...conv, turns: [{ role: 'assistant', text: '```\n' + 'y'.repeat(30000) }] };
  const r = buildContext(big, { turns: 4 }); assert.ok(r.text.length <= 12000, String(r.text.length));
});
test('header names the chat and turn count; labels are swappable (zh)', () => {
  assert.ok(r4.text.startsWith('Context from my earlier chat "Synthetic" (last 4 turns):'));
  const zh: ContextLabels = { header: (n, title) => `以下是我之前一段对话“${title}”的上下文（最近 ${n} 轮）：`, footer: '请接着这里继续。', user: '用户', ai: 'AI', trimmed: '…[更早的上下文已省略]', fileTruncated: '…[文件内容已截断]' };
  const r = buildContext(conv, { turns: 8, labels: zh });
  assert.ok(r.text.startsWith('以下是我之前一段对话“Synthetic”的上下文（最近 8 轮）：')); assert.ok(r.text.endsWith('请接着这里继续。'));
  assert.ok(r.text.includes('…[更早的上下文已省略]')); assert.ok(r.text.includes('\n用户:\n') || r.text.includes('用户:\n')); assert.ok(r.text.length <= 12000);
});
test('long titles are shortened in the header', () => {
  const r = buildContext({ ...conv, title: 'T'.repeat(300) }, { turns: 4 }); assert.ok(r.text.split('\n')[0].length < 140);
});
test('attachments: included with cap, excludable', () => {
  const c: Conversation = { ...conv, turns: [{ role: 'user', text: 'see file', attachments: [{ name: 'a.txt', text: 'A'.repeat(5000) }, { name: 'b.txt', text: 'B-BODY' }] }, { role: 'assistant', text: 'ok' }] };
  const r = buildContext(c, { turns: 4 }); assert.ok(r.text.includes('[a.txt]') && r.text.includes('…[file truncated]') && r.text.includes('B-BODY'));
  const r2 = buildContext(c, { turns: 4, excludeAttachments: new Set(['0:b.txt']) }); assert.ok(!r2.text.includes('B-BODY'));
});
test('normalizeTurns merges same-role runs and drops empties', () => {
  const n = normalizeTurns([{ role: 'user', text: 'q' }, { role: 'assistant', text: 'part 1' }, { role: 'assistant', text: '' }, { role: 'assistant', text: 'part 2' }, { role: 'user', text: 'q2' }]);
  assert.deepEqual(n.map((x) => [x.role, x.text]), [['user', 'q'], ['assistant', 'part 1\n\npart 2'], ['user', 'q2']]);
});

const md = toMarkdown([conv]);
test('markdown export keeps code + tables verbatim', () => { for (let i = 0; i < 16; i++) { assert.ok(md.includes(code(i))); assert.ok(md.includes(table(i))); } });
test('json export round-trips text', () => assert.deepEqual(JSON.parse(toJSON([conv])).conversations[0].turns, turns));
void run();
