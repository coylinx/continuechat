import { buildContext, listAttachments, type ContinueResult } from '../../shared/continue';
import { CONTINUE_TURN_OPTIONS, type ContinueTurns } from '../../shared/config';
import { contextLabels, fmtNum, t } from '../../shared/i18n';
import { escHTML as esc } from '../../shared/markdown';
import { rpc } from '../../shared/rpc';
import { getSettings } from '../../shared/settings';
import { PLATFORM_LABEL, type Conversation } from '../../shared/types';
import { errText, type Ctx } from './ctx';
import * as layer from './layer';
import { paywall } from './paywall';

const fmtK = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
const PREVIEW = 600;

/** Continue dialog (designs 03 / 03b / 03c). Fills the other site's composer in a new tab; never sends. */
export async function continueDialog(ctx: Ctx) {
  const { a, other } = ctx;
  const dlg = layer.modal(`<div class="loading"><span class="spin">↻</span> ${esc(t('readingChat'))}</div>`);
  let conv: Conversation | null;
  try { conv = await ctx.loadCurrent(); } catch (e) { if (layer.isOpen(dlg)) layer.close(); layer.toast(errText(e, a), 'err'); return; }
  if (!layer.isOpen(dlg)) return; // closed while loading
  if (!conv?.turns.length) { layer.close(); layer.toast(t('openChatFirst')); return; }
  const c = conv;
  const st = await getSettings(); let turns: ContinueTurns = st.continueTurns; const budget = st.continueBudget;
  const atts = listAttachments(c); const excluded = new Set<string>(); let showAll = false; let trimAck = false; let busy = false;
  const target = PLATFORM_LABEL[other.platform], here = PLATFORM_LABEL[a.platform]; const labels = contextLabels();
  let r: ContinueResult;

  const draw = async () => {
    r = buildContext(c, { turns, charBudget: budget, excludeAttachments: excluded, labels });
    const u = await rpc('usage:get'); if (!layer.isOpen(dlg)) return;
    const quota = u.premium ? t('proActive') : t('quotaInfo', { left: Math.max(0, u.limit - u.used), limit: u.limit });
    const preview = showAll || r.text.length <= PREVIEW ? r.text : r.text.slice(0, PREVIEW) + '…';
    dlg.innerHTML = `<div class="row"><h2 class="sp">${esc(t('continueTitle'))}</h2><button class="ghost icon" data-x aria-label="${esc(t('close'))}">✕</button></div>
      <div class="mut ell" title="${esc(c.title)}">${esc(c.title)} · ${esc(t('nTurns', { n: c.turns.length }))}${atts.length ? ` · ${esc(t('nFiles', { n: atts.length }))}` : ''}</div>
      <div class="sec">${esc(t('continueInLabel'))}</div>
      <div class="row" style="margin-top:6px"><div class="plat on"><b>${target}</b> ✓</div><div class="plat off"><b>${here}</b><div class="sm">${esc(t('youAreHere'))}</div></div></div>
      <div class="row sec"><span class="sp">${esc(t('bringLast'))}</span><b style="color:var(--fg)">${turns === 'all' ? esc(t('allTurns')) : esc(t('nTurns', { n: turns }))}</b></div>
      <div class="seg" role="group" style="margin-top:6px">${CONTINUE_TURN_OPTIONS.map((o) => `<button data-t="${o}" class="${o === turns ? 'sel' : ''}" aria-pressed="${o === turns}">${o === 'all' ? esc(t('all')) : o}</button>`).join('')}</div>
      ${r.overflow
        ? `<div class="warn">${trimAck ? esc(t('trimmedNote', { n: fmtNum(r.trimmedChars) })) : `⚠ ${esc(t('tooLong', { full: fmtNum(r.fullLength), budget: fmtNum(r.budget) }))}<br>
           ${turns === 'all' || turns > 4 ? `<button data-t="4">${esc(t('bring4'))}</button>` : ''}<button data-trim>${esc(t('trimToFit'))}</button>
           <div style="margin-top:6px">${esc(t('trimNote', { n: fmtNum(r.trimmedChars) }))}</div>`}</div>`
        : r.omittedTurns ? `<div class="info">ⓘ ${esc(t('omittedInfo', { n: r.omittedTurns, used: fmtNum(r.fullLength), budget: fmtNum(r.budget) }))}</div>` : ''}
      ${atts.length ? `<div class="row sec"><span class="sp">📎 ${esc(t('attachedFiles'))}</span></div>
        <div class="chips">${atts.map((f) => `<label class="chip"><input type="checkbox" data-att="${esc(f.id)}" ${excluded.has(f.id) ? '' : 'checked'}><span class="ell">${esc(f.name)}</span> <span class="mut">${esc(t('nChars', { n: fmtK(f.chars) }))}</span></label>`).join('')}</div>
        <div class="sm mut" style="margin-top:4px">${esc(t('attachedNote'))}</div>` : ''}
      <div class="row sec"><span class="sp">${esc(t('willFill'))}</span>${r.text.length > PREVIEW ? `<button class="ghost sm" data-full>${esc(showAll ? t('showLess') : t('showAll'))}</button>` : ''}</div>
      <pre class="prev ${showAll ? 'full' : ''}">${esc(preview)}</pre>
      <div class="sm mut">${esc(t('notSent'))}</div>
      <div class="row wrap" style="margin-top:10px">${r.overflow ? `<span class="sp wtxt sm">${esc(t('trimmedToFit'))}</span>` : `<span class="sp mut sm">${esc(quota)}</span>`}
        <button data-x>${esc(t('cancel'))}</button><button class="pri" data-go>↪ ${esc(t('continueIn', { site: target }))}</button></div>`;
  };

  // One delegated handler: the dialog body is re-rendered on every change.
  dlg.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-x],[data-t],[data-trim],[data-full],[data-go]'); if (!el || busy) return;
    if (el.dataset.x !== undefined) { layer.close(); return; }
    if (el.dataset.t) { const v = el.dataset.t; turns = v === 'all' ? 'all' : (Number(v) as ContinueTurns); trimAck = false; void draw(); return; }
    if (el.dataset.trim !== undefined) { trimAck = true; void draw(); return; }
    if (el.dataset.full !== undefined) { showAll = !showAll; void draw(); return; }
    if (el.dataset.go !== undefined) {
      busy = true; const go = el as HTMLButtonElement; go.disabled = true; go.innerHTML = `<span class="spin">↻</span> ${esc(t('opening'))}`;
      try {
        // Prefill handoff (text already trimmed to budget). The other tab fills the composer; it NEVER auto-sends.
        const res = await rpc('continue:open', { url: other.newChatUrl, text: r.text, from: a.platform });
        if (!res.ok) { paywall('quota', other.platform); return; }
        layer.close(); ctx.refresh();
      } catch (err) {
        console.warn('[ContinueChat] continue failed', err); layer.toast(t('errGeneric'), 'err');
        go.disabled = false; go.textContent = `↪ ${t('continueIn', { site: target })}`;
      } finally { busy = false; }
    }
  });
  dlg.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement; if (!el.dataset.att) return;
    if (el.checked) excluded.delete(el.dataset.att); else excluded.add(el.dataset.att); void draw();
  });
  await draw();
}
