import { isolate, removeLayer } from './layer';
export const HOST_ID = 'continuechat-root';
/** False once the extension was reloaded/updated: this (old) content script can no longer talk to it. */
export const extensionAlive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
let current: HTMLElement | null = null;
let ensure: (() => void) | null = null;
/** Forces a rebuild now (e.g. after the UI language changed). */
export function remount() { current?.remove(); ensure?.(); }

/** One fixed, zero-size host on <body> holding the launcher, the drawer and the "Continue in …" button in Shadow DOM.
 *  Nothing is inserted into the site's own layout, so a site redesign can't push it around or break it;
 *  if the site's re-render drops the host, it is re-attached within a second. */
export function mountUI(render: (root: ShadowRoot) => void) {
  ensure = () => {
    if (!extensionAlive()) { clearInterval(iv); current?.remove(); removeLayer(); return; } // only remove what THIS script created
    if (current?.isConnected || !document.body) return;
    current?.remove();
    const host = document.createElement('div'); host.id = HOST_ID; current = host;
    Object.assign(host.style, { position: 'fixed', top: '0', left: '0', width: '0', height: '0', zIndex: '2147483645' });
    const root = host.attachShadow({ mode: 'open' }); isolate(root);
    document.body.appendChild(host);
    render(root);
  };
  const iv = setInterval(() => ensure?.(), 1000);
  ensure();
}
