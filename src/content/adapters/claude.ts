import type { PlatformAdapter } from './types';
import { firstMatch, setInputText } from './types';
// Verified Oct 13: /api/organizations (multiple; pick chat-capable), chat_conversations list + detail (tree=True&rendering_mode=messages).
let orgId: string | undefined;
async function api<T>(path: string): Promise<T> {
  const r = await fetch('/api' + path, { credentials: 'include' });
  if (!r.ok) throw new Error(`Claude ${path} → ${r.status}`);
  return r.json() as Promise<T>;
}
async function org() {
  if (orgId) return orgId;
  const orgs = await api<{ uuid: string; capabilities?: string[] }[]>('/organizations');
  orgId = (orgs.find((o) => o.capabilities?.includes('chat')) ?? orgs[0])?.uuid;
  if (!orgId) throw new Error('Claude: no organization');
  return orgId;
}
type Msg = { uuid: string; sender: string; index: number; text?: string; content?: { type?: string; text?: string }[];
  attachments?: { file_name: string; file_type?: string; extracted_content?: string }[]; parent_message_uuid?: string };

export const claudeAdapter: PlatformAdapter = {
  platform: 'claude',
  newChatUrl: 'https://claude.ai/new',
  conversationUrl: (id) => `https://claude.ai/chat/${id}`,
  sidebarAnchors: ['[data-testid="sidebar-recents"]', 'aside[aria-label="Sidebar"]', '[data-testid="sidebar"]', 'nav'],
  currentConversationId: () => location.pathname.match(/\/chat\/([\w-]+)/)?.[1] ?? null,
  async listConversations(_offset = 0, limit = 100) {
    const d = await api<{ uuid: string; name: string; summary?: string; updated_at: string }[]>(`/organizations/${await org()}/chat_conversations?limit=${limit}`);
    return d.map((c) => ({ id: c.uuid, platform: 'claude' as const, title: c.name || 'Untitled', updatedAt: Date.parse(c.updated_at), snippet: c.summary || undefined }));
  },
  async getConversation(id) {
    const d = await api<{ name: string; updated_at: string; chat_messages: Msg[] }>(`/organizations/${await org()}/chat_conversations/${id}?tree=True&rendering_mode=messages`);
    // tree=True may include branches: walk back from the latest message via parent_message_uuid.
    const byId = new Map(d.chat_messages.map((m) => [m.uuid, m]));
    let cur: Msg | undefined = [...d.chat_messages].sort((a, b) => b.index - a.index)[0]; const chain: Msg[] = [];
    while (cur && !chain.includes(cur)) { chain.unshift(cur); cur = cur.parent_message_uuid ? byId.get(cur.parent_message_uuid) : undefined; }
    const msgs = chain.length ? chain : d.chat_messages;
    return { id, platform: 'claude', title: d.name || 'Untitled', updatedAt: Date.parse(d.updated_at),
      turns: msgs.map((m) => ({ role: m.sender === 'human' ? 'user' as const : 'assistant' as const,
        text: (m.text || (m.content ?? []).filter((c) => c.type === 'text' || c.text).map((c) => c.text ?? '').join('\n')).trim(),
        attachments: (m.attachments ?? []).filter((a) => a.extracted_content).map((a) => ({ name: a.file_name, text: a.extracted_content! })) })) };
  },
  getInputBox: () => firstMatch(['div[data-testid="chat-input"].ProseMirror[contenteditable="true"]', 'div[data-testid="chat-input"]', 'div.ProseMirror[contenteditable="true"]', 'textarea']),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
