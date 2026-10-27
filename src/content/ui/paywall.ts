import { CHECKOUT_LIFETIME_URL, CHECKOUT_MONTHLY_URL, checkoutReady, FREE_CONTINUE_PER_MONTH, FREE_FOLDER_LIMIT, PRICE_LIFETIME, PRICE_MONTHLY } from '../../shared/config';
import { fmtDate, t } from '../../shared/i18n';
import { escHTML as esc } from '../../shared/markdown';
import { rpc } from '../../shared/rpc';
import { PLATFORM_LABEL, type Platform } from '../../shared/types';
import { icon } from './icons';
import * as layer from './layer';
import { MARK } from './styles';

export type PaywallKind = 'quota' | 'folder' | 'export' | 'upgrade';
const nextMonth1 = () => { const d = new Date(); return fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };

/** Paywall card (designs 05a/b/c); 'upgrade' is the plain "Upgrade to Pro" entry from the panel. `target` = the platform the user wanted to continue in. */
export function paywall(kind: PaywallKind, target: Platform) {
  const title = { quota: t('pwQuotaTitle', { limit: FREE_CONTINUE_PER_MONTH }), folder: t('pwFolderTitle', { limit: FREE_FOLDER_LIMIT }), export: t('pwExportTitle'), upgrade: t('upgradeTitle') }[kind];
  const sub = { quota: t('pwQuotaSub', { date: nextMonth1(), site: PLATFORM_LABEL[target] }), folder: t('pwFolderSub'), export: t('pwExportSub'), upgrade: t('upgradeSub') }[kind];
  let plan: 'm' | 'l' = 'l';
  const dlg = layer.modal(`<div class="row"><div class="logo">${MARK}</div><span class="sp"></span><button class="ghost icon" data-x aria-label="${esc(t('close'))}">${icon('x')}</button></div>
    <h2 style="margin-top:12px">${esc(title)}</h2><p class="mut">${esc(sub)}</p>
    <ul class="chk">${(['featContinues', 'featFolders', 'featExport'] as const).map((k) => `<li>${icon('check')}${esc(t(k))}</li>`).join('')}</ul>
    <div class="row"><button class="price" data-p="m"><div class="mut sm">${esc(t('monthly'))}</div><b style="font-size:17px">${PRICE_MONTHLY}</b><span class="mut sm"> ${esc(t('perMonth'))}</span></button>
    <button class="price on" data-p="l"><div class="mut sm">${esc(t('lifetime'))}</div><b style="font-size:17px">${PRICE_LIFETIME}</b></button></div>
    <button class="pri" style="width:100%;height:36px;margin-top:14px" data-up autofocus>${esc(t('upgrade'))}</button>
    <div class="row" style="margin-top:6px"><button class="ghost sm" data-key>${esc(t('haveKey'))}</button><span class="sp"></span><button class="ghost sm" data-x>${esc(t('notNow'))}</button></div>`);
  dlg.querySelectorAll<HTMLElement>('[data-p]').forEach((el) => el.onclick = () => { plan = el.dataset.p as 'm' | 'l'; dlg.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('on', x === el)); });
  dlg.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => el.onclick = () => layer.close());
  dlg.querySelector<HTMLElement>('[data-up]')!.onclick = () => {
    const url = plan === 'm' ? CHECKOUT_MONTHLY_URL : CHECKOUT_LIFETIME_URL;
    if (!checkoutReady(url)) { layer.toast(t('checkoutSoon')); return; }
    window.open(url, '_blank', 'noopener');
  };
  dlg.querySelector<HTMLElement>('[data-key]')!.onclick = () => { void rpc('ui:openOptions', { hash: 'license' }); layer.close(); };
}
