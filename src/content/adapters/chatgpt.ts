import type { PlatformAdapter } from './types';
import { fetchJSON, firstMatch, SiteError, setInputText } from './types';
import { normalizeTurns } from '../../shared/continue';
import { conversationUrl, NEW_CHAT_URL, type Conversation, type Turn } from '../../shared/types';
// Verified Oct 13: /api/auth/session -> accessToken; /backend-api/conversations {items,total,limit,offset}; /conversation/{id} mapping+current_node.
let tok: { v?: string; at: number } = { at: 0 };
async function token() {
  if (tok.v && Date.now() - tok.at < 5 * 60_000) return tok.v;
  const s = await fetchJSON<{ accessToken?: string }>('ChatGPT', '/api/auth/session').catch(() => ({} as { accessToken?: string }));
  tok = { v: s.accessToken, at: Date.now() };
  return tok.v;
}
async function api<T>(path: string, retried = false): Promise<T> {
  const t = await token();
  try { return await fetchJSON<T>('ChatGPT', '/backend-api' + path, { headers: t ? { authorization: `Bearer ${t}` } : {} }); }
  catch (e) {
    // Expired token: refresh once, then surface "sign in".
    if (e instanceof SiteError && e.code === 'auth' && !retried) { tok = { at: 0 }; return api<T>(path, true); }
    throw e;
  }
}
const ts = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v * 1000 : Date.parse(v));
type Item = { id: string; title: string | null; update_time: string | number; is_archived?: boolean; snippet?: string | null };
type Msg = { author: { role: string }; recipient?: string; content: { content_type?: string; parts?: unknown[] }; metadata?: { is_visually_hidden_from_conversation?: boolean } };
type Node = { parent?: string | null; message?: Msg | null };
export type ChatGPTConversationJSON = { title?: string | null; update_time?: number | string; current_node?: string; mapping?: Record<string, Node> };
/** Hidden system/context nodes that have role "user"/"assistant" but are not part of the visible chat. */
const SKIP_TYPES = new Set(['user_editable_context', 'model_editable_context', 'thoughts', 'reasoning_recap', 'system_error', 'tether_browsing_display']);

/** Walks the visible branch: current_node → parent … root. Pure (unit-tested with fixtures). */
export function parseChatGPTConversation(id: string, d: ChatGPTConversationJSON): Conversation {
  const turns: Turn[] = []; const map = d.mapping ?? {}; let cur: string | null | undefined = d.current_node; const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur); const n: Node | undefined = map[cur]; const m = n?.message;
    if (m && (m.author.role === 'user' || m.author.role === 'assistant') && !m.metadata?.is_visually_hidden_from_conversation
      && !SKIP_TYPES.has(m.content.content_type ?? '') && (m.recipient ?? 'all') === 'all') {
      const text = (m.content.parts ?? []).filter((p): p is string => typeof p === 'string').join('\n').trim();
      if (text) turns.unshift({ role: m.author.role, text });
    }
    cur = n?.parent;
  }
  return { id, platform: 'chatgpt', title: d.title || 'Untitled', updatedAt: ts(d.update_time), turns: normalizeTurns(turns) };
}

export const chatgptAdapter: PlatformAdapter = {
  platform: 'chatgpt',
  newChatUrl: NEW_CHAT_URL.chatgpt,
  conversationUrl: (id) => conversationUrl('chatgpt', id),
  sidebarAnchors: ['nav[aria-label="Chat history"]', 'nav'],
  currentConversationId: () => location.pathname.match(/\/c\/([\w-]+)/)?.[1] ?? null,
  async listConversations(offset, limit) {
    const d = await api<{ items?: Item[] }>(`/conversations?offset=${offset}&limit=${limit}&order=updated`);
    const items = d.items ?? [];
    return { count: items.length, metas: items.filter((i) => !i.is_archived).map((i) => ({ id: i.id, platform: 'chatgpt' as const, title: i.title || 'Untitled', updatedAt: ts(i.update_time), snippet: i.snippet ?? undefined })) };
  },
  async getConversation(id) { return parseChatGPTConversation(id, await api<ChatGPTConversationJSON>(`/conversation/${id}`)); },
  getInputBox: () => firstMatch(['div.ProseMirror[contenteditable="true"][role="textbox"]', 'div.ProseMirror[contenteditable="true"]', '#prompt-textarea', 'textarea']),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
