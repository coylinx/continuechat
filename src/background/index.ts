import { REVALIDATE_EVERY_DAYS } from '../shared/config';
import { getLicense, needsRevalidation, revalidate } from '../shared/license';
import type { RpcRequest } from '../shared/rpc';
import { handlers } from './handlers';

const ALARM = 'license-revalidate';
// Alarms usually survive restarts but Chrome doesn't guarantee it: re-create when missing.
async function ensureAlarm() { if (!(await chrome.alarms.get(ALARM))) await chrome.alarms.create(ALARM, { periodInMinutes: REVALIDATE_EVERY_DAYS * 24 * 60 }); }
async function revalidateIfDue() { if (needsRevalidation(await getLicense())) await revalidate(); }
chrome.runtime.onInstalled.addListener((d) => {
  void ensureAlarm();
  if (d.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html#welcome') });
});
chrome.runtime.onStartup.addListener(() => { void ensureAlarm(); void revalidateIfDue(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) void revalidate(); });

chrome.runtime.onMessage.addListener((msg: RpcRequest, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  const h = handlers[msg?.type] as ((m: RpcRequest, s: chrome.runtime.MessageSender) => Promise<unknown>) | undefined;
  if (!h) { reply({ ok: false, error: `unknown rpc ${String(msg?.type)}` }); return false; }
  h(msg, sender).then((data) => reply({ ok: true, data }), (e: Error) => reply({ ok: false, error: e.message }));
  return true;
});

chrome.tabs.onRemoved.addListener((id) => void chrome.storage.session.remove('prefill:' + id));
