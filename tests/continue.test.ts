import assert from 'node:assert/strict';
import { buildContext } from '../src/shared/continue';
import { toJSON, toMarkdown } from '../src/shared/export';
import type { Conversation, Turn } from '../src/shared/types';

const code = (i: number) => '```ts\n' + Array.from({ length: 60 }, (_, k) => `const v${i}_${k} = compute(${k}); // line ${k}`).join('\n') + '\n```';
const table = (i: number) => `| col A | col B | col C |\n|---|---|---|\n` + Array.from({ length: 20 }, (_, k) => `| a${i}-${k} | b${i}-${k} | c${i}-${k} |`).join('\n');
const turns: Turn[] = [];
for (let i = 0; i < 16; i++) {
  turns.push({ role: 'user', text: `Question ${i}: refactor module ${i}?` });
  turns.push({ role: 'assistant', text: `Answer ${i}. Here is code:\n\n${code(i)}\n\nAnd a table:\n\n${table(i)}\n\nEND-${i}` });
}
const conv: Conversation = { id: 'x', platform: 'claude', title: 'Synthetic', updatedAt: Date.now(), turns };
const fences = (s: string) => (s.match(/^```/gm) ?? []).length;
const results: string[] = [];
const ok = (name: string, fn: () => void) => { fn(); results.push('PASS ' + name); };

const r8 = buildContext(conv, { turns: 8 });
ok('overflow reported for 8 turns (>12k)', () => { assert.ok(r8.fullLength > 12000); assert.equal(r8.overflow, r8.fullLength - 12000); });
ok('trimmed text fits budget', () => assert.ok(r8.text.length <= 12000, `len ${r8.text.length}`));
ok('trim drops earliest, keeps latest', () => { assert.ok(r8.text.includes('END-15')); assert.ok(!r8.text.includes('Question 12:')); /* earliest user turn dropped first */ });
ok('trimmedChars ≈ removed amount', () => assert.ok(r8.trimmedChars >= r8.overflow && r8.trimmedChars < r8.overflow + 3500, String(r8.trimmedChars)));
ok('code fences balanced after trim', () => assert.equal(fences(r8.text) % 2, 0));
ok('no partial code block / table row at cut', () => {
  for (const m of r8.text.matchAll(/```ts\n([\s\S]*?)```/g)) assert.equal(m[1].trim().split("\n").length, 60);
  for (const line of r8.text.split('\n')) if (line.startsWith('|')) assert.ok(line.endsWith('|'), line);
});
const r4 = buildContext(conv, { turns: 4 });
ok('Bring 4 turns: 4 turns, no overflow', () => { assert.equal(r4.includedTurns, 4); assert.equal(r4.overflow, 0); assert.equal(r4.text.length, r4.fullLength); });
ok('Bring 4 turns: code/tables intact', () => { assert.equal(fences(r4.text), 4); assert.ok(r4.text.includes(table(15))); assert.ok(r4.text.includes(code(14))); });
ok('all turns huge still fits', () => { const ra = buildContext(conv, { turns: 'all' }); assert.ok(ra.text.length <= 12000); assert.equal(fences(ra.text) % 2, 0); });

ok('single oversized code block: fits, fence re-opened & balanced', () => {
  const big: Conversation = { ...conv, turns: [{ role: 'assistant', text: '```py\n' + Array.from({ length: 800 }, (_, k) => `x${k} = ${k}`).join('\n') + '\n```' }] };
  const r = buildContext(big, { turns: 4 }); assert.ok(r.text.length <= 12000, String(r.text.length)); assert.equal(fences(r.text) % 2, 0); assert.ok(r.text.includes('x799 = 799'));
});
const md = toMarkdown([conv]);
ok('markdown export keeps code + tables verbatim', () => { for (let i = 0; i < 16; i++) { assert.ok(md.includes(code(i))); assert.ok(md.includes(table(i))); } });
const js = JSON.parse(toJSON([conv]));
ok('json export round-trips text', () => assert.deepEqual(js.conversations[0].turns, turns));
console.log(results.join('\n'), `\n${results.length} passed`, `\n[info] 8-turn full=${r8.fullLength} overflow=${r8.overflow} trimmed=${r8.trimmedChars} out=${r8.text.length}`);
