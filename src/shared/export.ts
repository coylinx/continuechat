import { escHTML, renderMarkdown } from './markdown';
import type { Conversation } from './types';
import { conversationUrl, PLATFORM_LABEL } from './types';

export interface ExportLabels { user: string; ai: string; exportedWith: string; }
export const EN_EXPORT_LABELS: ExportLabels = { user: 'User', ai: 'AI', exportedWith: 'Exported with ContinueChat' };

/** Windows/macOS-safe file name that keeps non-ASCII titles (e.g. Chinese) intact. */
export function safeFileName(s: string, fallback = 'chat') {
  const n = s.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|[.\s]+$/g, '').slice(0, 80).trim();
  return n && !/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(n) ? n : fallback;
}
/** "a", "a", "b" → "a", "a (2)", "b" (case-insensitive, since most file systems are). */
export function uniqueNames(names: string[], ext: string) {
  const used = new Set<string>();
  return names.map((n) => { let name = n + ext, k = 2; while (used.has(name.toLowerCase())) name = `${n} (${k++})${ext}`; used.add(name.toLowerCase()); return name; });
}
const stamp = (ts: number) => { const d = new Date(ts), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

export function chatToMarkdown(c: Conversation, l: ExportLabels = EN_EXPORT_LABELS) {
  return `# ${c.title}\n\n_${PLATFORM_LABEL[c.platform]} · ${stamp(c.updatedAt)} · ${conversationUrl(c.platform, c.id)}_\n\n` +
    c.turns.map((t) => `**${t.role === 'user' ? l.user : l.ai}:**\n\n${t.text}` + (t.attachments ?? []).map((a) => `\n\n> 📎 ${a.name}`).join('')).join('\n\n---\n\n') + '\n';
}
export function toMarkdown(cs: Conversation[], l: ExportLabels = EN_EXPORT_LABELS) { return cs.map((c) => chatToMarkdown(c, l)).join('\n\n\n'); }
export function toJSON(cs: Conversation[]) { return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'ContinueChat', conversations: cs }, null, 2); }

const PRINT_CSS = `body{font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1a1a1a;max-width:760px;margin:24px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px;page-break-before:always}h1:first-of-type{page-break-before:auto}.meta{color:#6b6b6b;font-size:12px;margin-bottom:16px;word-break:break-all}
.turn{margin:14px 0;padding:10px 14px;border-radius:10px;break-inside:auto}.turn.user{background:#f3f3f3}.role{font-weight:600;font-size:12px;color:#6b6b6b;margin-bottom:4px}
.md p{margin:6px 0}.md h3,.md h4,.md h5,.md h6{margin:12px 0 4px}pre{background:#f6f8fa;border:1px solid #e5e5e5;border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
code{font:12px ui-monospace,SFMono-Regular,Consolas,monospace;background:#f0f0f0;border-radius:4px;padding:0 3px}pre code{background:none;padding:0}
table{border-collapse:collapse;margin:8px 0;font-size:13px}th,td{border:1px solid #ddd;padding:4px 8px;vertical-align:top}th{background:#f6f6f6}
blockquote{margin:6px 0;padding:0 12px;border-left:3px solid #ddd;color:#555}.att{font-size:12px;color:#6b6b6b}.foot{margin-top:24px;color:#9a9a9a;font-size:11px;text-align:center}
@media print{body{margin:0 auto}.turn{border:1px solid #eee}}`;
export function toPrintableHTML(cs: Conversation[], l: ExportLabels = EN_EXPORT_LABELS) {
  const body = cs.map((c) => `<h1>${escHTML(c.title)}</h1><div class="meta">${PLATFORM_LABEL[c.platform]} · ${stamp(c.updatedAt)} · ${escHTML(conversationUrl(c.platform, c.id))}</div>` +
    c.turns.map((t) => `<section class="turn ${t.role}"><div class="role">${t.role === 'user' ? escHTML(l.user) : escHTML(l.ai)}</div><div class="md">${renderMarkdown(t.text)}</div>` +
      (t.attachments ?? []).map((a) => `<div class="att">📎 ${escHTML(a.name)}</div>`).join('') + `</section>`).join('')).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escHTML(cs.length === 1 ? cs[0].title : 'ContinueChat export')}</title><style>${PRINT_CSS}</style></head><body>${body}<div class="foot">${escHTML(l.exportedWith)}</div></body></html>`;
}
