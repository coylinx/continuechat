import assert from 'node:assert/strict';
import { mockChrome, run, test } from './_harness';
mockChrome();
const { activate, deactivate, getLicense, isPremium, needsRevalidation, revalidate, setLicense } = await import('../src/shared/license');
const { sanitizeSettings, DEFAULT_SETTINGS } = await import('../src/shared/settings');

const DAY = 86_400_000;
let next: { status: number; body: unknown } | 'throw' = { status: 200, body: {} }; const calls: string[] = [];
globalThis.fetch = (async (url: string) => {
  calls.push(String(url).replace(/^https:\/\/[^/]+/, ''));
  if (next === 'throw') throw new TypeError('Failed to fetch');
  const n = next; return { ok: n.status < 300, status: n.status, json: async () => n.body } as Response;
}) as typeof fetch;

test('isPremium honours the 7-day offline grace window', () => {
  const now = Date.now();
  assert.equal(isPremium({ status: 'active', validatedAt: now - 6 * DAY }, now), true);
  assert.equal(isPremium({ status: 'grace', validatedAt: now - 8 * DAY }, now), false);
  assert.equal(isPremium({ status: 'invalid', validatedAt: now }, now), false); assert.equal(isPremium({ status: 'none' }, now), false);
});
test('needsRevalidation after 3 days only when a key is present', () => {
  const now = Date.now();
  assert.equal(needsRevalidation({ status: 'active', key: 'k', instanceId: 'i', validatedAt: now - 2 * DAY }, now), false);
  assert.equal(needsRevalidation({ status: 'active', key: 'k', instanceId: 'i', validatedAt: now - 3 * DAY }, now), true);
  assert.equal(needsRevalidation({ status: 'none' }, now), false);
});
test('successful activation is saved', async () => {
  next = { status: 200, body: { valid: true, instanceId: 'inst-1', status: 'active' } };
  const r = await activate('GOOD'); assert.equal(r.ok, true); assert.equal((await getLicense()).status, 'active'); assert.equal((await getLicense()).instanceId, 'inst-1');
});
test('a wrong key, a proxy outage or no network never overwrite a working license', async () => {
  next = { status: 200, body: { valid: false, status: 'inactive' } };
  assert.deepEqual([(await activate('TYPO')).ok, (await activate('TYPO')).error], [false, 'invalid']);
  next = { status: 503, body: { error: 'license service not configured' } }; assert.equal((await activate('X')).error, 'unavailable');
  next = 'throw'; assert.equal((await activate('X')).error, 'network');
  const l = await getLicense(); assert.equal(l.status, 'active'); assert.equal(l.key, 'GOOD');
});
test('revalidate: offline keeps grace, server "invalid" locks premium', async () => {
  next = 'throw'; assert.equal((await revalidate()).status, 'grace'); assert.equal(isPremium(await getLicense()), true);
  next = { status: 200, body: { valid: false, status: 'expired' } }; assert.equal((await revalidate()).status, 'invalid');
  next = { status: 200, body: { valid: true, status: 'active' } }; assert.equal((await revalidate()).status, 'active');
});
test('revalidate: offline past the grace window → expired (data untouched)', async () => {
  await setLicense({ status: 'active', key: 'K', instanceId: 'I', validatedAt: Date.now() - 8 * DAY });
  next = { status: 502, body: { error: 'upstream' } }; assert.equal((await revalidate()).status, 'expired');
});
test('deactivate frees the slot (best effort) and forgets the key even if the proxy is down', async () => {
  calls.length = 0; next = 'throw'; assert.deepEqual(await deactivate(), { status: 'none' });
  assert.deepEqual(calls, ['/deactivate']); assert.deepEqual(await getLicense(), { status: 'none' });
});
test('settings sanitizer rejects bad stored values', () => {
  assert.deepEqual(sanitizeSettings({ continueTurns: 7, continueBudget: 'x', indexOnOpen: 'yes', lang: 'fr' }), DEFAULT_SETTINGS);
  assert.deepEqual(sanitizeSettings({ continueTurns: 'all', continueBudget: 24000, indexOnOpen: false, lang: 'zh' }), { continueTurns: 'all', continueBudget: 24000, indexOnOpen: false, lang: 'zh' });
});
void run();
