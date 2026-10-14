/** Small, escape-first Markdown → HTML renderer for printable exports (PDF). Never emits raw input HTML. */
export const escHTML = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const FENCE = /^\s*(`{3,}|~{3,})\s*([^`\s]*)/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const isBlockStart = (l: string) => FENCE.test(l) || /^#{1,6}\s/.test(l) || HR.test(l) || /^\s*>/.test(l) || LIST.test(l);

function inline(s: string): string {
  const slots: string[] = []; const keep = (html: string) => `\u0000${slots.push(html) - 1}\u0000`;
  let t = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _b, code: string) => keep(`<code>${escHTML(code.trim())}</code>`));
  t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, txt: string, url: string) => keep(`<a href="${escHTML(url)}">${escHTML(txt)}</a>`));
  t = escHTML(t)
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>').replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?!\*)/g, '$1<em>$2</em>').replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)]);
}

const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

function list(items: { indent: number; ordered: boolean; text: string }[]): string {
  let html = ''; const stack: { indent: number; tag: string }[] = [];
  for (const it of items) {
    while (stack.length && it.indent < stack[stack.length - 1].indent) html += `</li></${stack.pop()!.tag}>`;
    const top = stack[stack.length - 1];
    if (!top || it.indent > top.indent) { const tag = it.ordered ? 'ol' : 'ul'; stack.push({ indent: it.indent, tag }); html += `<${tag}><li>`; }
    else html += '</li><li>';
    html += inline(it.text);
  }
  while (stack.length) html += `</li></${stack.pop()!.tag}>`;
  return html;
}

/** headingOffset shifts #-levels so headings inside a message sit below the chat title (h1). */
export function renderMarkdown(src: string, headingOffset = 2): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n'); const out: string[] = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const f = line.match(FENCE);
    if (f) {
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(f[1])) buf.push(lines[i++]);
      i++; out.push(`<pre><code${f[2] ? ` data-lang="${escHTML(f[2])}"` : ''}>${escHTML(buf.join('\n'))}</code></pre>`); continue;
    }
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) { const n = Math.min(6, h[1].length + headingOffset); out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (HR.test(line)) { out.push('<hr>'); i++; continue; }
    if (line.includes('|') && TABLE_SEP.test(lines[i + 1] ?? '')) {
      const align = cells(lines[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : ''));
      const td = (tag: string, c: string, k: number) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ''}>${inline(c)}</${tag}>`;
      let html = `<table><thead><tr>${cells(line).map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>`; i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) html += `<tr>${cells(lines[i++]).map((c, k) => td('td', c, k)).join('')}</tr>`;
      out.push(html + '</tbody></table>'); continue;
    }
    if (/^\s*>/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*> ?/, ''));
      out.push(`<blockquote>${renderMarkdown(buf.join('\n'), headingOffset)}</blockquote>`); continue;
    }
    if (LIST.test(line)) {
      const items: { indent: number; ordered: boolean; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST);
        if (m) { items.push({ indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), text: m[3] }); i++; continue; }
        if (lines[i].trim() && /^\s+/.test(lines[i]) && !FENCE.test(lines[i]) && items.length) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; continue; }
        break;
      }
      out.push(list(items)); continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !isBlockStart(lines[i])) && !(lines[i].includes('|') && TABLE_SEP.test(lines[i + 1] ?? ''))) para.push(lines[i++]);
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  return out.join('\n');
}
