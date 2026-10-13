import { DEFAULT_CONTINUE_TURNS } from '../shared/config';
const app = document.getElementById('app')!;
const { continueTurns = DEFAULT_CONTINUE_TURNS } = await chrome.storage.local.get('continueTurns');
app.innerHTML = `<h3>ContinueChat 设置</h3><label>继续聊带最近 N 轮 <input id="n" type="number" min="1" max="50" value="${continueTurns}"></label>
  <p style="opacity:.7">Placeholder — design pending. Folders / export / search UI TODO.</p>`;
document.getElementById('n')!.addEventListener('change', (e) => chrome.storage.local.set({ continueTurns: Number((e.target as HTMLInputElement).value) }));
