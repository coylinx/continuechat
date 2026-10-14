import { CHECKOUT_LIFETIME_URL, CHECKOUT_MONTHLY_URL, checkoutReady, CONTINUE_BUDGET_OPTIONS, CONTINUE_TURN_OPTIONS, PRICE_LIFETIME, PRICE_MONTHLY, SUPPORT_EMAIL } from '../shared/config';
import { fmtDateTime, fmtNum, getLang, initLang, setLang, t, type MsgKey } from '../shared/i18n';
import { escHTML as esc } from '../shared/markdown';
import { REV_KEY, rpc } from '../shared/rpc';
import { getSettings, setSettings, type LangSetting, type Settings } from '../shared/settings';
import type { LicenseState } from '../shared/types';

const app = document.getElementById('app')!;
const fileInput = document.getElementById('file') as HTMLInputElement;
const say = (sel: string, text: string, kind: 'ok' | 'err' | '' = '') => { const el = app.querySelector(sel); if (el) { el.textContent = text; el.className = 'msg ' + kind; } };
const seg = (name: string, opts: readonly (string | number)[], cur: string | number, label: (o: string | number) => string) =>
  `<div class="seg" role="group" data-seg="${name}">${opts.map((o) => `<button data-v="${o}" class="${o === cur ? 'sel' : ''}" aria-pressed="${o === cur}">${esc(label(o))}</button>`).join('')}</div>`;

function licenseLine(l: LicenseState & { premium: boolean }) {
  const date = l.validatedAt ? fmtDateTime(new Date(l.validatedAt)) : '';
  const m: Record<LicenseState['status'], string> = { none: t('licNone'), active: t('licActive'), grace: t('licGrace', { date }), expired: t('licExpired'), invalid: t('licInvalid', { msg: l.message ?? '—' }) };
  return m[l.status];
}

async function render() {
  document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
  const [st, lic, stats] = await Promise.all([getSettings(), rpc('license:get'), rpc('db:stats')]);
  const welcome = location.hash === '#welcome';
  const version = chrome.runtime.getManifest().version;
  app.innerHTML = `<div class="row"><div class="logo" aria-hidden="true">↪</div><h1 class="sp">${esc(t('settingsTitle'))}</h1><span class="pill ${lic.premium ? 'pro' : ''}">${lic.premium ? 'Pro' : esc(t('planFree'))}</span></div>
    ${welcome ? `<section class="banner" style="margin-top:14px"><b>${esc(t('welcomeTitle'))}</b><div style="margin-top:4px">${esc(t('welcomeBody'))}</div></section>` : ''}

    <section class="card"><h2>${esc(t('secContinue'))}</h2>
      <div class="field"><span class="lbl">${esc(t('defaultTurns'))}</span>${seg('continueTurns', CONTINUE_TURN_OPTIONS, st.continueTurns, (o) => (o === 'all' ? t('all') : String(o)))}</div>
      <div class="field"><label class="lbl" for="budget">${esc(t('maxContext'))}<div class="help">${esc(t('maxContextHelp'))}</div></label>
        <select id="budget">${CONTINUE_BUDGET_OPTIONS.map((b) => `<option value="${b}" ${b === st.continueBudget ? 'selected' : ''}>${esc(t('nCharsFull', { n: fmtNum(b) }))}</option>`).join('')}</select></div>
    </section>

    <section class="card"><h2>${esc(t('secSearch'))}</h2>
      <label class="check"><input type="checkbox" id="idx" ${st.indexOnOpen ? 'checked' : ''}><span>${esc(t('indexOnOpen'))}<div class="help">${esc(t('indexOnOpenHelp'))}</div></span></label>
    </section>

    <section class="card"><h2>${esc(t('secLanguage'))}</h2>
      ${seg('lang', ['auto', 'en', 'zh'], st.lang, (o) => (o === 'auto' ? t('langAuto') : o === 'en' ? 'English' : '简体中文'))}
    </section>

    <section class="card" id="license"><h2>${esc(t('secPro'))}</h2>
      <div>${esc(licenseLine(lic))}</div>
      ${lic.key ? `<div class="help">${esc(t('licenseKey'))}: ${esc(lic.key.slice(0, 4))}••••${esc(lic.key.slice(-4))}${lic.validatedAt ? ' · ' + esc(t('lastChecked', { date: fmtDateTime(new Date(lic.validatedAt)) })) : ''}</div>
        <div class="row wrap" style="margin-top:10px"><button id="check">${esc(t('checkNow'))}</button><button id="remove" class="danger">${esc(t('removeLicense'))}</button></div>` : ''}
      ${lic.premium ? '' : `<div class="row" style="margin-top:12px"><input class="txt sp" id="key" placeholder="${esc(t('licenseKey'))}" autocomplete="off" spellcheck="false"><button class="pri" id="activate">${esc(t('activate'))}</button></div>
        <div class="row wrap" style="margin-top:10px"><button id="buyM">${esc(t('buyMonthly'))} · ${PRICE_MONTHLY}${esc(t('perMonth'))}</button><button id="buyL">${esc(t('buyLifetime'))} · ${PRICE_LIFETIME}</button></div>`}
      <div class="msg" id="licMsg"></div>
    </section>

    <section class="card"><h2>${esc(t('secData'))}</h2>
      <div class="sm mut">${esc(t('dataStats', { chats: stats.conversations, full: stats.withText, folders: stats.folders, pins: stats.pins }))}</div>
      <div class="row wrap" style="margin-top:10px"><button id="backup">${esc(t('exportBackup'))}</button><button id="import">${esc(t('importBackup'))}</button><span class="sp"></span><button id="wipe" class="danger">${esc(t('wipe'))}</button></div>
      <div class="msg" id="dataMsg"></div>
      <div class="sm mut" style="margin-top:8px">🔒 ${esc(t('privacyLine'))}</div>
    </section>

    <section class="card"><h2>${esc(t('secAbout'))}</h2>
      <div class="sm">${esc(t('version', { v: version }))} · <a href="../privacy.html" target="_blank">${esc(t('privacyPolicy'))}</a> · ${esc(t('contact'))}: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></div>
      <div class="xs mut" style="margin-top:6px">${esc(t('notAffiliated'))}</div>
    </section>`;
  wire();
  if (location.hash === '#license') { app.querySelector('#license')?.scrollIntoView({ block: 'center' }); app.querySelector<HTMLInputElement>('#key')?.focus(); }
}

function wire() {
  app.querySelectorAll<HTMLElement>('[data-seg]').forEach((g) => g.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => b.onclick = async () => {
    const v = b.dataset.v!; const name = g.dataset.seg as 'continueTurns' | 'lang';
    if (name === 'continueTurns') await setSettings({ continueTurns: v === 'all' ? 'all' : (Number(v) as Settings['continueTurns']) });
    else { await setSettings({ lang: v as LangSetting }); setLang(v as LangSetting); }
    void render();
  }));
  app.querySelector<HTMLSelectElement>('#budget')!.onchange = (e) => void setSettings({ continueBudget: Number((e.target as HTMLSelectElement).value) });
  app.querySelector<HTMLInputElement>('#idx')!.onchange = (e) => void setSettings({ indexOnOpen: (e.target as HTMLInputElement).checked });

  const key = app.querySelector<HTMLInputElement>('#key');
  const activate = async () => {
    const k = key!.value.trim(); if (!k) { key!.focus(); return; }
    say('#licMsg', t('verifying'));
    const r = await rpc('license:activate', { key: k });
    if (r.ok) { await render(); say('#licMsg', t('activated'), 'ok'); return; }
    const msg: Record<NonNullable<typeof r.error>, MsgKey> = { invalid: 'errInvalidKey', unavailable: 'errUnavailable', network: 'errNet' };
    say('#licMsg', t(msg[r.error ?? 'invalid'], { msg: r.message ?? '—' }), 'err');
  };
  app.querySelector<HTMLElement>('#activate')?.addEventListener('click', activate);
  key?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void activate(); });
  app.querySelector<HTMLElement>('#check')?.addEventListener('click', async (e) => {
    (e.target as HTMLButtonElement).disabled = true; say('#licMsg', t('checking')); await rpc('license:revalidate'); await render();
  });
  app.querySelector<HTMLElement>('#remove')?.addEventListener('click', async () => { if (confirm(t('removeLicenseConfirm'))) { await rpc('license:deactivate'); await render(); } });
  const buy = (url: string) => () => { if (checkoutReady(url)) void chrome.tabs.create({ url }); else say('#licMsg', t('checkoutSoon')); };
  app.querySelector<HTMLElement>('#buyM')?.addEventListener('click', buy(CHECKOUT_MONTHLY_URL));
  app.querySelector<HTMLElement>('#buyL')?.addEventListener('click', buy(CHECKOUT_LIFETIME_URL));

  app.querySelector<HTMLElement>('#backup')!.onclick = async () => {
    const data = await rpc('db:exportBackup'); const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `continuechat-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  };
  app.querySelector<HTMLElement>('#import')!.onclick = () => { fileInput.value = ''; fileInput.click(); };
  fileInput.onchange = async () => {
    const f = fileInput.files?.[0]; if (!f) return;
    try {
      const n = await rpc('db:importBackup', { data: JSON.parse(await f.text()) });
      await render(); say('#dataMsg', t('importDone', { chats: n.conversations, folders: n.folders, pins: n.pins }), 'ok');
    } catch { say('#dataMsg', t('importBad'), 'err'); }
  };
  app.querySelector<HTMLElement>('#wipe')!.onclick = async () => {
    if (!confirm(t('wipeConfirm'))) return;
    await rpc('db:wipeAll'); setLang('auto'); await render(); say('#dataMsg', t('wiped'), 'ok');
  };
}

chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && (ch[REV_KEY] || ch.license) && !app.contains(document.activeElement)) void render(); });
window.addEventListener('hashchange', () => void render());
void initLang().then(render);
