import type { PlatformAdapter } from './types';
import { setInputText } from './types';
import type { Turn } from '../../shared/types';
// UNVERIFIED: ChatGPT /backend-api requires a bearer token from /api/auth/session; shapes may change.
async function token() {
  const r = await fetch('/api/auth/session', { credentials: 'include' });
  return ((await r.json()) as { accessToken?: string }).accessToken;
}
async function api<T>(path: string): Promise<T> {
  const t = await token();
  const r = await fetch('/backend-api' + path, { credentials: 'include', headers: t ? { authorization: `Bearer ${t}` } : {} });
  if (!r.ok) throw new Error(`chatgpt ${path} ${r.status}`);
  return r.json() as Promise<T>;
}
export const chatgptAdapter: PlatformAdapter = {
  platform: 'chatgpt',
  newChatUrl: 'https://chatgpt.com/',
  sidebarAnchors: ['nav[aria-label="Chat history"]', 'nav', '[data-testid="sidebar"]'],
  async listConversations(offset = 0, limit = 28) {
    const d = await api<{ items: { id: string; title: string; update_time: string | number }[] }>(`/conversations?offset=${offset}&limit=${limit}&order=updated`);
    return d.items.map((i) => ({ id: i.id, platform: 'chatgpt' as const, title: i.title, updatedAt: typeof i.update_time === 'number' ? i.update_time * 1000 : Date.parse(i.update_time) }));
  },
  async getConversation(id) {
    type Node = { parent?: string; message?: { author: { role: string }; content: { parts?: unknown[] } } };
    const d = await api<{ title: string; update_time: number; current_node: string; mapping: Record<string, Node> }>(`/conversation/${id}`);
    const turns: Turn[] = []; let cur: string | undefined = d.current_node;
    while (cur) { const n: Node = d.mapping[cur]; const m = n?.message;
      if (m && (m.author.role === 'user' || m.author.role === 'assistant')) {
        const text = (m.content.parts ?? []).filter((p) => typeof p === 'string').join('\n');
        if (text) turns.unshift({ role: m.author.role, text });
      }
      cur = n?.parent; }
    return { id, platform: 'chatgpt', title: d.title, updatedAt: d.update_time * 1000, turns };
  },
  getInputBox: () => document.querySelector<HTMLElement>('#prompt-textarea, textarea, div[contenteditable="true"]'),
  prefill(text) { const el = this.getInputBox(); return el ? setInputText(el, text) : false; },
};
