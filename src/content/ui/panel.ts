import type { PlatformAdapter } from '../adapters/types';
import { forEachPage, openUrl } from '../adapters/types';
import { FREE_FOLDER_LIMIT, SYNC_MAX_PAGES, SYNC_PAGE_DELAY_MS, SYNC_PAGE_SIZE } from '../../shared/config';
import { t } from '../../shared/i18n';
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
import { CSS } from './styles';
import { themed } from './theme';

type SyncState = 'idle' | 'syncing' | 'ok' | 'fail';
/** Survives remounts (the host is rebuilt when the site re-renders or collapses its sidebar); only DOM is rebuilt. */
const S = { query: '', open: new Set<string>(), collapsed: null as boolean | null, sync: 'idle' as SyncState, syncN: 0, syncErr: '', indexedId: '' };
interface Mounted { refresh(): void; status(): void; alive(): boolean; }
const mounted = new Set<Mounted>();
const each = (f: (m: Mounted) => void) => { for (const m of mounted) { if (m.alive()) f(m); else mounted.delete(m); } };
export const refreshAll = () => each((m) => m.refresh());
const paintStatusAll = () => each((m) => m.status());

/** Called once per page: background sync + index-on-open watcher. Returns the render function for mountSidebar. */
export function createPanel(a: PlatformAdapter, other: PlatformAdapter) {
  const site = PLATFORM_LABEL[a.platform];

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
      const title = document.title.replace(/\s*[-|–]\s*(ChatGPT|Claude)\s*$/i, '').replace(/^(ChatGPT|Claude)$/i, '').trim() || 'Untitled';
      await rpc('db:upsertMetas', { metas: [{ id, platform: a.platform, title, updatedAt: Date.now() }] });
    }
    return key;
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

  return (root: ShadowRoot, floating: boolean) => {
    root.innerHTML = `<style>${CSS}</style><div class="cc ${floating ? 'floating' : ''}"><div class="card" id="main"></div></div>`;
    const cc = root.querySelector<HTMLElement>('.cc')!; themed(cc);
    const main = root.getElementById('main')!;
    const ctx: Ctx = { a, other, loadCurrent, refresh: () => refreshAll() };
    const isCollapsed = () => floating && (S.collapsed ?? true);
    let seq = 0; let premium = false;

    function frame() {
      const col = isCollapsed();
      main.innerHTML = `<div class="row"><div class="logo" aria-hidden="true">↪</div><span class="brand sp">ContinueChat</span><span class="pill" data-quota></span>${floating
        ? `<button class="ghost icon" data-col aria-expanded="${!col}" title="${esc(col ? t('expand') : t('collapse'))}">${col ? '▴' : '▾'}</button>` : ''}</div>
        <div data-st></div>
        ${col ? '' : `<input class="search" type="search" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(S.query)}" spellcheck="false" autocomplete="off" aria-label="${esc(t('searchPlaceholder'))}">
        <div class="body" data-body></div>
        <div class="row foot"><button class="ghost mut sm" data-exp>⇩ ${esc(t('export'))}</button><span class="sp"></span><button class="ghost mut sm" data-sync title="${esc(t('syncTitle', { site }))}"><span>↻</span> ${esc(t('sync'))}</button></div>
        <div class="sm mut lock">🔒 ${esc(t('storedLocally'))}</div>`}`;
      wireSearch(); status(); void refresh();
    }

    function wireSearch() {
      const s = main.querySelector<HTMLInputElement>('input.search'); if (!s) return;
      // Only the results area re-renders, never the input — so IME composition (pinyin etc.) is never interrupted.
      let timer: number | undefined; let composing = false;
      const changed = () => { clearTimeout(timer); timer = window.setTimeout(() => { if (S.query !== s.value) { S.query = s.value; void refresh(); } }, 160); };
      s.addEventListener('compositionstart', () => { composing = true; });
      s.addEventListener('compositionend', () => { composing = false; changed(); });
      s.addEventListener('input', () => { if (!composing) changed(); });
      s.addEventListener('keydown', (e) => { if (e.key === 'Escape' && s.value) { s.value = ''; changed(); } });
    }

    function status() {
      const el = main.querySelector('[data-st]'); if (!el) return;
      el.innerHTML = S.sync === 'syncing' ? `<div class="stline"><span class="spin">↻</span> ${esc(S.syncN ? t('syncingN', { n: S.syncN }) : t('syncing'))}</div>`
        : S.sync === 'ok' ? `<div class="stline">${esc(t('synced'))}</div>`
        : S.sync === 'fail' ? `<div class="stline fail">${esc(t('syncFailed'))}${S.syncErr ? ' · ' + esc(S.syncErr) : ''} · <a href="#" data-retry>${esc(t('retry'))}</a></div>` : '';
      if (S.sync === 'ok') setTimeout(() => el.querySelector('.stline')?.classList.add('gone'), 2000);
      const b = main.querySelector<HTMLButtonElement>('[data-sync]');
      if (b) { b.disabled = S.sync === 'syncing'; b.firstElementChild?.classList.toggle('spin', S.sync === 'syncing'); }
    }

    const hl = (text: string, terms: string[]) => splitHighlights(text, terms).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
    const tag = (p: string) => (p !== a.platform && isPlatform(p) ? `<span class="tag">${PLATFORM_LABEL[p]}</span>` : '');
    const href = (key: string) => { const [p, id] = splitKey(key); return p === a.platform ? a.conversationUrl(id) : p === other.platform ? other.conversationUrl(id) : '#'; };
    const link = (key: string, m: MetaRow | undefined) => m
      ? `<a class="item" href="${esc(href(key))}" data-go="${esc(key)}" title="${esc(m.title)}"><span class="sp ell">${esc(m.title)}</span>${tag(m.platform)}</a>`
      : `<span class="item unavail sm">${esc(t('unavailable'))}</span>`;

    function homeHTML(curKey: string | null, cur: MetaRow | undefined, folders: Folder[], pins: Pin[], byKey: Map<string, MetaRow>) {
      const pinned = !!curKey && pins.some((p) => p.key === curKey);
      const inFolders = curKey ? folders.filter((f) => f.conversationKeys.includes(curKey)) : [];
      return `${curKey ? `<div class="cur">
          <div class="row"><button class="pri" data-cont title="${esc(t('continueHint', { site: PLATFORM_LABEL[other.platform] }))}">↪ ${esc(t('continueIn', { site: PLATFORM_LABEL[other.platform] }))}</button></div>
          <div class="row"><button data-pin class="${pinned ? 'on' : ''}" aria-pressed="${pinned}">📌 ${esc(pinned ? t('unpin') : t('pin'))}</button><button data-addf>📁 ${esc(t('addToFolder'))}</button></div>
          ${inFolders.length ? `<div class="chips">${inFolders.map((f) => `<span class="chip sm"><span class="ell">📁 ${esc(f.name)}</span></span>`).join('')}</div>` : ''}
        </div>` : `<div class="hint">${esc(t('openChatHint', { site: PLATFORM_LABEL[other.platform] }))}</div>`}
        ${pins.length ? `<div class="sec">${esc(t('pinned'))}</div>${pins.map((p) => `<div class="irow">${link(p.key, p.key === curKey ? cur ?? byKey.get(p.key) : byKey.get(p.key))}<button class="ghost icon x mut" data-unpin="${esc(p.key)}" title="${esc(t('unpin'))}" aria-label="${esc(t('unpin'))}">✕</button></div>`).join('')}` : ''}
        <div class="row sec"><span class="sp">${esc(t('folders'))} · ${folders.length}${premium ? '' : '/' + FREE_FOLDER_LIMIT}</span><button class="ghost icon" data-newf title="${esc(t('newFolder'))}" aria-label="${esc(t('newFolder'))}">＋</button></div>
        ${folders.length ? folders.map((f) => { const open = S.open.has(f.id); return `<div class="irow">
            <button class="item" data-ftoggle="${esc(f.id)}" aria-expanded="${open}"><span class="car">${open ? '▾' : '▸'}</span><span class="sp ell">📁 ${esc(f.name)}</span><span class="mut sm">${f.conversationKeys.length}</span></button>
            <button class="ghost icon x mut" data-renf="${esc(f.id)}" title="${esc(t('renameFolder'))}" aria-label="${esc(t('renameFolder'))}">✎</button><button class="ghost icon x mut" data-delf="${esc(f.id)}" title="${esc(t('deleteFolder'))}" aria-label="${esc(t('deleteFolder'))}">✕</button></div>
          ${open ? `<div class="sub">${f.conversationKeys.map((k) => `<div class="irow">${link(k, byKey.get(k))}<button class="ghost icon x mut" data-unfile="${esc(f.id)}" data-key="${esc(k)}" title="${esc(t('removeFromFolder'))}" aria-label="${esc(t('removeFromFolder'))}">✕</button></div>`).join('') || `<div class="mut sm empty">${esc(t('folderEmpty'))}</div>`}</div>` : ''}`; }).join('')
          : `<div class="mut sm empty">${esc(t('noFolders'))}</div>`}`;
    }

    async function resultsHTML(hits: SearchHit[]) {
      if (!hits.length) { const st = await rpc('db:stats'); return `<div class="sec">${esc(t('results'))}</div><div class="empty mut sm">${esc(t('noMatches'))}<br>${esc(t('searchHelp', { n: st.conversations, full: st.withText }))}</div>`; }
      return `<div class="sec">${esc(t('results'))} · ${hits.length}</div>` + hits.map((h) => `<a class="item res" href="${esc(href(h.key))}" data-go="${esc(h.key)}" title="${esc(h.title)}">
        <span class="row"><span class="sp ell">${hl(h.title, h.terms)}</span>${tag(h.platform)}</span>${h.snippet ? `<span class="snip">${hl(h.snippet, h.terms)}</span>` : ''}</a>`).join('');
    }

    async function refresh() {
      const my = ++seq;
      try {
        const curId = a.currentConversationId(); const curKey = curId ? convKey(a.platform, curId) : null;
        const [u, folders, pins] = await Promise.all([rpc('usage:get'), rpc('db:listFolders'), rpc('db:listPins')]);
        if (my !== seq) return; premium = u.premium;
        const q = main.querySelector<HTMLElement>('[data-quota]');
        if (q) { const left = Math.max(0, u.limit - u.used); q.className = 'pill' + (u.premium ? ' pro' : ''); q.title = u.premium ? t('proActive') : t('quotaInfo', { left, limit: u.limit });
          q.textContent = u.premium ? 'Pro' : `${'●'.repeat(left)}${'○'.repeat(Math.min(u.limit, u.used))} ${t('quotaLeft', { left, limit: u.limit })}`; }
        const body = main.querySelector<HTMLElement>('[data-body]'); if (!body) return;
        if (S.query.trim()) {
          const html = await resultsHTML(await rpc('db:search', { query: S.query }));
          if (my === seq) body.innerHTML = html; return;
        }
        const keys = [...new Set([...pins.map((p) => p.key), ...folders.filter((f) => S.open.has(f.id)).flatMap((f) => f.conversationKeys), ...(curKey ? [curKey] : [])])];
        const metas = keys.length ? await rpc('db:listMetas', { keys }) : [];
        if (my !== seq) return;
        const byKey = new Map(metas.map((m) => [m.key, m] as [string, MetaRow]));
        body.innerHTML = homeHTML(curKey, curKey ? byKey.get(curKey) : undefined, folders, pins, byKey);
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
        dlg.innerHTML = `<div class="row"><h2 class="sp">${esc(t('addToFolderTitle'))}</h2><button class="ghost icon" data-x aria-label="${esc(t('close'))}">✕</button></div>
          ${folders.length ? `<div class="list">${folders.map((f) => { const on = f.conversationKeys.includes(key); return `<button class="item" data-tf="${esc(f.id)}" aria-pressed="${on}"><span class="sp ell">📁 ${esc(f.name)}</span><span>${on ? '✓' : ''}</span></button>`; }).join('')}</div>`
            : `<p class="mut">${esc(t('noFolders'))}</p>`}
          <div class="row" style="margin-top:10px"><button data-nf>＋ ${esc(t('newFolder'))}</button><span class="sp"></span><button class="pri" data-x>${esc(t('done'))}</button></div>`;
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

    main.addEventListener('click', async (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-go],[data-col],[data-cont],[data-pin],[data-addf],[data-newf],[data-ftoggle],[data-renf],[data-delf],[data-unpin],[data-unfile],[data-exp],[data-sync],[data-retry]');
      if (!el) return; const d = el.dataset;
      if (d.go) {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; // let the browser open a new tab
        e.preventDefault(); openUrl(href(d.go)); return;
      }
      e.preventDefault();
      const curId = a.currentConversationId();
      try {
        if (d.col !== undefined) { S.collapsed = !isCollapsed(); frame(); }
        else if (d.cont !== undefined) await continueDialog(ctx);
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
    frame();
  };
}
