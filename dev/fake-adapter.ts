import { chatgptAdapter } from '../src/content/adapters/chatgpt';
import { claudeAdapter } from '../src/content/adapters/claude';
import { SiteError, type PlatformAdapter } from '../src/content/adapters/types';
import type { Platform } from '../src/shared/types';
import { FIXTURES } from './fixtures';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = new URLSearchParams(location.search).get('fail'); // ?fail=auth|rate|net → list requests fail like the real site would

/** Real adapter (selectors, composer fill, URL parsing) with network calls replaced by fixtures and local URLs. */
export function fakeAdapter(platform: Platform): PlatformAdapter {
  const real = platform === 'chatgpt' ? chatgptAdapter : claudeAdapter;
  return {
    ...real,
    conversationUrl: (id) => `${location.origin}/${platform}/${platform === 'chatgpt' ? 'c' : 'chat'}/${id}`,
    async listConversations(offset, limit) {
      await delay(200);
      if (fail === 'auth' || fail === 'rate' || fail === 'net') throw new SiteError(fail, `fake ${fail}`);
      const items = FIXTURES[platform].slice(offset, offset + limit);
      return { count: items.length, metas: items.map(({ turns, ...m }) => ({ ...m, snippet: turns[1]?.text.slice(0, 80) })) };
    },
    async getConversation(id) {
      await delay(350);
      const c = FIXTURES[platform].find((x) => x.id === id); if (!c) throw new SiteError('http', 'not found');
      return structuredClone(c);
    },
  };
}
