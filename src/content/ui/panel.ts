import type { PlatformAdapter } from '../adapters/types';
import { buildContext } from '../../shared/continue';
import { incContinueCount, upsertConversation } from '../../shared/db';
import { canUse } from '../../shared/paywall';
// Placeholder UI — real design comes from Wonder later.
export function renderPanel(a: PlatformAdapter, other: PlatformAdapter) {
  return (root: ShadowRoot) => {
    root.innerHTML = `<style>.cc{font:13px system-ui;padding:8px;border:1px solid #8884;border-radius:8px;background:Canvas;color:CanvasText}button{margin-top:4px}</style>
      <div class="cc"><b>ContinueChat</b><div><button id="cont">Continue on other platform</button></div><div id="msg"></div></div>`;
    const msg = root.getElementById('msg')!;
    root.getElementById('cont')!.addEventListener('click', async () => {
      if (!(await canUse('continue'))) { msg.textContent = 'Monthly free uses used up — upgrade ($4.99/mo or $39 lifetime).'; return; }
      const id = location.pathname.split('/').filter(Boolean).pop();
      if (!id) { msg.textContent = 'Open a conversation first.'; return; }
      try {
        const conv = await a.getConversation(id); await upsertConversation(conv);
        const { text } = buildContext(conv);
        // Prefill handoff: stash text, open other platform; its content script prefills on load.
        await chrome.storage.local.set({ pendingPrefill: { to: other.platform, text, at: Date.now() } });
        await incContinueCount();
        window.open(other.newChatUrl, '_blank');
      } catch (e) { msg.textContent = 'Failed: ' + (e as Error).message; }
    });
  };
}
export async function consumePendingPrefill(a: PlatformAdapter) {
  const { pendingPrefill: p } = await chrome.storage.local.get('pendingPrefill');
  if (!p || p.to !== a.platform || Date.now() - p.at > 5 * 60_000) return;
  for (let i = 0; i < 20; i++) { if (a.prefill(p.text)) { await chrome.storage.local.remove('pendingPrefill'); return; } await new Promise((r) => setTimeout(r, 500)); }
}
