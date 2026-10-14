import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { chatToMarkdown, safeFileName, toPrintableHTML, uniqueNames } from '../src/shared/export';
import { renderMarkdown } from '../src/shared/markdown';
import type { Conversation } from '../src/shared/types';
import { crc32, makeZip } from '../src/shared/zip';
import { run, test } from './_harness';

test('file names keep Chinese and strip characters Windows forbids', () => {
  assert.equal(safeFileName('周末旅行计划'), '周末旅行计划');
  assert.equal(safeFileName('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j');
  assert.equal(safeFileName('  ...  '), 'chat'); assert.equal(safeFileName('CON'), 'chat'); assert.equal(safeFileName('end.'), 'end');
  assert.equal(safeFileName('x'.repeat(200)).length, 80);
});
test('unique names are case-insensitive', () => assert.deepEqual(uniqueNames(['A', 'a', 'b', 'A'], '.md'), ['A.md', 'a (2).md', 'b.md', 'A (3).md']));

test('markdown renderer escapes raw HTML everywhere', () => {
  const h = renderMarkdown('<script>alert(1)</script>\n\n**<b>x</b>**\n\n```\n<img src=x onerror=1>\n```\n\n| <i>a</i> | b |\n|---|---|\n| <x> | y |');
  assert.ok(!/<script|<img|<b>|<i>|<x>/.test(h), h);
  assert.ok(h.includes('&lt;script&gt;') && h.includes('<strong>&lt;b&gt;x&lt;/b&gt;</strong>'));
});
test('markdown: code fences, tables, lists, headings, quotes, links', () => {
  const h = renderMarkdown('# Title\n\nSome `code` and **bold** and *it* and ~~del~~.\n\n```ts\nconst a = 1 < 2;\n```\n\n| A | B |\n|:--|--:|\n| 1 | 2 |\n\n- one\n  - nested\n- two\n\n1. first\n2. second\n\n> quoted\n\n[site](https://example.com) [bad](javascript:alert(1))\n\nline1\nline2');
  assert.ok(h.includes('<h3>Title</h3>'));
  assert.ok(h.includes('<code>code</code>') && h.includes('<strong>bold</strong>') && h.includes('<em>it</em>') && h.includes('<del>del</del>'));
  assert.ok(h.includes('<pre><code data-lang="ts">const a = 1 &lt; 2;</code></pre>'));
  assert.ok(h.includes('<th style="text-align:left">A</th>') || h.includes('<th>A</th>')); assert.ok(h.includes('<td style="text-align:right">2</td>'));
  assert.ok(h.includes('<ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul>'), h);
  assert.ok(h.includes('<ol><li>first</li><li>second</li></ol>'));
  assert.ok(h.includes('<blockquote><p>quoted</p></blockquote>'));
  assert.ok(h.includes('<a href="https://example.com">site</a>') && !h.includes('href="javascript'));
  assert.ok(h.includes('<p>line1<br>line2</p>'));
});
test('markdown: snake_case and math-ish asterisks are left alone', () => {
  const h = renderMarkdown('use snake_case_name and 2 * 3 * 4'); assert.ok(!h.includes('<em>'), h);
});

const conv: Conversation = { id: 'abc', platform: 'chatgpt', title: 'T <1>', updatedAt: Date.UTC(2026, 9, 14), turns: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: '```\ncode\n```', attachments: [{ name: 'f.txt', text: 'x' }] }] };
test('chat markdown has source link, roles and attachment names', () => {
  const md = chatToMarkdown(conv); assert.ok(md.startsWith('# T <1>\n')); assert.ok(md.includes('https://chatgpt.com/c/abc')); assert.ok(md.includes('**User:**') && md.includes('**AI:**') && md.includes('> 📎 f.txt'));
});
test('printable HTML escapes the title and renders turns', () => {
  const h = toPrintableHTML([conv]); assert.ok(h.includes('<h1>T &lt;1&gt;</h1>') && h.includes('<pre><code>code</code></pre>') && h.includes('📎 f.txt'));
});

/** Reads our STORE zip back via the central directory (inflate supported too) and checks CRCs. */
function unzip(buf: Uint8Array) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); const end = buf.length - 22;
  assert.equal(dv.getUint32(end, true), 0x06054b50); const n = dv.getUint16(end + 10, true); let p = dv.getUint32(end + 16, true);
  const out: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50); const method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), off = dv.getUint32(p + 42, true); const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    const lnameLen = dv.getUint16(off + 26, true), lextra = dv.getUint16(off + 28, true); const raw = buf.subarray(off + 30 + lnameLen + lextra, off + 30 + lnameLen + lextra + size);
    const data = method === 8 ? new Uint8Array(inflateRawSync(raw)) : raw; assert.equal(crc32(data), crc, name);
    out[name] = new TextDecoder().decode(data); p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return out;
}
test('zip round-trips UTF-8 names and content with valid CRCs', () => {
  const z = makeZip([{ name: '周末旅行计划.md', data: '# 你好\n' }, { name: 'b.md', data: 'x'.repeat(1000) }, { name: 'empty.md', data: '' }]);
  assert.deepEqual(unzip(z), { '周末旅行计划.md': '# 你好\n', 'b.md': 'x'.repeat(1000), 'empty.md': '' });
});
test('crc32 matches the standard check value', () => assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926));
void run();
