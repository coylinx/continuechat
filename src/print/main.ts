// Printable export page: an extension page, so the site's CSP can't block its styles. The HTML comes from
// toPrintableHTML (all user text escaped) and is rendered in a sandboxed iframe with scripts disabled.
import { initLang, t } from '../shared/i18n';
import { rpc } from '../shared/rpc';

const btn = document.getElementById('print') as HTMLButtonElement;
const doc = document.getElementById('doc')!;
async function main() {
  await initLang(); btn.textContent = t('printBtn');
  const html = await rpc('print:take', { id: location.hash.slice(1) }).catch(() => null);
  if (!html) { doc.innerHTML = `<p style="text-align:center;padding:40px">${t('printExpired')}</p>`; return; }
  const f = document.createElement('iframe');
  f.setAttribute('sandbox', 'allow-same-origin allow-modals'); // allow-same-origin: we size it and call print(); no scripts run inside
  f.style.cssText = 'width:100%;border:0;display:block;min-height:100vh';
  f.srcdoc = html; doc.appendChild(f);
  f.onload = () => {
    const d = f.contentDocument!; document.title = d.title || document.title;
    const fit = () => { f.style.height = d.documentElement.scrollHeight + 'px'; }; fit(); new ResizeObserver(fit).observe(d.documentElement);
    btn.disabled = false; btn.onclick = () => f.contentWindow!.print();
    setTimeout(() => f.contentWindow!.print(), 300);
  };
}
void main();
