import type { Conversation, Platform, Turn } from '../src/shared/types';
// Realistic English chats for store screenshots (`?showcase` once per browser profile; see dev/fixtures.ts).
// The first ChatGPT chat is the one the screenshots open; the rest only fill the sidebars and search.
const KYOTO: Turn[] = [
  { role: 'user', text: 'Plan a 2-day trip to Kyoto in early April. I like temples, food markets and quiet walks, not crowds.' },
  { role: 'assistant', text: 'Early April is cherry blossom season, so the trick is timing: famous spots early, quiet ones at midday.\n\nDay 1 — Higashiyama\n- 6:30 Kiyomizu-dera before the tour buses\n- Walk Sannenzaka and Ninenzaka down to Yasaka Shrine\n- Lunch: Nishiki Market (go before 11:30)\n- Afternoon: Kennin-ji, then tea in Gion\n\nDay 2 — Arashiyama & north\n- 7:00 bamboo grove, then Okochi-Sanso garden\n- Lunch: yudofu near Tenryu-ji\n- Afternoon: Philosopher\'s Path to Honen-in — quieter than it looks on maps' },
  { role: 'user', text: 'Day 2 has too much walking for my mom. Can you make it easier?' },
  { role: 'assistant', text: 'Sure — same highlights, about half the walking:\n\n- Take a taxi straight to the north end of the bamboo grove and walk only the best 300 m\n- Ride the Sagano Romantic Train to Kameoka instead of the garden climb\n- Lunch near the station, then a short taxi to Honen-in\n- Finish at a café on the canal rather than walking the full path\n\nTotal on foot: roughly 4 km instead of 9 km.' },
  { role: 'user', text: 'Great. What should we book in advance?' },
  { role: 'assistant', text: '1. Sagano Romantic Train — seats open one month ahead and sell out in blossom season.\n2. Dinner in Gion — reserve kaiseki 2–3 weeks ahead.\n3. Hotel near Kyoto Station — easiest for taxis and the train back.\n\nEverything else (temples, markets) works without reservations if you start early.' },
];
const turns = (title: string): Turn[] => [
  { role: 'user', text: `${title} — can you help me with this?` },
  { role: 'assistant', text: `Happy to help. Here's a structured way to approach "${title}":\n\n1. Clarify the goal and constraints\n2. List the options and trade-offs\n3. Pick one and define the next small step\n\nTell me a bit more about your situation and I'll make it concrete.` },
  { role: 'user', text: 'Make it concrete for me — short and practical.' },
  { role: 'assistant', text: 'Here is a short, practical version with the first three steps you can do today, plus what to check before moving on.' },
];
const CHATGPT = ['Plan a 2-day trip to Kyoto', 'Refactor auth middleware to async/await', 'Q3 marketing plan outline', 'Explain transformers like I\'m 12',
  'Speed up a slow orders SQL query', 'Cover letter for a product designer role', 'High-protein weekly meal prep', 'Kubernetes rollout strategy', 'Fix flaky Jest tests in CI',
  'Pricing page copy review', 'Summarize a paper on retrieval-augmented generation', 'Small backyard garden layout', 'Zustand vs Redux for a mid-size app',
  'Wedding toast draft', '30-day Spanish learning plan', 'Budget spreadsheet formulas', 'Landing page headline ideas', 'Debug an asyncio deadlock in Python',
  'Birthday party ideas for a 6-year-old', 'Investor update email', 'Onboarding checklist for new hires', 'Choose a standing desk', 'Interview questions for a backend role',
  'Rewrite this email to sound friendlier', 'Weekend hiking trip packing list', 'Explain compound interest with examples'];
const CLAUDE = ['Review my product spec for gaps', 'Kyoto trip — dinner reservations', 'Write unit tests for the parser', 'Tighten the pitch deck narrative',
  'Postgres migration plan', 'Edit blog post: lessons from launch', 'Data retention policy draft', 'Translate release notes to Spanish', 'Meeting notes → action items',
  'Compare three CRM tools', 'Refactor React form validation', 'Plan a team offsite agenda'];
const day = 86_400_000; const NOW = Date.UTC(2026, 9, 18, 9);
const make = (platform: Platform, titles: string[]): Conversation[] => titles.map((title, i) => ({
  id: `${platform === 'chatgpt' ? 'g' : 'c'}${String(i).padStart(4, '0')}-show`, platform, title, updatedAt: NOW - i * day / 2,
  turns: platform === 'chatgpt' && i === 0 ? KYOTO : turns(title),
}));
export const SHOWCASE: Record<Platform, Conversation[]> = { chatgpt: make('chatgpt', CHATGPT), claude: make('claude', CLAUDE) };
