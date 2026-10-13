import type { PlatformAdapter } from '../adapters/types';
const HOST_ID = 'continuechat-root';
/** Mount in Shadow DOM at first matching anchor (before it); MutationObserver remounts; floating panel fallback. */
export function mountSidebar(a: PlatformAdapter, render: (root: ShadowRoot, floating: boolean) => void) {
  const mount = () => {
    const existing = document.getElementById(HOST_ID);
    const anchor = a.sidebarAnchors.map((s) => document.querySelector(s)).find(Boolean);
    if (existing?.isConnected && (existing.dataset.mode === 'embedded' || !anchor)) return;
    existing?.remove();
    const host = document.createElement('div'); host.id = HOST_ID;
    if (anchor) { host.dataset.mode = 'embedded'; anchor.parentElement!.insertBefore(host, anchor); }
    else { host.dataset.mode = 'floating'; Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '88px', zIndex: '2147483646', width: '300px' }); document.body.appendChild(host); }
    render(host.attachShadow({ mode: 'open' }), !anchor);
  };
  mount();
  let t: number | undefined;
  new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(mount, 400); }).observe(document.body, { childList: true, subtree: true });
}
