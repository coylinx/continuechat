import type { PlatformAdapter } from '../adapters/types';
const HOST_ID = 'continuechat-root';
/** A collapsed sidebar keeps its DOM node but has no box: treat that as "no anchor". */
export function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el as HTMLElement).isConnected) return false;
  const r = el.getBoundingClientRect(); if (r.width < 40 || r.height < 40) return false;
  const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  return (el as HTMLElement).offsetParent !== null || cs.position === 'fixed';
}
/** Mount in Shadow DOM before first VISIBLE anchor; floating panel if none. Re-checks on DOM changes,
 *  resizes and every second, moving between embedded/floating as the sidebar collapses/expands. */
export function mountSidebar(a: PlatformAdapter, render: (root: ShadowRoot, floating: boolean) => void) {
  const findAnchor = () => a.sidebarAnchors.map((s) => [...document.querySelectorAll(s)].find(isVisible)).find(Boolean) ?? null;
  const mount = () => {
    const existing = document.getElementById(HOST_ID);
    const anchor = findAnchor();
    const want = anchor ? 'embedded' : 'floating';
    if (existing?.isConnected && existing.dataset.mode === want && (want === 'floating' || existing.nextElementSibling === anchor || anchor!.contains(existing))) return;
    existing?.remove();
    const host = document.createElement('div'); host.id = HOST_ID; host.dataset.mode = want;
    if (anchor) anchor.parentElement!.insertBefore(host, anchor);
    else { Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '88px', zIndex: '2147483646', width: '300px' }); document.body.appendChild(host); }
    render(host.attachShadow({ mode: 'open' }), !anchor);
  };
  mount();
  let t: number | undefined; const soon = () => { clearTimeout(t); t = window.setTimeout(mount, 250); };
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state'] });
  new ResizeObserver(soon).observe(document.documentElement);
  window.addEventListener('resize', soon);
  setInterval(mount, 1000); // catches CSS-transition collapses that emit no mutations
}
