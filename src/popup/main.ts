import { CHECKOUT_LIFETIME_URL, checkoutReady } from '../shared/config';
import { fmtDate, getLang, initLang, t } from '../shared/i18n';
import { escHTML as esc } from '../shared/markdown';
import { REV_KEY, rpc } from '../shared/rpc';
import { NEW_CHAT_URL, PLATFORM_LABEL, PLATFORMS } from '../shared/types';

const app = document.getElementById('app')!;
const nextMonth1 = () => { const d = new Date(); return fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };
const open = (url: string) => { void chrome.tabs.create({ url }); window.close(); };

async function render() {
  const [lic, u, st] = await Promise.all([rpc('license:get'), rpc('usage:get'), rpc('db:stats')]);
  const left = Math.max(0, u.limit - u.used);
  app.innerHTML = `<div class="row"><div class="logo" aria-hidden="true">↪</div><span class="brand sp">ContinueChat</span><span class="pill ${u.premium ? 'pro' : ''}">${u.premium ? 'Pro' : esc(t('planFree'))}</span></div>
    <div style="margin-top:14px" class="mut sm">${esc(t('continuesThisMonth'))}</div>
    ${u.premium ? `<div style="margin-top:2px;font-weight:600">${esc(t('unlimited'))}</div>${lic.status === 'grace' ? `<div class="xs mut">${esc(t('licGrace', { date: fmtDate(new Date(lic.validatedAt ?? Date.now())) }))}</div>` : ''}`
      : `<div class="row" style="margin-top:2px"><span class="dots" aria-hidden="true">${'●'.repeat(left)}${'○'.repeat(Math.min(u.limit, u.used))}</span><b>${esc(t('quotaInfo', { left, limit: u.limit }))}</b></div>
         <div class="xs mut">${esc(t('resetsOn', { date: nextMonth1() }))}</div>`}
    <div class="sm mut" style="margin-top:10px">${esc(t('statsLine', { chats: st.conversations, folders: st.folders }))}</div>
    <hr><div class="sm">${esc(t('howTo'))}</div>
    <div class="row" style="margin-top:8px">${PLATFORMS.map((p) => `<button class="sp" data-open="${p}">${esc(t('openSite', { site: PLATFORM_LABEL[p] }))}</button>`).join('')}</div>
    <hr>${u.premium ? '' : `<button class="pri" style="width:100%" data-up>${esc(t('upgrade'))}</button>`}
    <div class="row xs" style="margin-top:8px">${u.premium ? '' : `<button class="link mut" data-key>${esc(t('haveKeyLink'))}</button>`}<span class="sp"></span><button class="link mut" data-settings>${esc(t('settings'))}</button></div>
    <div class="xs mut" style="margin-top:10px">🔒 ${esc(t('storedLocally'))}</div>`;
  app.querySelectorAll<HTMLElement>('[data-open]').forEach((b) => b.onclick = () => open(NEW_CHAT_URL[b.dataset.open as keyof typeof NEW_CHAT_URL]));
  app.querySelector<HTMLElement>('[data-settings]')!.onclick = () => open(chrome.runtime.getURL('options/index.html'));
  app.querySelector<HTMLElement>('[data-key]')?.addEventListener('click', () => open(chrome.runtime.getURL('options/index.html#license')));
  app.querySelector<HTMLElement>('[data-up]')?.addEventListener('click', () => {
    if (checkoutReady(CHECKOUT_LIFETIME_URL)) open(CHECKOUT_LIFETIME_URL); else open(chrome.runtime.getURL('options/index.html#license'));
  });
}
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && (ch[REV_KEY] || ch.license)) void render(); });
void initLang().then(() => { document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en'; return render(); });
