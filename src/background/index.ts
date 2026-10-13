import { FREE_CONTINUE_PER_MONTH, REVALIDATE_EVERY_DAYS } from '../shared/config';
import { consumeContinue, getContinueCount, listFolders, putFolder, search, togglePin, upsertConversation } from '../shared/db';
import { activate, getLicense, isPremium, revalidate, setLicense } from '../shared/license';
import { canUse } from '../shared/paywall';
import type { Handlers, RpcRequest } from '../shared/rpc';

const ALARM = 'license-revalidate';
chrome.runtime.onInstalled.addListener(() => chrome.alarms.create(ALARM, { periodInMinutes: REVALIDATE_EVERY_DAYS * 24 * 60 }));
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) void revalidate(); });

const handlers: Handlers = {
  'license:activate': (r) => activate(r.key.trim()),
  'license:get': () => getLicense(),
  'license:deactivateLocal': async () => { await setLicense({ status: 'none' }); return getLicense(); },
  'db:upsertConversation': (r) => upsertConversation(r.conversation),
  'db:listFolders': () => listFolders(),
  'db:createFolder': async (r) => {
    if (!(await canUse('folder'))) return { ok: false, paywall: 'folder' };
    const folder = { id: crypto.randomUUID(), name: r.name.slice(0, 100), createdAt: Date.now(), conversationKeys: [] };
    await putFolder(folder); return { ok: true, folder };
  },
  'db:togglePin': (r) => togglePin(r.key),
  'db:search': (r) => search(r.query),
  'usage:get': async () => ({ used: await getContinueCount(), limit: FREE_CONTINUE_PER_MONTH, premium: isPremium(await getLicense()) }),
  'usage:consumeContinue': async () => consumeContinue(isPremium(await getLicense()) ? Infinity : FREE_CONTINUE_PER_MONTH),
  'paywall:canUse': (r) => canUse(r.gate),
};

chrome.runtime.onMessage.addListener((msg: RpcRequest, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false; // only our own extension contexts
  const h = handlers[msg?.type] as ((m: RpcRequest) => Promise<unknown>) | undefined;
  if (!h) { reply({ ok: false, error: `unknown rpc ${String(msg?.type)}` }); return false; }
  h(msg).then((data) => reply({ ok: true, data }), (e: Error) => reply({ ok: false, error: e.message }));
  return true;
});
