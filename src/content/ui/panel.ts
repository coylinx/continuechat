import type { PlatformAdapter } from '../adapters/types';
import { buildContext, listAttachments } from '../../shared/continue';
import { CHECKOUT_LIFETIME_URL, CHECKOUT_MONTHLY_URL, CONTINUE_TURN_OPTIONS, DEFAULT_CONTINUE_TURNS, FREE_FOLDER_LIMIT, type ContinueTurns } from '../../shared/config';
import { toJSON, toMarkdown, toPrintableHTML } from '../../shared/export';
import { rpc } from '../../shared/rpc';
import { convKey, PLATFORM_LABEL, type Conversation, type StoredConversation } from '../../shared/types';
import { CSS } from './styles';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const isDark = () => document.documentElement.classList.contains('dark') || matchMedia('(prefers-color-scheme: dark)').matches;
const fmtK = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
function download(name: string, mime: string, data: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function printPDF(html: string) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; f.srcdoc = html;
  f.onload = () => { f.contentWindow?.print(); setTimeout(() => f.remove(), 60_000); }; document.body.appendChild(f);
}
const nextMonth1 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

export function renderPanel(a: PlatformAdapter, other: PlatformAdapter) {
  return (root: ShadowRoot, floating: boolean) => {
    root.innerHTML = `<style>${CSS}</style><div class="cc ${isDark() ? 'dark' : ''}"><div class="card" id="main"></div><div id="layer"></div></div>`;
    const main = root.getElementById('main')!, layer = root.getElementById('layer')!;
    let query = ''; const open = new Set<string>(); let collapsed = floating;

    const modal = (html: string) => { layer.innerHTML = `<div class="ov"><div class="dlg">${html}</div></div>`; const ov = layer.firstElementChild as HTMLElement;
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); }); return ov; };
    const close = () => { layer.innerHTML = ''; };
    const $ = <T extends HTMLElement = HTMLElement>(sel: string, r: ParentNode = root) => r.querySelector<T>(sel)!;

    async function loadCurrent(): Promise<Conversation | null> {
      const id = a.currentConversationId(); if (!id) return null;
      const c = await a.getConversation(id); await rpc('db:upsertConversation', { conversation: c }); return c;
    }

    // ---------- Paywall card (05a/b/c) ----------
    function paywall(kind: 'quota' | 'folder' | 'export') {
      const title = { quota: 'You used all 3 continues this month', folder: `You've reached ${FREE_FOLDER_LIMIT} folders`, export: 'Batch export is a Pro feature' }[kind];
      const sub = { quota: `Free continues reset on ${nextMonth1()}. ContinueChat Pro keeps this chat going in ${PLATFORM_LABEL[other.platform]} right now.`,
        folder: 'ContinueChat Pro gives you unlimited folders. Your existing folders stay as they are.', export: 'Export many chats at once to Markdown, JSON or PDF with ContinueChat Pro.' }[kind];
      let plan: 'm' | 'l' = 'l';
      const ov = modal(`<div class="row"><div class="logo">↪</div><span class="sp"></span><button class="ghost" data-x>✕</button></div>
        <h2 style="margin-top:10px">${title}</h2><p class="mut">${sub}</p>
        <ul class="chk"><li>Unlimited continues</li><li>Unlimited folders</li><li>Batch export to Markdown, JSON, PDF</li></ul>
        <div class="row"><div class="price" data-p="m"><div class="mut sm">Monthly</div><b style="font-size:18px">$4.99</b><span class="mut">/mo</span></div>
        <div class="price on" data-p="l"><div class="mut sm">Lifetime · pay once</div><b style="font-size:18px">$39</b></div></div>
        <button class="pri" style="width:100%;margin-top:12px" data-up>Upgrade to Pro</button>
        <div class="row" style="margin-top:8px"><button class="ghost mut" data-key>I have a license key</button><span class="sp"></span><button class="ghost mut" data-x>Not now</button></div>`);
      ov.querySelectorAll<HTMLElement>('[data-p]').forEach((el) => el.onclick = () => { plan = el.dataset.p as 'm' | 'l'; ov.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('on', x === el)); });
      ov.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => el.onclick = close);
      $('[data-up]', ov).onclick = () => window.open(plan === 'm' ? CHECKOUT_MONTHLY_URL : CHECKOUT_LIFETIME_URL, '_blank');
      $('[data-key]', ov).onclick = () => { void rpc('ui:openOptions'); close(); };
    }

    // ---------- Continue dialog (03 / 03b / 03c) ----------
    async function continueDialog() {
      let conv: Conversation | null;
      try { conv = await loadCurrent(); } catch (e) { alert('ContinueChat: ' + (e as Error).message); return; }
      if (!conv || !conv.turns.length) { alert('ContinueChat: open a conversation first.'); return; }
      const c = conv;
      const { continueTurns } = await chrome.storage.local.get('continueTurns');
      let turns: ContinueTurns = CONTINUE_TURN_OPTIONS.includes(continueTurns) ? continueTurns : DEFAULT_CONTINUE_TURNS;
      const atts = listAttachments(c); const excluded = new Set<string>();
      const target = PLATFORM_LABEL[other.platform], here = PLATFORM_LABEL[a.platform];
      const ov = modal('');
      const draw = async () => {
        const r = buildContext(c, { turns, excludeAttachments: excluded });
        const u = await rpc('usage:get');
        const quota = u.premium ? 'ContinueChat Pro is active' : `${Math.max(0, u.limit - u.used)} of ${u.limit} left this month`;
        const dlg = ov.querySelector('.dlg')!;
        dlg.innerHTML = `<div class="row"><h2 class="sp">Continue this chat elsewhere</h2><button class="ghost" data-x>✕</button></div>
          <div class="mut">${esc(c.title)} · ${c.turns.length} turns${atts.length ? ` · ${atts.length} files` : ''}</div>
          <div class="sec">Continue in</div>
          <div class="row" style="margin-top:6px"><div class="plat on"><b>${target}</b> ✓</div><div class="plat off"><b>${here}</b><div class="sm">You are here</div></div></div>
          <div class="row sec"><span class="sp">Bring the last</span><b style="color:var(--fg)">${turns === 'all' ? 'All' : turns + ' turns'}</b></div>
          <div class="seg" style="margin-top:6px">${CONTINUE_TURN_OPTIONS.map((o) => `<button data-t="${o}" class="${o === turns ? 'sel' : ''}">${o === 'all' ? 'All' : o}</button>`).join('')}</div>
          ${r.overflow
            ? `<div class="warn">⚠ This context is too long (${r.fullLength.toLocaleString()} / ${r.budget.toLocaleString()} characters). Bring fewer turns?<br>
               <button data-t="4">Bring 4 turns</button><button data-trim>Trim to fit</button>
               <div style="margin-top:6px">Trim to fit removes the earliest ~${r.trimmedChars.toLocaleString()} characters.</div></div>`
            : r.omittedTurns ? `<div class="info">ⓘ ${r.omittedTurns} earlier turns are left out to fit the input limit (about ${r.fullLength.toLocaleString()} of ${r.budget.toLocaleString()} characters${atts.length ? ', files included' : ''}).</div>` : ''}
          ${atts.length && a.platform === 'claude' ? `<div class="row sec"><span class="sp">📎 Attached files included</span></div>
            <div>${atts.map((f) => `<label class="chip"><input type="checkbox" data-att="${esc(f.id)}" ${excluded.has(f.id) ? '' : 'checked'}>${esc(f.name)} <span class="mut">${fmtK(f.chars)} chars</span></label>`).join('')}</div>
            <div class="sm mut" style="margin-top:4px">The text of these files is added to the context. The files themselves are not uploaded.</div>` : ''}
          <div class="sec">Will be filled into the input box</div><pre class="prev">${esc(r.text.slice(0, 600))}${r.text.length > 600 ? '…' : ''}</pre>
          <div class="row" style="margin-top:10px">${r.overflow ? `<span class="sp wtxt sm">Continues trimmed to fit</span>` : `<span class="sp mut sm">${quota}</span>`}
            <button data-x>Cancel</button><button class="pri" data-go>↪ Continue in ${target}</button></div>`;
        dlg.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => el.onclick = close);
        dlg.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => el.onclick = () => { const v = el.dataset.t!; turns = v === 'all' ? 'all' : (Number(v) as ContinueTurns); void draw(); });
        dlg.querySelector<HTMLElement>('[data-trim]')?.addEventListener('click', () => (dlg.querySelector('.warn')!.innerHTML = `Trimmed: the earliest ~${r.trimmedChars.toLocaleString()} characters will be left out.`));
        dlg.querySelectorAll<HTMLInputElement>('[data-att]').forEach((el) => el.onchange = () => { el.checked ? excluded.delete(el.dataset.att!) : excluded.add(el.dataset.att!); void draw(); });
        $('[data-go]', dlg).onclick = async () => {
          const use = await rpc('usage:consumeContinue'); // shared counter across both sites
          if (!use.ok) { paywall('quota'); return; }
          // Prefill handoff (text already trimmed to budget). The other tab fills the composer; it NEVER auto-sends.
          await rpc('continue:open', { url: other.newChatUrl, text: r.text }); close(); void draw0();
        };
      };
      await draw();
    }

    // ---------- Export wizard (04) ----------
    async function exportWizard() {
      const stored = await rpc('db:listStored');
      const cur = a.currentConversationId();
      // Only same-site chats can be fetched; other-site chats only if their turns were already saved locally.
      const pool = stored.filter((s) => s.platform === a.platform || s.turns?.length).sort((x, y) => y.updatedAt - x.updatedAt).slice(0, 200);
      const sel = new Set<string>(cur ? [convKey(a.platform, cur)] : []);
      let fmt: 'md' | 'json' | 'pdf' = 'md';
      const ov = modal(''); const dlg = ov.querySelector('.dlg')!;
      const step1 = () => {
        dlg.innerHTML = `<div class="row"><span class="mut sm sp">Step 1 of 3</span><button class="ghost" data-x>✕</button></div><h2>Select chats</h2>
          <div style="max-height:300px;overflow:auto;margin:8px 0">${pool.map((s) => `<label class="item row"><input type="checkbox" data-k="${esc(s.key)}" ${sel.has(s.key) ? 'checked' : ''}><span class="sp">${esc(s.title)}</span><span class="mut sm">${PLATFORM_LABEL[s.platform]}</span></label>`).join('') || '<div class="mut">No chats indexed yet.</div>'}</div>
          <div class="row"><span class="mut sm sp" data-n>${sel.size} selected</span><button class="pri" data-next>Next</button></div>`;
        dlg.querySelectorAll<HTMLInputElement>('[data-k]').forEach((el) => el.onchange = () => { el.checked ? sel.add(el.dataset.k!) : sel.delete(el.dataset.k!); $('[data-n]', dlg).textContent = `${sel.size} selected`; });
        $('[data-x]', dlg).onclick = close;
        $('[data-next]', dlg).onclick = async () => {
          if (!sel.size) return;
          if (sel.size > 1 && !(await rpc('paywall:canUse', { gate: 'bulkExport' }))) { paywall('export'); return; }
          step2();
        };
      };
      const step2 = () => {
        const opts = [['md', 'Markdown', 'Readable, works in Notion and Obsidian'], ['json', 'JSON', 'Full structure, for backups and scripts'], ['pdf', 'PDF', 'Ready to share or print']] as const;
        dlg.innerHTML = `<div class="row"><span class="mut sm sp">Step 2 of 3</span><button class="ghost" data-x>✕</button></div><h2>Choose a format</h2>
          ${opts.map(([k, t, d]) => `<div class="opt ${fmt === k ? 'on' : ''}" data-f="${k}"><b>${t}</b><div class="mut sm">${d}</div></div>`).join('')}
          <div class="row" style="margin-top:8px"><button class="ghost" data-back>Back</button><span class="sp"></span><button class="pri" data-go>Export ${sel.size} chat${sel.size > 1 ? 's' : ''}</button></div>`;
        dlg.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.onclick = () => { fmt = el.dataset.f as typeof fmt; step2(); });
        $('[data-x]', dlg).onclick = close; $('[data-back]', dlg).onclick = step1;
        $('[data-go]', dlg).onclick = async () => {
          $('[data-go]', dlg).textContent = 'Exporting…';
          const out: Conversation[] = []; const failed: string[] = [];
          for (const k of sel) {
            const s = stored.find((x) => x.key === k)!;
            try {
              if (s.platform === a.platform) { const c = await a.getConversation(s.id); await rpc('db:upsertConversation', { conversation: c }); out.push(c); }
              else out.push({ ...s, turns: s.turns ?? [] });
            } catch { failed.push(s.title); }
          }
          const stamp = new Date().toISOString().slice(0, 10);
          const base = out.length === 1 ? out[0].title.replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'chat' : `chats-${stamp}`;
          if (fmt === 'md') download(base + '.md', 'text/markdown', toMarkdown(out));
          else if (fmt === 'json') download(base + '.json', 'application/json', toJSON(out));
          else printPDF(toPrintableHTML(out));
          dlg.innerHTML = `<div class="row"><span class="mut sm sp">Step 3 of 3</span><button class="ghost" data-x>✕</button></div>
            <div style="text-align:center;padding:20px 0"><div style="font-size:28px">✓</div><h2>${out.length} chat${out.length > 1 ? 's' : ''} exported</h2>
            <div class="mut sm">${fmt === 'pdf' ? 'Use “Save as PDF” in the print dialog' : 'Saved to Downloads'}${failed.length ? ` · ${failed.length} failed` : ''}</div></div>
            ${a.currentConversationId() ? `<button class="pri" style="width:100%" data-cont>Continue one in ${PLATFORM_LABEL[other.platform]}</button>` : ''}`;
          $('[data-x]', dlg).onclick = close;
          dlg.querySelector<HTMLElement>('[data-cont]')?.addEventListener('click', () => { close(); void continueDialog(); });
        };
      };
      step1();
    }

    // ---------- Main sidebar card (01 / 02) ----------
    async function draw0() {
      const [u, folders, pins, stored] = await Promise.all([rpc('usage:get'), rpc('db:listFolders'), rpc('db:listPins'), rpc('db:listStored')]);
      const byKey = new Map(stored.map((s) => [s.key, s] as [string, StoredConversation]));
      const curId = a.currentConversationId(); const curKey = curId ? convKey(a.platform, curId) : null;
      const left = u.premium ? 'Pro' : `${'●'.repeat(Math.max(0, u.limit - u.used))}${'○'.repeat(Math.min(u.limit, u.used))} ${Math.max(0, u.limit - u.used)}/${u.limit} left`;
      const link = (k: string) => { const s = byKey.get(k); if (!s) return ''; return `<div class="item" data-go="${esc(k)}" title="${esc(s.title)}">${esc(s.title)}${s.platform !== a.platform ? ` <span class="mut sm">· ${PLATFORM_LABEL[s.platform]}</span>` : ''}</div>`; };
      const results = query ? await rpc('db:search', { query }) : [];
      main.innerHTML = `<div class="row"><div class="logo">↪</div><span class="brand sp">ContinueChat</span><span class="pill">${left}</span>${floating ? `<button class="ghost" data-col>${collapsed ? '▴' : '▾'}</button>` : ''}</div>
        ${collapsed ? '' : `<input class="search" placeholder="Search all chats" value="${esc(query)}">
        ${query ? `<div class="sec">Results</div>${results.map((r) => link(r.key)).join('') || '<div class="mut sm">No matches</div>'}` : `
        ${curKey ? `<div class="row" style="gap:4px;flex-wrap:wrap"><button class="pri" data-cont>↪ Continue</button><button data-pin>${pins.some((p) => p.key === curKey) ? 'Unpin' : '📌 Pin'}</button>
          <select data-addf style="border-radius:10px;padding:5px;background:var(--bg);color:var(--fg);border:1px solid var(--line)"><option value="">+ Folder</option>${folders.map((f) => `<option value="${f.id}">${f.conversationKeys.includes(curKey) ? '✓ ' : ''}${esc(f.name)}</option>`).join('')}</select></div>` : ''}
        ${pins.length ? `<div class="sec">Pinned</div>${pins.map((p) => link(p.key)).join('')}` : ''}
        <div class="row sec"><span class="sp">Folders · ${folders.length}${u.premium ? '' : '/' + FREE_FOLDER_LIMIT}</span><button class="ghost" data-newf title="New folder">＋</button></div>
        ${folders.map((f) => `<div class="item row" data-f="${f.id}"><span>${open.has(f.id) ? '▾' : '▸'} 📁</span><span class="sp">${esc(f.name)}</span><span class="mut sm">${f.conversationKeys.length}</span><button class="ghost mut sm" data-delf="${f.id}" title="Delete folder (chats are kept)">✕</button></div>
          ${open.has(f.id) ? `<div style="padding-left:22px">${f.conversationKeys.map(link).join('') || '<div class="mut sm">Empty</div>'}</div>` : ''}`).join('')}
        <div class="row" style="margin-top:8px"><button class="ghost mut sm" data-exp>⇩ Export…</button><span class="sp"></span><span class="mut sm" data-st>${esc(syncStatus)}</span><button class="ghost mut sm" data-sync>↻ Sync</button></div>`}
        <div class="sm mut" style="margin-top:6px">🔒 Stored locally · No sign-up</div>`}`;
      const s = main.querySelector<HTMLInputElement>('input.search');
      if (s) { s.oninput = () => { query = s.value; clearTimeout((s as any)._t); (s as any)._t = setTimeout(async () => { await draw0(); const n = main.querySelector<HTMLInputElement>('input.search')!; n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200); }; }
      main.querySelector<HTMLElement>('[data-col]')?.addEventListener('click', () => { collapsed = !collapsed; void draw0(); });
      main.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => el.onclick = () => { const st = byKey.get(el.dataset.go!)!; location.href = (st.platform === a.platform ? a : other).conversationUrl(st.id); });
      main.querySelector<HTMLElement>('[data-cont]')?.addEventListener('click', () => void continueDialog());
      main.querySelector<HTMLElement>('[data-pin]')?.addEventListener('click', async () => { if (!byKey.has(curKey!)) await loadCurrent().catch(() => null); await rpc('db:togglePin', { key: curKey! }); void draw0(); });
      main.querySelector<HTMLSelectElement>('[data-addf]')?.addEventListener('change', async (e) => {
        const f = folders.find((x) => x.id === (e.target as HTMLSelectElement).value); if (!f || !curKey) return;
        if (!byKey.has(curKey)) await loadCurrent().catch(() => null);
        await rpc('db:setInFolder', { folderId: f.id, key: curKey, inFolder: !f.conversationKeys.includes(curKey) }); open.add(f.id); void draw0();
      });
      main.querySelector<HTMLElement>('[data-newf]')?.addEventListener('click', async () => {
        if (!(await rpc('paywall:canUse', { gate: 'folder' }))) { paywall('folder'); return; }
        const name = prompt('Folder name'); if (!name?.trim()) return;
        const r = await rpc('db:createFolder', { name: name.trim() }); if (!r.ok) paywall('folder'); else { open.add(r.folder.id); void draw0(); }
      });
      main.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.onclick = (e) => { if ((e.target as HTMLElement).dataset.delf) return; const id = el.dataset.f!; open.has(id) ? open.delete(id) : open.add(id); void draw0(); });
      main.querySelectorAll<HTMLElement>('[data-delf]').forEach((el) => el.onclick = async () => { if (confirm('Delete this folder? Chats are kept.')) { await rpc('db:deleteFolder', { id: el.dataset.delf! }); void draw0(); } });
      main.querySelector<HTMLElement>('[data-exp]')?.addEventListener('click', () => void exportWizard());
      main.querySelector<HTMLElement>('[data-sync]')?.addEventListener('click', () => void sync().then(draw0));
    }
    let syncStatus = ''; let stT: number | undefined;
    const setStatus = (t: string, ms = 4000) => { syncStatus = t; const el = main.querySelector('[data-st]'); if (el) el.textContent = t; clearTimeout(stT); if (ms) stT = window.setTimeout(() => setStatus('', 0), ms); };
    async function sync() {
      setStatus('Syncing…', 0);
      try { const metas = await a.listConversations(0, 100); await rpc('db:upsertMetas', { metas }); setStatus(`Synced ${metas.length} chats`); }
      catch (e) { setStatus('Sync failed: ' + (e as Error).message, 8000); console.warn('[ContinueChat] sync failed', e); }
    }
    void draw0(); void sync().then(draw0);
    let last = location.pathname; setInterval(() => { if (location.pathname !== last) { last = location.pathname; void draw0(); } }, 1000);
  };
}

/** On the target tab: take queued text (per-tab) and fill the composer as soon as it appears. Never clicks send. */
export async function consumePendingPrefill(a: PlatformAdapter) {
  const text = await rpc('prefill:take').catch(() => null); if (!text) return;
  await new Promise<void>((done) => {
    let finished = false;
    const tryFill = () => {
      if (finished) return; const el = a.getInputBox(); if (!el) return;
      // Wait a beat so the editor finishes hydrating, then verify the text landed.
      setTimeout(() => { if (finished) return; a.prefill(text); if ((el.textContent ?? (el as HTMLTextAreaElement).value ?? '').length > 0) { finished = true; mo.disconnect(); clearInterval(iv); done(); } }, 300);
    };
    const mo = new MutationObserver(tryFill); mo.observe(document.documentElement, { childList: true, subtree: true });
    const iv = setInterval(tryFill, 1000); tryFill();
    setTimeout(() => { finished = true; mo.disconnect(); clearInterval(iv); done(); }, 60_000);
  });
}
