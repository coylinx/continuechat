// Fake ChatGPT / Claude page that hosts the REAL content script (boot) with fixture-backed adapters.
import './mock-chrome';
import { boot } from '../src/content/boot';
import { PLATFORM_LABEL, type Platform } from '../src/shared/types';
import { fakeAdapter } from './fake-adapter';
import { FIXTURES } from './fixtures';

const platform: Platform = location.pathname.startsWith('/claude') ? 'claude' : 'chatgpt';
const other: Platform = platform === 'chatgpt' ? 'claude' : 'chatgpt';
const a = fakeAdapter(platform);
document.title = `Fake ${PLATFORM_LABEL[platform]} · ContinueChat dev`;
if (localStorage.getItem('ccdev-dark') === '1') document.documentElement.classList.add('dark');

const list = platform === 'chatgpt' ? '<div class="sidehead">Fake ChatGPT</div><nav aria-label="Chat history" id="list"></nav>'
  : '<aside aria-label="Sidebar"><div class="sidehead">Fake Claude</div><div data-testid="sidebar-recents" id="list"></div></aside>';
const box = platform === 'chatgpt' ? '<div class="ProseMirror" contenteditable="true" role="textbox" id="box" data-placeholder="Ask anything"></div>'
  : '<div data-testid="chat-input" class="ProseMirror" contenteditable="true" id="box" data-placeholder="Reply to Claude…"></div>';
document.body.innerHTML = `<div class="shell"><aside class="side" id="side">${list}</aside><main>
  <div class="top"><span class="site">Fake ${PLATFORM_LABEL[platform]}</span>
    <button id="tSide">☰ Sidebar</button><button id="tDark">◐ Theme</button><a href="/${other}/${other === 'claude' ? 'new' : ''}">→ Fake ${PLATFORM_LABEL[other]}</a>
    <a href="/dev/popup.html" target="_blank">Popup</a><a href="/dev/options.html" target="_blank">Options</a><button id="reset">Reset data</button></div>
  <div class="chat" id="chat"></div><div class="log" id="log"></div><div class="composer">${box}<button id="send" disabled>Send</button></div></main></div>`;

const $ = (id: string) => document.getElementById(id)!;
function renderList() {
  const cur = a.currentConversationId();
  $('list').innerHTML = FIXTURES[platform].slice(0, 40).map((c) => `<a href="${new URL(a.conversationUrl(c.id)).pathname}" class="${c.id === cur ? 'on' : ''}">${c.title}</a>`).join('');
}
function renderChat() {
  const c = FIXTURES[platform].find((x) => x.id === a.currentConversationId());
  $('chat').innerHTML = c ? c.turns.map((t) => `<div class="msg ${t.role}"></div>`).join('') : `<div class="empty">New chat · pick one on the left</div>`;
  if (c) [...$('chat').children].forEach((el, i) => { el.textContent = c.turns[i].text; });
  renderList();
}
// SPA navigation like the real sites (the panel clicks these same links).
$('list').addEventListener('click', (e) => {
  const l = (e.target as HTMLElement).closest('a'); if (!l || e.ctrlKey || e.metaKey) return;
  e.preventDefault(); history.pushState({}, '', l.getAttribute('href')!); renderChat();
});
window.addEventListener('popstate', renderChat);
$('tSide').onclick = () => { $('side').toggleAttribute('hidden'); };
$('tDark').onclick = () => { const d = document.documentElement.classList.toggle('dark'); localStorage.setItem('ccdev-dark', d ? '1' : '0'); };
$('reset').onclick = async () => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('ccdev:')) localStorage.removeItem(k);
  indexedDB.deleteDatabase('continuechat'); location.href = location.pathname;
};
// Composer: Send enables when there is text — and logs if it is ever clicked (prefill must never click it).
const sendBtn = $('send') as HTMLButtonElement;
new MutationObserver(() => { sendBtn.disabled = !$('box').textContent?.trim(); }).observe($('box'), { childList: true, subtree: true, characterData: true });
sendBtn.onclick = () => { $('log').textContent = `Sent ${$('box').textContent!.length} chars (by the user)`; };
// Mimic the sites' "type anywhere to focus the composer": our panel inputs must NOT lose keystrokes to this.
document.addEventListener('keydown', (e) => {
  const ae = document.activeElement as HTMLElement | null;
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && (!ae || ae === document.body)) { $('box').focus(); }
});
// ?nobox → no composer at all, to exercise the "couldn't fill" fallback (copy button).
if (new URLSearchParams(location.search).has('nobox')) document.querySelector('.composer')!.remove();
renderChat();
void boot(a, fakeAdapter(other));
