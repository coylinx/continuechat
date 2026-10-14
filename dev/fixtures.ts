import type { Conversation, Platform, Turn } from '../src/shared/types';
// Deterministic fake chats: mixed English/Chinese titles, long code/table answers (to trigger trimming),
// attachments on Claude, and enough ChatGPT chats (230) to exercise pagination.
const code = (i: number) => '```ts\n' + Array.from({ length: 40 }, (_, k) => `const v${i}_${k} = compute(${k}); // step ${k}`).join('\n') + '\n```';
const table = (i: number) => `| 指标 | 数值 | 说明 |\n|---|---:|---|\n` + Array.from({ length: 12 }, (_, k) => `| m${i}-${k} | ${k * 7} | 第 ${k} 项 |`).join('\n');
const TITLES = ['周末旅行计划：杭州两日游', 'Refactoring the parser', '机器学习入门笔记', 'SQL index tuning for orders table', '写一封求职信', 'React state management options',
  '如何给猫咪选猫粮', 'Kubernetes rollout strategy', '论文摘要润色', 'Weekly meal prep ideas', 'Python 爬虫去重方案', 'Pricing page copy review'];
function turnsFor(title: string, n: number): Turn[] {
  const out: Turn[] = [];
  for (let k = 0; k < n; k++) {
    out.push({ role: 'user', text: k === 0 ? `关于「${title}」，我想请教几个问题。Question ${k}?` : `Follow-up ${k}: can you expand on point ${k}?` });
    out.push({ role: 'assistant', text: k % 3 === 2 ? `Here is a detailed answer ${k} with code:\n\n${code(k)}\n\nAnd a summary table:\n\n${table(k)}\n\n要点：西湖、预算和路线都考虑到了。` : `Short answer ${k}. **Key point**: keep it simple. 我们可以先做一个最小可行版本。` });
  }
  return out;
}
const day = 86_400_000; const NOW = Date.UTC(2026, 9, 14, 9);
function make(platform: Platform, count: number): Conversation[] {
  return Array.from({ length: count }, (_, i) => {
    const title = i < TITLES.length ? TITLES[(i + (platform === 'claude' ? 3 : 0)) % TITLES.length] : `${platform === 'chatgpt' ? 'Chat' : 'Claude chat'} #${i}`;
    return { id: `${platform === 'chatgpt' ? 'g' : 'c'}${String(i).padStart(4, '0')}-demo`, platform, title, updatedAt: NOW - i * day / 3, turns: turnsFor(title, i === 0 ? 14 : 2 + (i % 6)) };
  });
}
export const FIXTURES: Record<Platform, Conversation[]> = { chatgpt: make('chatgpt', 230), claude: make('claude', 40) };
FIXTURES.claude[1].turns[0].attachments = [{ name: '需求文档.md', text: '# 需求\n' + '用户希望在 ChatGPT 和 Claude 之间无缝切换。\n'.repeat(40) }, { name: 'notes.txt', text: 'Remember: never auto-send.' }];
