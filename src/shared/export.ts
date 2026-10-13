import type { Conversation } from './types';
import { PLATFORM_LABEL } from './types';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export function toMarkdown(cs: Conversation[]) {
  return cs.map((c) => `# ${c.title}\n\n_${PLATFORM_LABEL[c.platform]} · ${new Date(c.updatedAt).toISOString()}_\n\n` +
    c.turns.map((t) => `**${t.role === 'user' ? 'User' : 'AI'}:**\n\n${t.text}` + (t.attachments ?? []).map((a) => `\n\n> 📎 ${a.name}`).join('')).join('\n\n---\n\n')).join('\n\n\n');
}
export function toJSON(cs: Conversation[]) { return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'ContinueChat', conversations: cs }, null, 2); }
export function toPrintableHTML(cs: Conversation[]) {
  return `<!doctype html><meta charset="utf-8"><title>ContinueChat export</title><style>body{font:14px/1.5 system-ui;max-width:760px;margin:24px auto}pre{white-space:pre-wrap;font:inherit}h1{page-break-before:always}h1:first-of-type{page-break-before:auto}</style>` +
    cs.map((c) => `<h1>${esc(c.title)}</h1>` + c.turns.map((t) => `<p><b>${t.role === 'user' ? 'User' : 'AI'}:</b></p><pre>${esc(t.text)}</pre>`).join('')).join('');
}
