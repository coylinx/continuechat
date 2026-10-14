import type { PlatformAdapter } from './adapters/types';
import { inputText } from './adapters/types';
import { t } from '../shared/i18n';
import { rpc } from '../shared/rpc';
import { PLATFORM_LABEL } from '../shared/types';
import * as layer from './ui/layer';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (s: string) => s.replace(/\s+/g, '');
/** Synchronous copy inside the click's user gesture first (no permission prompt, can't hang); the async
 *  Clipboard API — which can wait on a permission prompt — only as a time-boxed fallback. */
async function copyText(text: string) {
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* unsupported */ } finally { ta.remove(); }
  if (ok) return true;
  return Promise.race([navigator.clipboard.writeText(text).then(() => true, () => false), sleep(2000).then(() => false)]);
}

/** On the target tab: take queued text (per-tab) and fill the composer as soon as it is ready. Never clicks send.
 *  Verifies the text actually landed; if it can't, offers a one-click copy instead of failing silently. */
export async function consumePendingPrefill(a: PlatformAdapter, timeoutMs = 45_000) {
  const p = await rpc('prefill:take').catch(() => null); if (!p) return;
  const probe = norm(p.text).slice(0, 60);
  const box = () => { const el = a.getInputBox(); return el?.isConnected ? el : null; };
  const landed = () => { const el = box(); return !!el && norm(inputText(el)).includes(probe); };
  const until = Date.now() + timeoutMs; let ok = false;
  while (!ok && Date.now() < until) {
    if (!box()) { await sleep(250); continue; }
    await sleep(400); // let the editor finish hydrating before typing into it
    if (!landed()) a.prefill(p.text);
    await sleep(150); ok = landed();
    if (!ok) await sleep(800);
  }
  if (!ok) {
    layer.toast(t('fillFailed'), 'err', { timeout: 0, actions: [{ label: t('copyContext'), primary: true, onClick: async () => {
      if (await copyText(p.text)) layer.toast(t('copied'), 'ok'); else layer.toast(t('copyFailed'), 'err');
    } }] });
    return;
  }
  layer.toast(t('filledToast', { site: PLATFORM_LABEL[p.from] }), 'ok', { timeout: 9000, actions: [{ label: t('gotIt') }] });
  // Some editors re-mount right after hydration and wipe their content: refill once, but only if it is EMPTY
  // (never overwrite what the user has started editing).
  for (let i = 0, refilled = false; i < 6 && !refilled; i++) {
    await sleep(1000); const el = box();
    if (el && !norm(inputText(el))) { refilled = true; a.prefill(p.text); }
  }
}
