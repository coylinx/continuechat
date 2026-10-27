import { chatToMarkdown, safeFileName, toJSON, toPrintableHTML, uniqueNames } from '../../shared/export';
import { exportLabels, fmtDate, t } from '../../shared/i18n';
import { escHTML as esc } from '../../shared/markdown';
import { rpc } from '../../shared/rpc';
import { convKey, PLATFORM_LABEL, type Conversation, type MetaRow } from '../../shared/types';
import { makeZip } from '../../shared/zip';
import { continueDialog } from './continue-dialog';
import { download, type Ctx } from './ctx';
import { icon } from './icons';
import * as layer from './layer';
import { paywall } from './paywall';

type Fmt = 'md' | 'json' | 'pdf';
const LIST_LIMIT = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Export wizard (design 04): select → format → done. Markdown and JSON are free (one chat or many); PDF is Pro. */
export async function exportWizard(ctx: Ctx) {
  const { a, other } = ctx;
  const all = await rpc('db:listMetas', {});
  const cur = a.currentConversationId();
  // Only same-site chats can be fetched; other-site chats only if their turns were already saved locally.
  const pool = all.filter((m) => m.platform === a.platform || m.turnCount > 0);
  const byKey = new Map(all.map((m) => [m.key, m] as [string, MetaRow]));
  const sel = new Set<string>(cur && byKey.has(convKey(a.platform, cur)) ? [convKey(a.platform, cur)] : []);
  let fmt: Fmt = 'md'; let filter = '';
  const dlg = layer.modal('');
  const head = (step: number) => `<div class="row"><span class="mut sm sp">${esc(t('stepOf', { i: step }))}</span><button class="ghost icon" data-x aria-label="${esc(t('close'))}">${icon('x')}</button></div>`;
  const wireClose = () => dlg.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => el.onclick = () => layer.close());
  const pdfLocked = async () => !(await rpc('paywall:canUse', { gate: 'pdfExport' }));

  const step1 = () => {
    dlg.innerHTML = `${head(1)}<h2 style="margin-top:2px">${esc(t('selectChats'))}</h2>
      <input class="txt" data-filter placeholder="${esc(t('filterPlaceholder'))}" value="${esc(filter)}" spellcheck="false" autocomplete="off">
      <label class="row item" style="flex:none"><input type="checkbox" data-all><span class="sp">${esc(t('selectAll'))}</span><span class="mut sm" data-cnt></span></label>
      <div class="list" data-list></div>
      <div class="row"><span class="mut sm sp" data-n></span><button class="pri" data-next>${esc(t('next'))}</button></div>`;
    wireClose();
    const list = dlg.querySelector<HTMLElement>('[data-list]')!, allBox = dlg.querySelector<HTMLInputElement>('[data-all]')!;
    const next = dlg.querySelector<HTMLButtonElement>('[data-next]')!;
    let visible: MetaRow[] = [];
    const counts = () => {
      dlg.querySelector('[data-n]')!.textContent = t('nSelected', { n: sel.size }); next.disabled = !sel.size;
      const on = visible.filter((m) => sel.has(m.key)).length; allBox.checked = !!visible.length && on === visible.length; allBox.indeterminate = on > 0 && on < visible.length;
    };
    const paint = () => {
      const q = filter.trim().toLowerCase();
      visible = (q ? pool.filter((m) => m.title.toLowerCase().includes(q)) : pool).slice(0, LIST_LIMIT);
      dlg.querySelector('[data-cnt]')!.textContent = String(visible.length);
      list.innerHTML = visible.map((m) => `<label class="item row"><input type="checkbox" data-k="${esc(m.key)}" ${sel.has(m.key) ? 'checked' : ''}><span class="sp ell" title="${esc(m.title)}">${esc(m.title)}</span>${m.platform !== a.platform ? `<span class="tag">${PLATFORM_LABEL[m.platform]}</span>` : ''}<span class="mut sm">${esc(fmtDate(new Date(m.updatedAt)))}</span></label>`).join('')
        || `<div class="mut empty">${esc(pool.length ? t('noMatches') : t('noIndexed'))}</div>`;
      counts();
    };
    const f = dlg.querySelector<HTMLInputElement>('[data-filter]')!; let composing = false;
    f.addEventListener('compositionstart', () => composing = true);
    f.addEventListener('compositionend', () => { composing = false; filter = f.value; paint(); });
    f.addEventListener('input', () => { if (!composing) { filter = f.value; paint(); } });
    list.addEventListener('change', (e) => { const el = e.target as HTMLInputElement; if (!el.dataset.k) return; if (el.checked) sel.add(el.dataset.k); else sel.delete(el.dataset.k); counts(); });
    allBox.onchange = () => { for (const m of visible) { if (allBox.checked) sel.add(m.key); else sel.delete(m.key); } paint(); };
    next.onclick = () => { if (sel.size) void step2(); };
    paint();
  };

  const step2 = async () => {
    const locked = await pdfLocked(); const many = sel.size > 1;
    const opts: [Fmt, string, string][] = [['md', t('fmtMd'), many ? t('fmtMdManyDesc') : t('fmtMdDesc')], ['json', 'JSON', t('fmtJsonDesc')], ['pdf', 'PDF', t('fmtPdfDesc')]];
    const otherSite = [...sel].some((k) => byKey.get(k)?.platform !== a.platform);
    dlg.innerHTML = `${head(2)}<h2 style="margin:2px 0 8px">${esc(t('chooseFormat'))}</h2>
      ${opts.map(([k, name, d]) => `<button class="opt ${fmt === k ? 'on' : ''}" data-f="${k}" aria-pressed="${fmt === k}"><span class="row"><b>${esc(name)}</b><span class="pill ${k === 'pdf' && locked ? 'pro' : ''}">${esc(k === 'pdf' && locked ? t('pro') : t('free'))}</span></span><div class="mut sm" style="margin-top:2px">${esc(d)}</div></button>`).join('')}
      ${otherSite ? `<div class="sm mut">${esc(t('otherSiteNote', { site: PLATFORM_LABEL[other.platform] }))}</div>` : ''}
      <div class="row" style="margin-top:14px"><button class="ghost" data-back>${esc(t('back'))}</button><span class="sp"></span><button class="pri" data-go>${esc(t('exportN', { n: sel.size }))}</button></div>`;
    wireClose();
    dlg.querySelectorAll<HTMLElement>('[data-f]').forEach((el) => el.onclick = () => { fmt = el.dataset.f as Fmt; void step2(); });
    dlg.querySelector<HTMLElement>('[data-back]')!.onclick = step1;
    const go = dlg.querySelector<HTMLButtonElement>('[data-go]')!;
    go.onclick = async () => {
      // Pricing rule: Markdown and JSON are free; PDF is Pro.
      if (fmt === 'pdf' && (await pdfLocked())) { paywall('export', other.platform); return; }
      go.disabled = true;
      const keys = [...sel]; const out: Conversation[] = []; const failed: string[] = [];
      const saved = new Map((await rpc('db:getMany', { keys })).map((s) => [s.key, s]));
      for (let i = 0; i < keys.length; i++) {
        if (!layer.isOpen(dlg)) return; // cancelled
        go.textContent = t('fetchingN', { i: i + 1, n: keys.length });
        const m = byKey.get(keys[i])!; const s = saved.get(keys[i]);
        try {
          if (m.platform !== a.platform) throw new Error('other site');
          const c = await a.getConversation(m.id); await rpc('db:upsertConversation', { conversation: c }); out.push(c);
          if (i < keys.length - 1) await sleep(250); // be gentle with the site
        } catch {
          if (s?.turns?.length) out.push({ id: s.id, platform: s.platform, title: s.title, updatedAt: s.updatedAt, turns: s.turns }); else failed.push(m.title);
        }
      }
      if (!out.length) { layer.toast(t('exportFailed'), 'err'); go.disabled = false; go.textContent = t('exportN', { n: sel.size }); return; }
      const labels = exportLabels(); const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const base = out.length === 1 ? safeFileName(out[0].title) : `chats-${date}`;
      if (fmt === 'md' && out.length === 1) download(base + '.md', 'text/markdown;charset=utf-8', chatToMarkdown(out[0], labels));
      else if (fmt === 'md') { const names = uniqueNames(out.map((c) => safeFileName(c.title)), '.md'); download(base + '.zip', 'application/zip', makeZip(out.map((c, i) => ({ name: names[i], data: chatToMarkdown(c, labels) })))); }
      else if (fmt === 'json') download(base + '.json', 'application/json', toJSON(out));
      else await rpc('print:open', { html: toPrintableHTML(out, labels) });
      dlg.innerHTML = `${head(3)}<div class="done"><div class="big">${icon('check')}</div><h2>${esc(t('exportedN', { n: out.length }))}</h2>
        <div class="mut sm" style="margin-top:4px">${esc(fmt === 'pdf' ? t('pdfHint') : t('savedToDownloads'))}${failed.length ? ` · ${esc(t('nFailed', { n: failed.length }))}` : ''}</div></div>
        ${a.currentConversationId() ? `<button class="pri" style="width:100%" data-cont>${esc(t('continueOne', { site: PLATFORM_LABEL[other.platform] }))}${icon('arrow')}</button>` : `<button class="pri" style="width:100%" data-x>${esc(t('done'))}</button>`}`;
      wireClose();
      dlg.querySelector<HTMLElement>('[data-cont]')?.addEventListener('click', () => { layer.close(); void continueDialog(ctx); });
    };
  };
  step1();
}
