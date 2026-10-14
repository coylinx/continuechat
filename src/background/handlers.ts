import { FREE_CONTINUE_PER_MONTH, PREFILL_TTL_MS } from '../shared/config';
import * as db from '../shared/db';
import { activate, deactivate, getLicense, isPremium, revalidate } from '../shared/license';
import { canUse } from '../shared/paywall';
import { REV_KEY, type Handlers } from '../shared/rpc';
import type { LicenseState, Platform } from '../shared/types';

/** Tells open panels/popups (other tabs) that folders/pins/usage changed. Not bumped for index-only writes. */
const bump = () => chrome.storage.local.set({ [REV_KEY]: Date.now() });
const withPremium = (l: LicenseState) => ({ ...l, premium: isPremium(l) });
const TARGET = /^https:\/\/(chatgpt\.com|claude\.ai)\//;
const nextTo = (s: chrome.runtime.MessageSender) => (s.tab ? { index: s.tab.index + 1, openerTabId: s.tab.id } : {});
/** The new tab's content script may ask for its prefill before tabs.create() has even resolved: wait for it. */
let opening: Promise<unknown> | null = null;
type Pending = { text: string; from: Platform; at: number };
const PRINT_TTL_MS = 10 * 60_000;
const prints = new Map<string, { html: string; at: number }>();

export const handlers: Handlers = {
  'license:activate': (r) => activate(r.key.trim()),
  'license:get': async () => withPremium(await getLicense()),
  'license:revalidate': async () => withPremium(await revalidate()),
  'license:deactivate': () => deactivate(),
  'db:upsertConversation': (r) => db.upsertConversation(r.conversation),
  'db:upsertMetas': (r) => db.upsertMetas(r.metas),
  'db:listMetas': (r) => db.listMetas(r.keys),
  'db:getMany': (r) => db.getMany(r.keys),
  'db:listFolders': () => db.listFolders(),
  'db:createFolder': async (r) => {
    if (!(await canUse('folder'))) return { ok: false, paywall: 'folder' };
    const folder = { id: crypto.randomUUID(), name: r.name.trim().slice(0, 100) || 'Folder', createdAt: Date.now(), conversationKeys: [] };
    await db.putFolder(folder); void bump(); return { ok: true, folder };
  },
  'db:renameFolder': async (r) => { await db.renameFolder(r.id, r.name.trim().slice(0, 100) || 'Folder'); void bump(); },
  'db:deleteFolder': async (r) => { await db.deleteFolder(r.id); void bump(); },
  'db:setInFolder': async (r) => { await db.setInFolder(r.folderId, r.key, r.inFolder); void bump(); },
  'db:listPins': () => db.listPins(),
  'db:togglePin': async (r) => { await db.togglePin(r.key); void bump(); },
  'db:search': (r) => db.search(r.query),
  'db:stats': () => db.stats(),
  'db:exportBackup': () => db.exportBackup(),
  'db:importBackup': async (r) => { const n = await db.importBackup(r.data); void bump(); return n; },
  'db:wipeAll': async () => { await db.wipeAll(); await chrome.storage.local.clear(); await chrome.storage.session.clear(); void bump(); },
  'usage:get': async () => ({ used: await db.getContinueCount(), limit: FREE_CONTINUE_PER_MONTH, premium: isPremium(await getLicense()) }),
  'paywall:canUse': (r) => canUse(r.gate),
  'ui:openOptions': async (r, sender) => { await chrome.tabs.create({ url: chrome.runtime.getURL('options/index.html' + (r.hash ? '#' + r.hash : '')), ...nextTo(sender) }); },
  'continue:open': async (r, sender) => {
    if (!TARGET.test(r.url)) throw new Error('bad url');
    const use = await db.consumeContinue(isPremium(await getLicense()) ? Infinity : FREE_CONTINUE_PER_MONTH);
    if (!use.ok) return { ok: false, paywall: 'quota' };
    const p = (async () => {
      const tab = await chrome.tabs.create({ url: r.url, active: true, ...nextTo(sender) });
      await chrome.storage.session.set({ ['prefill:' + tab.id]: { text: r.text, from: r.from, at: Date.now() } satisfies Pending });
    })();
    opening = p;
    try { await p; } catch (e) { await db.refundContinue(); throw e; } finally { if (opening === p) opening = null; }
    void bump(); return { ok: true };
  },
  'prefill:take': async (_r, sender) => {
    if (opening) await opening.catch(() => undefined);
    if (sender.tab?.id == null) return null;
    const k = 'prefill:' + sender.tab.id; const v = (await chrome.storage.session.get(k))[k] as Pending | undefined;
    if (!v) return null; await chrome.storage.session.remove(k);
    return Date.now() - v.at < PREFILL_TTL_MS ? { text: v.text, from: v.from } : null;
  },
  'print:open': async (r, sender) => {
    const now = Date.now(); for (const [k, v] of prints) if (now - v.at > PRINT_TTL_MS) prints.delete(k);
    const id = crypto.randomUUID(); prints.set(id, { html: r.html, at: now });
    // Survives a service-worker restart / page reload when it fits the session quota; memory otherwise.
    await chrome.storage.session.set({ ['print:' + id]: { html: r.html, at: now } }).catch(() => undefined);
    await chrome.tabs.create({ url: chrome.runtime.getURL('print/index.html#' + id), ...nextTo(sender) });
  },
  'print:take': async (r) => {
    const k = 'print:' + r.id;
    const v = prints.get(r.id) ?? ((await chrome.storage.session.get(k))[k] as { html: string; at: number } | undefined);
    return v && Date.now() - v.at < PRINT_TTL_MS ? v.html : null;
  },
};
