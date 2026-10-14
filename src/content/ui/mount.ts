import type { PlatformAdapter } from '../adapters/types';
import { isolate, removeLayer } from './layer';
export const HOST_ID = 'continuechat-root';
/** A collapsed sidebar keeps its DOM node but has no box: treat that as "no anchor". */
export function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el as HTMLElement).isConnected) return false;
  const r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 40) return false;
  const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  return (el as HTMLElement).offsetParent !== null || cs.position === 'fixed';
}
/** False once the extension was reloaded/updated: this (old) content script can no longer talk to it. */
export const extensionAlive = () => { try { return !!chrome.runtime?.id; } catch { return false; } };
let current: HTMLElement | null = null;
/** Forces a rebuild on the next check (e.g. after the UI language changed). */
export function remount() { current?.remove(); }

/** Mount in Shadow DOM before first VISIBLE anchor; floating panel if none. Re-checks on DOM changes,
 *  resizes and every second, moving between embedded/floating as the sidebar collapses/expands. */
export function mountSidebar(a: PlatformAdapter, render: (root: ShadowRoot, floating: boolean) => void) {
  const findAnchor = () => a.sidebarAnchors.map((s) => [...document.querySelectorAll(s)].find(isVisible)).find(Boolean) ?? null;
  const mount = () => {
    if (!extensionAlive()) { stop(); current?.remove(); removeLayer(); return; } // only remove what THIS script created
    const anchor = findAnchor();
    const want = anchor ? 'embedded' : 'floating';
    if (current?.isConnected && current.dataset.mode === want && (want === 'floating' || current.nextElementSibling === anchor || anchor!.contains(current))) return;
    current?.remove();
    const host = document.createElement('div'); host.id = HOST_ID; host.dataset.mode = want; current = host;
    if (anchor?.parentElement) anchor.parentElement.insertBefore(host, anchor);
    else { Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '88px', zIndex: '2147483646', width: '300px', maxWidth: 'calc(100vw - 32px)' }); document.body.appendChild(host); }
    const root = host.attachShadow({ mode: 'open' }); isolate(root);
    render(root, !anchor?.parentElement);
  };
  let t: number | undefined; const soon = () => { clearTimeout(t); t = window.setTimeout(mount, 250); };
  const mo = new MutationObserver(soon);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state'] });
  const ro = new ResizeObserver(soon); ro.observe(document.documentElement);
  window.addEventListener('resize', soon);
  const iv = setInterval(mount, 1000); // catches CSS-transition collapses that emit no mutations
  function stop() { mo.disconnect(); ro.disconnect(); window.removeEventListener('resize', soon); clearInterval(iv); clearTimeout(t); }
  mount();
}
