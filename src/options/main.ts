import { CONTINUE_TURN_OPTIONS, DEFAULT_CONTINUE_TURNS } from '../shared/config';
import { rpc } from '../shared/rpc';
const app = document.getElementById('app')!;
async function render() {
  const { continueTurns = DEFAULT_CONTINUE_TURNS } = await chrome.storage.local.get('continueTurns');
  const lic = await rpc('license:get');
  app.innerHTML = `<h3>ContinueChat settings</h3>
    <label>Default turns to bring: <select id="n">${CONTINUE_TURN_OPTIONS.map((o) => `<option value="${o}" ${o === continueTurns ? 'selected' : ''}>${o === 'all' ? 'All' : o}</option>`).join('')}</select></label>
    <h4>License</h4>${lic.premium ? '<p><b>ContinueChat Pro is active</b></p><button id="d">Remove license from this browser</button>'
      : `<p>Status: ${lic.status}${lic.message ? ' (' + lic.message + ')' : ''}</p><input id="k" placeholder="License key" size="40"> <button id="a">Activate Pro</button> <span id="s"></span>`}
    <p style="opacity:.7">🔒 本地存储 · 无需注册 — your chats never leave this browser.</p>`;
  document.getElementById('n')!.onchange = (e) => { const v = (e.target as HTMLSelectElement).value; chrome.storage.local.set({ continueTurns: v === 'all' ? 'all' : Number(v) }); };
  document.getElementById('a')?.addEventListener('click', async () => { const key = (document.getElementById('k') as HTMLInputElement).value.trim(); if (!key) return; document.getElementById('s')!.textContent = 'Verifying…'; const r = await rpc('license:activate', { key }); if (r.status !== 'active') document.getElementById('s')!.textContent = 'Invalid key: ' + (r.message ?? r.status); else render(); });
  document.getElementById('d')?.addEventListener('click', async () => { await rpc('license:deactivateLocal'); render(); });
}
render();
