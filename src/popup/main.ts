import { FREE_CONTINUE_PER_MONTH } from '../shared/config';
import { getContinueCount } from '../shared/db';
import { isPremium } from '../shared/license';
import type { LicenseState } from '../shared/types';
const app = document.getElementById('app')!;
async function render() {
  const lic: LicenseState = await chrome.runtime.sendMessage({ type: 'license:get' });
  const prem = isPremium(lic); const used = await getContinueCount();
  app.innerHTML = `<div style="font-size:11px;opacity:.7">本地存储 · 无需注册</div><h3>ContinueChat</h3>
    <p>继续聊：${prem ? '无限' : `本月剩余 ${Math.max(0, FREE_CONTINUE_PER_MONTH - used)}/${FREE_CONTINUE_PER_MONTH}`}</p>
    <p>License: ${lic.status}${lic.message ? ' (' + lic.message + ')' : ''}</p>
    <input id="k" placeholder="输入激活码" style="width:100%"><button id="a">激活</button>`;
  document.getElementById('a')!.onclick = async () => {
    const key = (document.getElementById('k') as HTMLInputElement).value;
    if (key) { await chrome.runtime.sendMessage({ type: 'license:activate', key }); render(); }
  };
}
render();
