// Body-level Shadow-DOM layer for modals and toasts. Kept outside the sidebar so a transformed/overflow-clipped
// sidebar can't trap position:fixed, and so it works before the panel is mounted (prefill toasts).
import { escHTML as esc } from '../../shared/markdown';
import { t } from '../../shared/i18n';
import { CSS } from './styles';
import { themed } from './theme';

const LAYER_ID = 'continuechat-layer';
let host: HTMLElement | null = null; let wrap: HTMLElement; let modalEl: HTMLElement | null = null; let toasts: HTMLElement;
let onCloseCb: (() => void) | undefined;

/** Keys typed in our inputs must not reach the site's global shortcuts / "type anywhere to focus the composer". */
export function isolate(root: ShadowRoot) {
  for (const ev of ['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'paste', 'copy', 'cut', 'compositionstart', 'compositionend'])
    root.addEventListener(ev, (e) => e.stopPropagation());
}
function ensure() {
  if (host?.isConnected) return wrap;
  host = document.createElement('div'); host.id = LAYER_ID;
  Object.assign(host.style, { position: 'fixed', top: '0', left: '0', width: '0', height: '0', zIndex: '2147483647' });
  const root = host.attachShadow({ mode: 'open' }); isolate(root);
  root.innerHTML = `<style>${CSS}</style><div class="cc"><div data-modal></div><div class="toasts" role="status" aria-live="polite"></div></div>`;
  wrap = root.querySelector<HTMLElement>('.cc')!; themed(wrap); toasts = root.querySelector<HTMLElement>('.toasts')!;
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl) { e.preventDefault(); close(); } });
  document.body.appendChild(host);
  return wrap;
}
export function removeLayer() { host?.remove(); host = null; modalEl = null; }

/** Opens (replacing any open one) a modal; returns the .dlg element to fill. Click on the backdrop or Esc closes. */
export function modal(html: string, onClose?: () => void): HTMLElement {
  const w = ensure(); onCloseCb?.(); onCloseCb = onClose;
  const slot = w.querySelector<HTMLElement>('[data-modal]')!;
  slot.innerHTML = `<div class="ov"><div class="dlg" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`;
  modalEl = slot.firstElementChild as HTMLElement;
  modalEl.addEventListener('mousedown', (e) => { if (e.target === modalEl) close(); });
  const dlg = modalEl.firstElementChild as HTMLElement;
  queueMicrotask(() => focusFirst(dlg));
  return dlg;
}
export function focusFirst(dlg: HTMLElement) { (dlg.querySelector<HTMLElement>('[autofocus]') ?? dlg.querySelector<HTMLElement>('input,button:not([data-x])') ?? dlg).focus({ preventScroll: true }); }
export function close() { if (!modalEl) return; modalEl.parentElement!.innerHTML = ''; modalEl = null; const cb = onCloseCb; onCloseCb = undefined; cb?.(); }
export const isOpen = (dlg: HTMLElement) => dlg.isConnected;

export function confirmDialog(o: { title: string; body?: string; ok: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false; const finish = (v: boolean) => { if (!done) { done = true; resolve(v); } };
    const dlg = modal(`<h2>${esc(o.title)}</h2>${o.body ? `<p class="mut">${esc(o.body)}</p>` : ''}
      <div class="row" style="margin-top:14px;justify-content:flex-end"><button data-x>${esc(t('cancel'))}</button><button class="pri ${o.danger ? 'danger' : ''}" data-ok autofocus>${esc(o.ok)}</button></div>`, () => finish(false));
    dlg.querySelector<HTMLElement>('[data-x]')!.onclick = () => close();
    dlg.querySelector<HTMLElement>('[data-ok]')!.onclick = () => { finish(true); close(); };
  });
}
export function promptDialog(o: { title: string; value?: string; placeholder?: string; ok: string }): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false; const finish = (v: string | null) => { if (!done) { done = true; resolve(v); } };
    const dlg = modal(`<h2>${esc(o.title)}</h2><input class="txt" maxlength="100" value="${esc(o.value ?? '')}" placeholder="${esc(o.placeholder ?? '')}" autofocus>
      <div class="row" style="margin-top:6px;justify-content:flex-end"><button data-x>${esc(t('cancel'))}</button><button class="pri" data-ok>${esc(o.ok)}</button></div>`, () => finish(null));
    const input = dlg.querySelector<HTMLInputElement>('input')!; const ok = dlg.querySelector<HTMLButtonElement>('[data-ok]')!;
    const sync = () => { ok.disabled = !input.value.trim(); }; sync(); input.oninput = sync;
    const submit = () => { const v = input.value.trim(); if (!v) return; finish(v); close(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); } });
    queueMicrotask(() => input.select());
    dlg.querySelector<HTMLElement>('[data-x]')!.onclick = () => close(); ok.onclick = submit;
  });
}

export interface ToastAction { label: string; primary?: boolean; onClick?: () => void | Promise<void>; }
/** timeout 0 = stays until an action or ✕ is clicked. */
export function toast(text: string, kind: 'info' | 'ok' | 'err' = 'info', o: { timeout?: number; actions?: ToastAction[] } = {}) {
  ensure();
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  const icon = kind === 'ok' ? '✓' : kind === 'err' ? '⚠' : 'ⓘ';
  el.innerHTML = `<span class="ti">${icon}</span><span class="sp">${esc(text)}</span>${(o.actions ?? []).map((a, i) => `<button data-a="${i}" class="${a.primary ? 'pri' : ''}">${esc(a.label)}</button>`).join('')}<button class="ghost icon" data-close aria-label="${esc(t('close'))}">✕</button>`;
  const remove = () => el.remove();
  el.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.onclick = async () => { remove(); await o.actions![Number(b.dataset.a)].onClick?.(); });
  el.querySelector<HTMLElement>('[data-close]')!.onclick = remove;
  toasts.appendChild(el);
  const ms = o.timeout ?? (kind === 'err' ? 8000 : 4000); if (ms) setTimeout(remove, ms);
  return el;
}
