import type { PlatformAdapter } from './types';
import { firstMatch, setInputText } from './types';
import type { Turn } from '../../shared/types';
// Verified Oct 13: /api/auth/session -> accessToken; /backend-api/conversations {items,total,limit,offset}; /conversation/{id} mapping+current_node.
let tok: { v?: string; at: number } = { at: 0 };
async function token() {
  if (tok.v && Date.now() - tok.at < 5 * 60_000) return tok.v;
  const r = await fetch('/api/auth/session', { credentials: 'include' });
  tok = { v: ((await r.json()) as { accessToken?: string }).accessToken, at: Date.now() };
  return tok.v;
}
async function api<T>(path: string): Promise<T> {
  const t = await token();
  const r = await fetch('/backend-api' + path, { credentials: 'include', headers: t ? { authorization: `Bearer ${t}` } : {} });
  if (!r.ok) throw new Error(`ChatGPT ${path} → ${r.status}`);
  return r.json() as Promise<T>;
}
const ts = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v * 1000 : Date.parse(v));
type Item = { id: string; title: string | null; update_time: string | number; is_archived?: boolean; snippet?: string | null };
type Node = { parent?: string | null; message?: { author: { role: string }; content: { content_type?: string; parts?: unknown[] }; metadata?: { is_visually_hidden_from_conversation?: boolean } } | null };

export const chatgptAdapter: PlatformAdapter = {
  platform: 'chatgpt',
  newChatUrl: 'https://chatgpt.com/',
  conversationUrl: (id) => `https://chatgpt.com/c/${id}`,
  sidebarAnchors: ['nav[aria-label="Chat history"]', 'nav'],
  currentConversationId: () => location.pathname.match(/\/c\/([\w-]+)/)?.[1] ?? null,
  async listConversations(offset = 0, limit = 100) {
    const d = await api<{ items: Item[] }>(`/conversations?offset=${offset}&limit=${limit}&order=updated`);
    return d.items.filter((i) => !i.is_archived).map((i) => ({ id: i.id, platform: 'chatgpt' as const, title: i.title || 'Untitled', updatedAt: ts(i.update_time), snippet: i.snippet ?? undefined }));
  },
  async getConversation(id) {
    const d = await api<{ title: string; update_time: number; current_node: string; mapping: Record<string, Node> }>(`/conversation/${id}`);
    const turns: Turn[] = []; let cur: string | null | undefined = d.current_node; const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur); const n: Node | undefined = d.mapping[cur]; const m = n?.message;
      if (m && (m.author.role === 'user' || m.author.role === 'assistant') && !m.metadata?.is_visually_hidden_from_conversation) {
        const text = (m.content.parts ?? []).filter((p): p is string => typeof p === 'string').join('\n').trim();
        if (text) turns.unshift({ role: m.author.role, text });
      }
      cur = n?.parent;
    }
    return { id, platform: 'chatgpt', title: d.title || 'Untitled', updatedAt: ts(d.update_time), turns };
  },
  getInputBox: () => firstMatch(['div.ProseMirror[contenteditable="true"][role="textbox"]', 'div.ProseMirror[contenteditable="true"]', '#prompt-textarea', 'textarea']),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
