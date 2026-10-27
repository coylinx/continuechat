import type { PlatformAdapter } from '../adapters/types';
import { forEachPage, openUrl } from '../adapters/types';
import { FREE_FOLDER_LIMIT, SYNC_MAX_PAGES, SYNC_PAGE_DELAY_MS, SYNC_PAGE_SIZE } from '../../shared/config';
import { fmtDate, t } from '../../shared/i18n';
import { escHTML as esc } from '../../shared/markdown';
import { rpc } from '../../shared/rpc';
import { splitHighlights } from '../../shared/search';
import { getSettings } from '../../shared/settings';
import { convKey, isPlatform, PLATFORM_LABEL, type Conversation, type Folder, type MetaRow, type Pin, type SearchHit } from '../../shared/types';
import { continueDialog } from './continue-dialog';
import { errText, splitKey, type Ctx } from './ctx';
import { exportWizard } from './export-wizard';
import * as layer from './layer';
import { paywall } from './paywall';
import { icon } from './icons';
import { CSS, MARK } from './styles';
import { themed } from './theme';

type SyncState = 'idle' | 'syncing' | 'ok' | 'fail';
/** Survives remounts (language change, site re-render dropping the host); only DOM is rebuilt. */
const S = { query: '', open: new Set<string>(), sync: 'idle' as SyncState, syncN: 0, syncErr: '', indexedId: '', drawer: false, qinfo: false, onboard: false };
/** chrome.storage.local keys for UI state (cleared by "Delete all local data"). */
const UI = { onboarded: 'ui:onboarded', seen: 'ui:launcherSeen', bottom: 'ui:launcherBottom' } as const;
interface Mounted { refresh(): void; status(): void; alive(): boolean; }
const mounted = new Set<Mounted>();
const each = (f: (m: Mounted) => void) => { for (const m of mounted) { if (m.alive()) f(m); else mounted.delete(m); } };
export const refreshAll = () => each((m) => m.refresh());
const paintStatusAll = () => each((m) => m.status());
const nextMonth1 = () => { const d = new Date(); return fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };
const tabTitle = () => document.title.replace(/\s*[-|–]\s*(ChatGPT|Claude)\s*$/i, '').replace(/^(ChatGPT|Claude)$/i, '').trim();

/** Called once per page: background sync + index-on-open watcher. Returns the render function for mountUI. */
export function createUI(a: PlatformAdapter, other: PlatformAdapter) {
  const site = PLATFORM_LABEL[a.platform], target = PLATFORM_LABEL[other.platform];

  let fadeT: number | undefined;
  async function sync(full: boolean) {
    if (S.sync === 'syncing') return;
    S.sync = 'syncing'; S.syncN = 0; S.syncErr = ''; clearTimeout(fadeT); paintStatusAll();
    try {
      await forEachPage((o, l) => a.listConversations(o, l), { pageSize: SYNC_PAGE_SIZE, maxPages: full ? SYNC_MAX_PAGES : 1, delayMs: SYNC_PAGE_DELAY_MS,
        onPage: async (metas, total) => { await rpc('db:upsertMetas', { metas }); S.syncN = total; paintStatusAll(); } });
      if (full) await chrome.storage.local.set({ ['fullSync:' + a.platform]: Date.now() });
      S.sync = 'ok';
      fadeT = window.setTimeout(() => { S.sync = 'idle'; paintStatusAll(); }, 2400);
    } catch (e) { S.sync = 'fail'; S.syncErr = errText(e, a); console.warn('[ContinueChat] sync failed', e); }
    paintStatusAll(); refreshAll();
  }

  async function loadCurrent(): Promise<Conversation | null> {
    const id = a.currentConversationId(); if (!id) return null;
    const c = await a.getConversation(id); await rpc('db:upsertConversation', { conversation: c }); S.indexedId = id; return c;
  }
  /** Pins/folders need a title to show: make sure the open chat is in the local index (title from the tab as last resort). */
  async function ensureIndexed(id: string) {
    const key = convKey(a.platform, id);
    if ((await rpc('db:listMetas', { keys: [key] })).length) return key;
    try { await loadCurrent(); } catch {
      await rpc('db:upsertMetas', { metas: [{ id, platform: a.platform, title: tabTitle() || 'Untitled', updatedAt: Date.now() }] });
    }
    return key;
  }
  /** The visible frame around the site's message box (the "Continue in …" button sits on its top edge). */
  function composerFrame(): DOMRect | null {
    const box = a.getInputBox(); if (!box) return null;
    const br = box.getBoundingClientRect(); if (!br.width || !br.height) return null;
    let el: Element = box.closest('form') ?? box;
    if (el === box) for (let p = box.parentElement, i = 0; p && i < 6; p = p.parentElement, i++) {
      const r = p.getBoundingClientRect(); if (r.width >= br.width + 16 && r.height >= br.height + 24) { el = p; break; }
    }
    const r = el.getBoundingClientRect(); return r.width ? r : null;
  }

  // First sync on this site walks every page so search covers all chats; later page loads read only the newest page.
  void chrome.storage.local.get('fullSync:' + a.platform).then((r) => sync(!r['fullSync:' + a.platform])).catch(() => undefined);

  // Path watcher: refresh on SPA navigation and (setting) save the opened chat's text for full-text search.
  let lastPath = location.pathname, idxT: number | undefined;
  const iv = setInterval(() => {
    if (!chrome.runtime?.id) { clearInterval(iv); return; } // extension reloaded: this script is orphaned
    if (location.pathname === lastPath) return;
    lastPath = location.pathname; refreshAll(); clearTimeout(idxT);
    const id = a.currentConversationId(); if (!id || id === S.indexedId) return;
    idxT = window.setTimeout(async () => {
      if (a.currentConversationId() !== id || !(await getSettings()).indexOnOpen) return;
      await loadCurrent().catch((e) => console.debug('[ContinueChat] index skipped', e));
    }, 2500);
  }, 1000);
  // Same check for the chat that is open when the page loads.
  void getSettings().then((st) => { const id = a.currentConversationId(); if (st.indexOnOpen && id) setTimeout(() => { if (a.currentConversationId() === id && S.indexedId !== id) void loadCurrent().catch(() => undefined); }, 4000); });

  return (root: ShadowRoot) => {
    root.innerHTML = `<style>${CSS}</style><div class="cc">
      <button class="launcher" data-launch title="ContinueChat" aria-label="ContinueChat" aria-expanded="false">${MARK}</button>
      <button class="cbtn" data-cont hidden title="${esc(t('continueHint', { site: target }))}"><span>${esc(t('continueIn', { site: target }))}</span>${icon('arrow')}</button>
      <aside class="drawer" role="dialog" aria-label="ContinueChat">
        <div class="dhead"><div class="logo">${MARK}</div><span class="brand">ContinueChat</span><span class="pill" data-plan></span><span class="sp"></span>
          <button class="ghost icon" data-help title="${esc(t('help'))}" aria-label="${esc(t('help'))}">${icon('help')}</button>
          <button class="ghost icon" data-settings title="${esc(t('settings'))}" aria-label="${esc(t('settings'))}">${icon('settings')}</button>
          <button class="ghost icon" data-close title="${esc(t('close'))}" aria-label="${esc(t('close'))}">${icon('x')}</button></div>
        <div class="dbody"><div data-onb></div><div data-cur></div>
          <div class="sfield">${icon('search')}<input class="search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(S.query)}" spellcheck="false" autocomplete="off" aria-label="${esc(t('searchPlaceholder'))}"></div>
          <div class="body" data-body></div></div>
        <div class="dfoot"><div data-quota></div><div class="status" data-st></div></div>
      </aside></div>`;
    const cc = root.querySelector<HTMLElement>('.cc')!; themed(cc);
    const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    const launcher = $<HTMLButtonElement>('[data-launch]'), drawer = $('.drawer'), chip = $<HTMLButtonElement>('.cbtn');
    const ctx: Ctx = { a, other, loadCurrent, refresh: () => refreshAll() };
    let seq = 0; let premium = false; let total = 0; let hintDone: (() => void) | null = null;

    // ---- launcher: click opens the drawer, drag moves it up/down (remembered) ----
    const setBottom = (px: number) => { const v = Math.round(Math.min(Math.max(px, 16), innerHeight - 70)); cc.style.setProperty('--cc-bottom', v + 'px'); return v; };
    let drag: { y: number; b: number; moved: boolean } | null = null;
    launcher.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; launcher.setPointerCapture(e.pointerId); drag = { y: e.clientY, b: innerHeight - launcher.getBoundingClientRect().bottom, moved: false }; });
    launcher.addEventListener('pointermove', (e) => {
      if (!drag) return; const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) < 5) return;
      drag.moved = true; launcher.classList.add('drag'); setBottom(drag.b - dy);
    });
    launcher.addEventListener('pointerup', () => {
      if (!drag) return; const d = drag; drag = null; launcher.classList.remove('drag');
      if (d.moved) void chrome.storage.local.set({ [UI.bottom]: setBottom(innerHeight - launcher.getBoundingClientRect().bottom) });
      else setDrawer(!S.drawer);
    });
    launcher.addEventListener('pointercancel', () => { drag = null; launcher.classList.remove('drag'); });
    launcher.addEventListener('click', (e) => { if (e.detail === 0) setDrawer(!S.drawer); }); // keyboard (Enter/Space)

    function setDrawer(open: boolean) {
      S.drawer = open; drawer.classList.toggle('open', open); launcher.setAttribute('aria-expanded', String(open));
      if (open) { hintDone?.(); void refresh(); queueMicrotask(() => drawer.querySelector<HTMLElement>('[data-cont],input.search')?.focus({ preventScroll: true })); }
    }
    root.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape' && S.drawer) setDrawer(false); });

    // ---- first run: a dot on the launcher + a tip; the guide card at the top of the drawer until dismissed ----
    void chrome.storage.local.get([UI.bottom, UI.seen, UI.onboarded]).then((r) => {
      if (typeof r[UI.bottom] === 'number') setBottom(r[UI.bottom] as number);
      S.onboard = S.onboard || !r[UI.onboarded]; paintOnboard();
      if (r[UI.seen] || !root.host.isConnected) return;
      const dot = document.createElement('span'); dot.className = 'ldot'; launcher.appendChild(dot);
      const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'status');
      tip.innerHTML = `<span>${esc(t('launcherTip'))}</span><button class="ghost icon" aria-label="${esc(t('close'))}">${icon('x')}</button>`; cc.appendChild(tip);
      hintDone = () => { hintDone = null; dot.remove(); tip.remove(); void chrome.storage.local.set({ [UI.seen]: true }); };
      tip.querySelector('button')!.onclick = () => hintDone?.();
      setTimeout(() => tip.remove(), 15000);
    }).catch(() => undefined);
    function paintOnboard() {
      $('[data-onb]').innerHTML = S.onboard ? `<div class="onb"><h3>${esc(t('onboardTitle'))}</h3>
        <ol><li>${esc(t('onboard1'))}</li><li>${esc(t('onboard2'))}</li><li>${esc(t('onboard3'))}</li></ol>
        <p>${esc(t('onboardMore'))}</p><button class="sm" data-onbok>${esc(t('gotIt'))}</button></div>` : '';
    }

    // ---- "Continue in …" on the top edge of the message box, whenever a chat is open ----
    const placeChip = () => {
      const r = a.currentConversationId() ? composerFrame() : null;
      if (!r || r.top < 90) { chip.hidden = true; return; }
      chip.hidden = false;
      chip.style.right = `${Math.max(12, Math.round(innerWidth - r.right))}px`;
      chip.style.bottom = `${Math.round(innerHeight - r.top + 10)}px`;
    };
    const chipIv = setInterval(() => { if (!root.host.isConnected) { clearInterval(chipIv); removeEventListener('resize', placeChip); return; } placeChip(); }, 500);
    addEventListener('resize', placeChip);

    // ---- search: only the results re-render, never the input, so IME composition (pinyin etc.) is never interrupted ----
    const s = $<HTMLInputElement>('input.search');
    let timer: number | undefined; let composing = false;
    const changed = () => { clearTimeout(timer); timer = window.setTimeout(() => { if (S.query !== s.value) { S.query = s.value; void refresh(); } }, 160); };
    s.addEventListener('compositionstart', () => { composing = true; });
    s.addEventListener('compositionend', () => { composing = false; changed(); });
    s.addEventListener('input', () => { if (!composing) changed(); });
    s.addEventListener('keydown', (e) => { if (e.key === 'Escape' && s.value) { e.stopPropagation(); s.value = ''; changed(); } });

    function status() {
      const el = $('[data-st]');
      el.innerHTML = S.sync === 'syncing' ? `<span class="spin">${icon('loader')}</span><span class="sp">${esc(S.syncN ? t('syncingN', { n: S.syncN }) : t('syncing'))}</span>`
        : S.sync === 'fail' ? `<span class="sp fail">${esc(t('syncFailed'))}${S.syncErr ? ' · ' + esc(S.syncErr) : ''}</span><button class="ghost" data-retry>${esc(t('retry'))}</button>`
        : `<span class="sp">${esc(S.sync === 'ok' ? t('synced') : t('syncedN', { n: total }))}</span>
           <button class="ghost" data-sync title="${esc(t('syncTitle', { site }))}">${icon('refresh')}${esc(t('sync'))}</button><button class="ghost" data-exp>${icon('download')}${esc(t('export'))}</button>`;
    }

    const hl = (text: string, terms: string[]) => splitHighlights(text, terms).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
    const tag = (p: string) => (p !== a.platform && isPlatform(p) ? `<span class="tag">${PLATFORM_LABEL[p]}</span>` : '');
    const href = (key: string) => { const [p, id] = splitKey(key); return p === a.platform ? a.conversationUrl(id) : p === other.platform ? other.conversationUrl(id) : '#'; };
    const link = (key: string, m: MetaRow | undefined) => m
      ? `<a class="item" href="${esc(href(key))}" data-go="${esc(key)}" title="${esc(m.title)}"><span class="sp ell">${esc(m.title)}</span>${tag(m.platform)}</a>`
      : `<span class="item unavail sm">${esc(t('unavailable'))}</span>`;

    function curHTML(curKey: string | null, cur: MetaRow | undefined, folders: Folder[], pins: Pin[]) {
      if (!curKey) return `<div class="card nochat">${icon('chat')}<div><b>${esc(t('noChatTitle'))}</b>
        <div class="sm mut" style="margin-top:2px">${esc(t('openChatHint', { site: target }))}</div></div></div>`;
      const pinned = pins.some((p) => p.key === curKey);
      const inFolders = folders.filter((f) => f.conversationKeys.includes(curKey));
      const title = cur?.title ?? tabTitle();
      return `<div class="card"><div class="lbl">${esc(t('thisChat'))}</div>${title ? `<div class="ctitle ell" title="${esc(title)}">${esc(title)}</div>` : '<div style="height:8px"></div>'}
        <button class="pri cta" data-cont><span>${esc(t('continueIn', { site: target }))}</span>${icon('arrow')}</button>
        <div class="explain">${esc(t('continueExplain', { site: target }))}</div>
        <div class="acts"><button class="ghost ${pinned ? 'on' : ''}" data-pin aria-pressed="${pinned}">${icon('pin')}${esc(pinned ? t('unpin') : t('pin'))}</button>
          <button class="ghost" data-addf>${icon('folderPlus')}${esc(t('addToFolder'))}</button><button class="ghost" data-exp>${icon('download')}${esc(t('export'))}</button></div>
        ${inFolders.length ? `<div class="chips">${inFolders.map((f) => `<span class="chip">${icon('folder')}<span class="ell">${esc(f.name)}</span></span>`).join('')}</div>` : ''}</div>`;
    }

    function listsHTML(folders: Folder[], pins: Pin[], byKey: Map<string, MetaRow>) {
      return `${pins.length ? `<div class="sec">${esc(t('pinned'))}</div>${pins.map((p) => `<div class="irow">${link(p.key, byKey.get(p.key))}<button class="ghost icon x mut" data-unpin="${esc(p.key)}" title="${esc(t('unpin'))}" aria-label="${esc(t('unpin'))}">${icon('x')}</button></div>`).join('')}` : ''}
        <div class="row sec"><span class="sp">${esc(t('folders'))} · ${folders.length}${premium ? '' : '/' + FREE_FOLDER_LIMIT}</span><button class="ghost sm" data-newf>${icon('plus')}${esc(t('newFolder'))}</button></div>
        ${folders.length ? folders.map((f) => { const open = S.open.has(f.id); return `<div class="irow">
            <button class="item" data-ftoggle="${esc(f.id)}" aria-expanded="${open}"><span class="car">${icon(open ? 'down' : 'right')}</span><span class="sp ell">${esc(f.name)}</span><span class="mut sm">${f.conversationKeys.length}</span></button>
            <button class="ghost icon x mut" data-renf="${esc(f.id)}" title="${esc(t('renameFolder'))}" aria-label="${esc(t('renameFolder'))}">${icon('pencil')}</button><button class="ghost icon x mut" data-delf="${esc(f.id)}" title="${esc(t('deleteFolder'))}" aria-label="${esc(t('deleteFolder'))}">${icon('x')}</button></div>
          ${open ? `<div class="sub">${f.conversationKeys.map((k) => `<div class="irow">${link(k, byKey.get(k))}<button class="ghost icon x mut" data-unfile="${esc(f.id)}" data-key="${esc(k)}" title="${esc(t('removeFromFolder'))}" aria-label="${esc(t('removeFromFolder'))}">${icon('x')}</button></div>`).join('') || `<div class="mut empty">${esc(t('folderEmpty'))}</div>`}</div>` : ''}`; }).join('')
          : `<div class="mut empty">${esc(t('noFolders'))}</div>`}`;
    }

    async function resultsHTML(hits: SearchHit[]) {
      if (!hits.length) { const st = await rpc('db:stats'); return `<div class="sec">${esc(t('results'))}</div><div class="empty mut">${esc(t('noMatches'))}<br>${esc(t('searchHelp', { n: st.conversations, full: st.withText }))}</div>`; }
      return `<div class="sec">${esc(t('results'))} · ${hits.length}</div>` + hits.map((h) => `<a class="item res" href="${esc(href(h.key))}" data-go="${esc(h.key)}" title="${esc(h.title)}">
        <span class="row"><span class="sp ell">${hl(h.title, h.terms)}</span>${tag(h.platform)}</span>${h.snippet ? `<span class="snip">${hl(h.snippet, h.terms)}</span>` : ''}</a>`).join('');
    }

    function quotaHTML(u: { used: number; limit: number; premium: boolean }) {
      if (u.premium) return `<div class="quota"><span class="sp">${esc(t('proActive'))}</span></div>`;
      const left = Math.max(0, u.limit - u.used);
      return `<div class="quota"><span class="sp">${esc(t('quotaFree', { left, limit: u.limit }))}<br><button class="link mut" data-qinfo aria-expanded="${S.qinfo}">${esc(t('quotaWhat'))}</button></span>
          <button class="sm" data-up>${esc(t('upgrade'))}</button></div>
        ${S.qinfo ? `<div class="qinfo">${esc(t('quotaWhatBody', { limit: u.limit, date: nextMonth1() }))}</div>` : ''}`;
    }

    async function refresh() {
      if (!S.drawer) return; // nothing visible to update
      const my = ++seq;
      try {
        const curId = a.currentConversationId(); const curKey = curId ? convKey(a.platform, curId) : null;
        const [u, folders, pins, st] = await Promise.all([rpc('usage:get'), rpc('db:listFolders'), rpc('db:listPins'), rpc('db:stats')]);
        if (my !== seq) return; premium = u.premium; total = st.conversations;
        const plan = $('[data-plan]'); plan.className = 'pill' + (u.premium ? ' pro' : ''); plan.textContent = u.premium ? 'Pro' : t('planFree');
        $('[data-quota]').innerHTML = quotaHTML(u); status();
        const keys = [...new Set([...pins.map((p) => p.key), ...folders.filter((f) => S.open.has(f.id)).flatMap((f) => f.conversationKeys), ...(curKey ? [curKey] : [])])];
        const metas = keys.length ? await rpc('db:listMetas', { keys }) : [];
        if (my !== seq) return;
        const byKey = new Map(metas.map((m) => [m.key, m] as [string, MetaRow]));
        $('[data-cur]').innerHTML = curHTML(curKey, curKey ? byKey.get(curKey) : undefined, folders, pins);
        const body = $('[data-body]');
        if (S.query.trim()) { const html = await resultsHTML(await rpc('db:search', { query: S.query })); if (my === seq) body.innerHTML = html; }
        else body.innerHTML = listsHTML(folders, pins, byKey);
      } catch (e) { console.warn('[ContinueChat] refresh failed', e); }
    }

    async function newFolder(): Promise<Folder | null> {
      if (!(await rpc('paywall:canUse', { gate: 'folder' }))) { paywall('folder', other.platform); return null; }
      const name = await layer.promptDialog({ title: t('newFolder'), placeholder: t('folderNamePlaceholder'), ok: t('create') }); if (!name) return null;
      const r = await rpc('db:createFolder', { name }); if (!r.ok) { paywall('folder', other.platform); return null; }
      return r.folder;
    }

    /** Toggle the open chat in/out of folders; "New folder" creates one and files the chat in it. */
    async function folderDialog(id: string) {
      const key = await ensureIndexed(id);
      const dlg = layer.modal('');
      const draw = async () => {
        const folders = await rpc('db:listFolders'); if (!layer.isOpen(dlg)) return;
        dlg.innerHTML = `<div class="row"><h2 class="sp">${esc(t('addToFolderTitle'))}</h2><button class="ghost icon" data-x aria-label="${esc(t('close'))}">${icon('x')}</button></div>
          ${folders.length ? `<div class="list">${folders.map((f) => { const on = f.conversationKeys.includes(key); return `<button class="item" data-tf="${esc(f.id)}" aria-pressed="${on}">${icon('folder')}<span class="sp ell">${esc(f.name)}</span>${on ? icon('check') : ''}</button>`; }).join('')}</div>`
            : `<p class="mut">${esc(t('noFolders'))}</p>`}
          <div class="row" style="margin-top:10px"><button data-nf>${icon('plus')}${esc(t('newFolder'))}</button><span class="sp"></span><button class="pri" data-x>${esc(t('done'))}</button></div>`;
        dlg.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => el.onclick = () => layer.close());
        dlg.querySelectorAll<HTMLElement>('[data-tf]').forEach((el) => el.onclick = async () => {
          const f = folders.find((x) => x.id === el.dataset.tf)!;
          await rpc('db:setInFolder', { folderId: f.id, key, inFolder: !f.conversationKeys.includes(key) }); S.open.add(f.id); void draw(); refreshAll();
        });
        dlg.querySelector<HTMLElement>('[data-nf]')!.onclick = async () => {
          const f = await newFolder();
          if (f) { await rpc('db:setInFolder', { folderId: f.id, key, inFolder: true }); S.open.add(f.id); }
          refreshAll(); if (f) void folderDialog(id); // the name prompt replaced this dialog: reopen it
        };
      };
      await draw();
    }

    cc.addEventListener('click', async (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-go],[data-cont],[data-close],[data-help],[data-settings],[data-onbok],[data-qinfo],[data-up],[data-pin],[data-addf],[data-newf],[data-ftoggle],[data-renf],[data-delf],[data-unpin],[data-unfile],[data-exp],[data-sync],[data-retry]');
      if (!el) return; const d = el.dataset;
      if (d.go) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a new tab
        e.preventDefault(); openUrl(href(d.go)); return;
      }
      e.preventDefault();
      const curId = a.currentConversationId();
      try {
        if (d.cont !== undefined) await continueDialog(ctx);
        else if (d.close !== undefined) setDrawer(false);
        else if (d.help !== undefined) { S.onboard = true; paintOnboard(); $('.dbody').scrollTop = 0; }
        else if (d.onbok !== undefined) { S.onboard = false; paintOnboard(); void chrome.storage.local.set({ [UI.onboarded]: true }); }
        else if (d.settings !== undefined) await rpc('ui:openOptions', {});
        else if (d.qinfo !== undefined) { S.qinfo = !S.qinfo; void refresh(); }
        else if (d.up !== undefined) paywall('upgrade', other.platform);
        else if (d.pin !== undefined && curId) { const key = await ensureIndexed(curId); await rpc('db:togglePin', { key }); refreshAll(); }
        else if (d.addf !== undefined && curId) await folderDialog(curId);
        else if (d.newf !== undefined) { if (await newFolder()) refreshAll(); }
        else if (d.ftoggle) { if (S.open.has(d.ftoggle)) S.open.delete(d.ftoggle); else S.open.add(d.ftoggle); void refresh(); }
        else if (d.renf) {
          const f = (await rpc('db:listFolders')).find((x) => x.id === d.renf); if (!f) return;
          const name = await layer.promptDialog({ title: t('renameFolder'), value: f.name, placeholder: t('folderNamePlaceholder'), ok: t('save') });
          if (name && name !== f.name) { await rpc('db:renameFolder', { id: f.id, name }); refreshAll(); }
        }
        else if (d.delf) {
          const f = (await rpc('db:listFolders')).find((x) => x.id === d.delf); if (!f) return;
          if (await layer.confirmDialog({ title: t('deleteFolderTitle', { name: f.name }), body: t('deleteFolderBody'), ok: t('delete'), danger: true })) {
            await rpc('db:deleteFolder', { id: f.id }); S.open.delete(f.id); refreshAll();
          }
        }
        else if (d.unpin) { await rpc('db:togglePin', { key: d.unpin }); refreshAll(); }
        else if (d.unfile && d.key) { await rpc('db:setInFolder', { folderId: d.unfile, key: d.key, inFolder: false }); refreshAll(); }
        else if (d.exp !== undefined) await exportWizard(ctx);
        else if (d.sync !== undefined || d.retry !== undefined) await sync(true);
      } catch (err) { console.warn('[ContinueChat]', err); layer.toast(errText(err, a), 'err'); }
    });

    mounted.add({ refresh: () => void refresh(), status, alive: () => root.host.isConnected });
    status(); placeChip(); setDrawer(S.drawer);
  };
}
