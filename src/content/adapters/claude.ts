import type { PlatformAdapter } from './types';
import { setInputText } from './types';
// UNVERIFIED: Claude /api endpoints (organization lookup + chat_conversations) and response shapes.
let orgId: string | undefined;
async function api<T>(path: string): Promise<T> {
  const r = await fetch('/api' + path, { credentials: 'include' });
  if (!r.ok) throw new Error(`claude ${path} ${r.status}`);
  return r.json() as Promise<T>;
}
async function org() { return (orgId ??= (await api<{ uuid: string }[]>('/organizations'))[0]?.uuid); }
export const claudeAdapter: PlatformAdapter = {
  platform: 'claude',
  newChatUrl: 'https://claude.ai/new',
  sidebarAnchors: ['nav[aria-label="Sidebar"]', 'nav', '[data-testid="sidebar"]'],
  async listConversations() {
    const d = await api<{ uuid: string; name: string; updated_at: string }[]>(`/organizations/${await org()}/chat_conversations`);
    return d.map((c) => ({ id: c.uuid, platform: 'claude' as const, title: c.name || 'Untitled', updatedAt: Date.parse(c.updated_at) }));
  },
  async getConversation(id) {
    const d = await api<{ name: string; updated_at: string; chat_messages: { sender: string; text?: string; content?: { text?: string }[] }[] }>(
      `/organizations/${await org()}/chat_conversations/${id}?tree=True&rendering_mode=messages`);
    return { id, platform: 'claude', title: d.name, updatedAt: Date.parse(d.updated_at),
      turns: d.chat_messages.map((m) => ({ role: m.sender === 'human' ? 'user' as const : 'assistant' as const, text: m.text || (m.content ?? []).map((c) => c.text ?? '').join('\n') })) };
  },
  getInputBox: () => document.querySelector<HTMLElement>('div[contenteditable="true"].ProseMirror, div[contenteditable="true"], textarea'),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
