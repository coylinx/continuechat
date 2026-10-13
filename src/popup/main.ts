import { rpc } from '../shared/rpc';
const app = document.getElementById('app')!;
async function render() {
  const lic = await rpc('license:get'); const { used, limit, premium } = await rpc('usage:get');
  app.innerHTML = `<div style="font-size:11px;opacity:.7">🔒 本地存储 · 无需注册</div><h3 style="margin:6px 0">ContinueChat</h3>
    ${premium ? `<p><b>ContinueChat Pro is active</b>${lic.status === 'grace' ? ' (offline grace)' : ''}</p>`
      : `<p>Continues this month: ${Math.max(0, limit - used)} of ${limit} left</p>
    <p style="font-size:12px;opacity:.7">License: ${lic.status}${lic.message ? ' (' + lic.message + ')' : ''}</p>
    <input id="k" placeholder="License key" style="width:100%;margin-bottom:6px"><button id="a">Activate Pro</button> <span id="s"></span>`}
    <p><a href="#" id="o">Settings</a></p>`;
  document.getElementById('o')!.onclick = () => chrome.runtime.openOptionsPage();
  const b = document.getElementById('a');
  if (b) b.onclick = async () => {
    const key = (document.getElementById('k') as HTMLInputElement).value.trim(); if (!key) return;
    document.getElementById('s')!.textContent = 'Verifying…'; await rpc('license:activate', { key }); render();
  };
}
render();
