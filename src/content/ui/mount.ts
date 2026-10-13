import type { PlatformAdapter } from '../adapters/types';
const HOST_ID = 'continuechat-root';
/** Mount sidebar in Shadow DOM at first matching anchor; MutationObserver remounts; floating panel fallback. */
export function mountSidebar(a: PlatformAdapter, render: (root: ShadowRoot) => void) {
  const mount = () => {
    if (document.getElementById(HOST_ID)?.isConnected) return;
    const host = document.createElement('div'); host.id = HOST_ID;
    const anchor = a.sidebarAnchors.map((s) => document.querySelector(s)).find(Boolean);
    if (anchor) anchor.prepend(host);
    else { Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '80px', zIndex: '2147483646' }); host.dataset.mode = 'floating'; document.body.appendChild(host); }
    render(host.attachShadow({ mode: 'open' }));
  };
  mount();
  let t: number | undefined;
  new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(mount, 300); }).observe(document.body, { childList: true, subtree: true });
}
