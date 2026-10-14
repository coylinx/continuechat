import assert from 'node:assert/strict';
import MiniSearch from 'minisearch';
import { makeSnippet, splitHighlights, tokenize } from '../src/shared/search';
import { run, test } from './_harness';

test('latin text tokenizes like MiniSearch default', () => assert.deepEqual(tokenize('Hello, world! foo-bar baz_qux'), ['Hello', 'world', 'foo', 'bar', 'baz', 'qux']));
test('CJK runs become overlapping bigrams; mixed text is split by script', () => {
  assert.deepEqual(tokenize('机器学习'), ['机器', '器学', '学习']);
  assert.deepEqual(tokenize('用Python写爬虫'), ['用', 'Python', '写爬', '爬虫']);
  assert.deepEqual(tokenize('猫'), ['猫']);
  assert.deepEqual(tokenize('カタカナ'), ['カタ', 'タカ', 'カナ']);
});

// Same options as src/shared/db.ts search().
const ms = new MiniSearch<{ id: string; title: string; body: string }>({ fields: ['title', 'body'], storeFields: ['title'], tokenize,
  searchOptions: { boost: { title: 3 }, tokenize, prefix: true, fuzzy: (term) => (term.length >= 4 ? 0.2 : false), combineWith: 'AND' } });
ms.addAll([
  { id: 'a', title: '周末旅行计划', body: '我们讨论了去杭州西湖的路线，以及预算安排。' },
  { id: 'b', title: 'Refactoring the parser', body: 'We split the tokenizer and added tests for edge cases.' },
  { id: 'c', title: '机器学习入门', body: '介绍了监督学习和无监督学习的区别。' },
]);
const ids = (q: string) => ms.search(q).map((r) => r.id);
test('Chinese word in the middle of a sentence is found (was impossible with the default tokenizer)', () => {
  assert.deepEqual(ids('西湖'), ['a']); assert.deepEqual(ids('预算'), ['a']); assert.deepEqual(ids('无监督'), ['c']);
});
test('multi-word queries are AND-combined', () => { assert.deepEqual(ids('学习 区别'), ['c']); assert.deepEqual(ids('西湖 监督'), []); });
test('English prefix + fuzzy still work', () => { assert.deepEqual(ids('refac'), ['b']); assert.deepEqual(ids('tokeniser'), ['b']); });

test('snippet centres on the first match and collapses whitespace', () => {
  const body = 'intro '.repeat(40) + '\n\nthe   MATCH is here ' + 'tail '.repeat(40);
  const sn = makeSnippet(body, ['match']); assert.ok(sn.startsWith('…') && sn.endsWith('…') && sn.includes('the MATCH is here'), sn);
  assert.ok(sn.length <= 142);
  assert.equal(makeSnippet('short body', ['zzz']), 'short body');
});
test('highlight split keeps text intact; odd parts are matches', () => {
  const parts = splitHighlights('机器学习入门', ['机器', '器学', '学习']);
  assert.equal(parts.join(''), '机器学习入门'); assert.deepEqual(parts.filter((_, i) => i % 2), ['机器', '学习']);
  assert.deepEqual(splitHighlights('a.b (c)', ['.', '(c)']), ['a', '.', 'b ', '(c)', '']);
  assert.deepEqual(splitHighlights('abc', []), ['abc']);
});
void run();
