import assert from 'node:assert/strict';
import { mockChrome, run, test } from './_harness';
mockChrome();
const i18n = await import('../src/shared/i18n');
const { t, setLang } = i18n;

// Read both dictionaries through t() with every placeholder filled, and compare which values made it in.
const enKeys = Object.keys(i18n.MESSAGES.en);
test('zh has exactly the en keys', () => assert.deepEqual(Object.keys(i18n.MESSAGES.zh).sort(), [...enKeys].sort()));
const VARS = Object.fromEntries(['site', 'full', 'budget', 'used', 'left', 'limit', 'name', 'date', 'i', 'msg', 'title', 'chats', 'folders', 'pins', 'v'].map((k) => [k, `⟦${k}⟧`]).concat([['n', 97]]));

test('dictionary has a reasonable number of keys', () => assert.ok(enKeys.length > 150, String(enKeys.length)));
test('no {placeholder} is left unfilled in either language', () => {
  for (const lang of ['en', 'zh'] as const) { setLang(lang); for (const k of enKeys) { const s = t(k as never, VARS); assert.ok(!/\{\w+\}/.test(s), `${lang}.${k}: ${s}`); } }
});
test('zh uses the same variables as en for every key', () => {
  const used = (lang: 'en' | 'zh', k: string) => { setLang(lang); const s = t(k as never, VARS); return Object.values(VARS).map(String).filter((v) => s.includes(v)).sort().join(','); };
  for (const k of enKeys) assert.equal(used('zh', k), used('en', k), k);
});
test('zh strings are actually Chinese (except brand/format names)', () => {
  setLang('zh'); const latinOnly = enKeys.filter((k) => !/[一-鿿]/.test(t(k as never, VARS)));
  assert.deepEqual(latinOnly.sort(), ['ctxAI', 'fmtMd', 'pro', 'secPro'].sort());
});
test('English plurals', () => { setLang('en'); assert.equal(t('nTurns', { n: 1 }), '1 turn'); assert.equal(t('nTurns', { n: 2 }), '2 turns'); assert.equal(t('exportN', { n: 1 }), 'Export 1 chat'); });
test('detectLang: auto follows the browser, explicit wins', () => {
  assert.equal(i18n.detectLang('en'), 'en'); assert.equal(i18n.detectLang('zh'), 'zh');
  assert.equal(i18n.detectLang('auto'), (navigator.language ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
});
void run();
