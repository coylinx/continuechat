import type { PlatformAdapter } from './adapters/types';
import { initLang, setLang } from '../shared/i18n';
import { REV_KEY } from '../shared/rpc';
import { sanitizeSettings } from '../shared/settings';
import { consumePendingPrefill } from './prefill';
import { mountSidebar, remount } from './ui/mount';
import { createPanel, refreshAll } from './ui/panel';

export async function boot(a: PlatformAdapter, other: PlatformAdapter) {
  await initLang();
  mountSidebar(a, createPanel(a, other));
  void consumePendingPrefill(a);
  // Folders/pins/usage changed in another tab (background bumps "rev"), license changed in the popup, or language changed.
  let t: number | undefined;
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.lang) { setLang(sanitizeSettings({ lang: ch.lang.newValue }).lang); remount(); return; }
    if (ch[REV_KEY] || ch.license) { clearTimeout(t); t = window.setTimeout(refreshAll, 300); }
  });
}
