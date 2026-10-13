import { rpc } from '../shared/rpc';
const app = document.getElementById('app')!;
async function render() {
  const lic = await rpc('license:get');
  const { used, limit, premium: prem } = await rpc('usage:get');
  app.innerHTML = `<div style="font-size:11px;opacity:.7">本地存储 · 无需注册</div><h3>ContinueChat</h3>
    <p>继续聊：${prem ? '无限' : `本月剩余 ${Math.max(0, limit - used)}/${limit}`}</p>
    <p>License: ${lic.status}${lic.message ? ' (' + lic.message + ')' : ''}</p>
    <input id="k" placeholder="输入激活码" style="width:100%"><button id="a">激活</button>`;
  document.getElementById('a')!.onclick = async () => {
    const key = (document.getElementById('k') as HTMLInputElement).value;
    if (key) { await rpc('license:activate', { key }); render(); }
  };
}
render();
