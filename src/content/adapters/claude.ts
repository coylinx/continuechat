import type { PlatformAdapter } from './types';
import { fetchJSON, firstMatch, SiteError, setInputText } from './types';
import { normalizeTurns } from '../../shared/continue';
import { conversationUrl, NEW_CHAT_URL, type Conversation } from '../../shared/types';
// Verified Oct 13: /api/organizations (multiple; pick chat-capable), chat_conversations list + detail (tree=True&rendering_mode=messages).
let orgId: string | undefined;
const api = <T>(path: string) => fetchJSON<T>('Claude', '/api' + path);
async function org() {
  if (orgId) return orgId;
  const orgs = await api<{ uuid: string; capabilities?: string[] }[]>('/organizations');
  const chat = orgs.filter((o) => o.capabilities?.includes('chat'));
  // Prefer the org the user last used in the UI (cookie), when it is one of the chat-capable ones.
  const last = document.cookie.match(/(?:^|;\s*)lastActiveOrg=([^;]+)/)?.[1];
  orgId = (chat.find((o) => o.uuid === last) ?? chat[0] ?? orgs[0])?.uuid;
  if (!orgId) throw new SiteError('org', 'Claude: no organization');
  return orgId;
}
type Msg = { uuid: string; sender: string; index: number; text?: string; content?: { type?: string; text?: string }[];
  attachments?: { file_name: string; file_type?: string; extracted_content?: string }[]; parent_message_uuid?: string };
export type ClaudeConversationJSON = { name?: string; updated_at?: string; current_leaf_message_uuid?: string; chat_messages?: Msg[] };

/** tree=True may include edited/retried branches: walk back from the current leaf via parent_message_uuid.
 *  Falls back to index order when the response carries no parent links. Pure (unit-tested with fixtures). */
export function parseClaudeConversation(id: string, d: ClaudeConversationJSON): Conversation {
  const all = d.chat_messages ?? []; const byId = new Map(all.map((m) => [m.uuid, m]));
  const byIndex = [...all].sort((a, b) => a.index - b.index);
  let msgs = byIndex;
  if (all.some((m) => m.parent_message_uuid && byId.has(m.parent_message_uuid))) {
    let cur: Msg | undefined = (d.current_leaf_message_uuid && byId.get(d.current_leaf_message_uuid)) || byIndex[byIndex.length - 1];
    const chain: Msg[] = []; const seen = new Set<string>();
    while (cur && !seen.has(cur.uuid)) { seen.add(cur.uuid); chain.unshift(cur); cur = cur.parent_message_uuid ? byId.get(cur.parent_message_uuid) : undefined; }
    msgs = chain;
  }
  return { id, platform: 'claude', title: d.name || 'Untitled', updatedAt: Date.parse(d.updated_at ?? '') || 0,
    turns: normalizeTurns(msgs.map((m) => ({ role: m.sender === 'human' ? 'user' as const : 'assistant' as const,
      text: (m.text || (m.content ?? []).filter((c) => c.type === 'text' || c.text).map((c) => c.text ?? '').join('\n')).trim(),
      attachments: (m.attachments ?? []).filter((a) => a.extracted_content).map((a) => ({ name: a.file_name, text: a.extracted_content! })) }))) };
}

export const claudeAdapter: PlatformAdapter = {
  platform: 'claude',
  newChatUrl: NEW_CHAT_URL.claude,
  conversationUrl: (id) => conversationUrl('claude', id),
  sidebarAnchors: ['[data-testid="sidebar-recents"]', 'aside[aria-label="Sidebar"]', '[data-testid="sidebar"]', 'nav'],
  currentConversationId: () => location.pathname.match(/\/chat\/([\w-]+)/)?.[1] ?? null,
  async listConversations(offset, limit) {
    // offset is UNVERIFIED for this endpoint; forEachPage stops if a page brings nothing new.
    const d = await api<{ uuid: string; name: string; summary?: string; updated_at: string }[]>(`/organizations/${await org()}/chat_conversations?limit=${limit}&offset=${offset}`);
    return { count: d.length, metas: d.map((c) => ({ id: c.uuid, platform: 'claude' as const, title: c.name || 'Untitled', updatedAt: Date.parse(c.updated_at), snippet: c.summary || undefined })) };
  },
  async getConversation(id) {
    return parseClaudeConversation(id, await api<ClaudeConversationJSON>(`/organizations/${await org()}/chat_conversations/${id}?tree=True&rendering_mode=messages`));
  },
  getInputBox: () => firstMatch(['div[data-testid="chat-input"].ProseMirror[contenteditable="true"]', 'div[data-testid="chat-input"]', 'div.ProseMirror[contenteditable="true"]', 'textarea']),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
