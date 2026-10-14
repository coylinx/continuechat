/** Follows the SITE's theme (which can differ from the OS setting): explicit markers first, then background luminance. */
export function pageIsDark(): boolean {
  const h = document.documentElement;
  if (h.classList.contains('dark') || h.dataset.mode === 'dark' || h.dataset.theme === 'dark') return true;
  if (h.classList.contains('light') || h.dataset.mode === 'light' || h.dataset.theme === 'light') return false;
  for (const el of [document.body, h]) {
    const m = el && getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    if (m && m.length >= 3 && (m.length < 4 || Number(m[3]) > 0.5)) { const [r, g, b] = m.map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128; }
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
const els = new Set<HTMLElement>(); let watching = false;
const apply = () => { const d = pageIsDark(); for (const el of els) { if (!el.isConnected) els.delete(el); else el.classList.toggle('dark', d); } };
/** Keeps `.dark` on el in sync with the page theme. */
export function themed(el: HTMLElement) {
  els.add(el); el.classList.toggle('dark', pageIsDark());
  if (watching) return; watching = true;
  const mo = new MutationObserver(apply);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-mode', 'data-theme'] });
  if (document.body) mo.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
}
