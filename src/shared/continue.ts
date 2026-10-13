import { DEFAULT_CONTINUE_CHAR_BUDGET, DEFAULT_CONTINUE_TURNS } from './config';
import type { Conversation } from './types';
export interface ContinueOpts { turns?: number; charBudget?: number; mode?: 'lastN' | 'summary'; }
/** Builds a prefill prompt from the last N turns, truncated to a char budget (oldest dropped first). */
export function buildContext(c: Conversation, o: ContinueOpts = {}) {
  if (o.mode === 'summary') throw new Error('TODO: summary mode not implemented');
  const n = o.turns ?? DEFAULT_CONTINUE_TURNS, budget = o.charBudget ?? DEFAULT_CONTINUE_CHAR_BUDGET;
  const header = `Continuing a previous conversation "${c.title}". Recent context:\n\n`;
  const footer = `\n\nPlease continue from here.`;
  const picked: string[] = []; let used = header.length + footer.length; let dropped = 0;
  const recent = c.turns.slice(-n);
  for (let i = recent.length - 1; i >= 0; i--) {
    const t = recent[i]; let s = `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}\n\n`;
    if (used + s.length > budget) {
      if (picked.length === 0) s = s.slice(0, budget - used - 20) + '…[truncated]\n\n'; else { dropped = i + 1; break; }
    }
    picked.unshift(s); used += s.length;
  }
  return { text: header + picked.join('') + footer, includedTurns: picked.length, droppedTurns: dropped + (c.turns.length - recent.length) };
}
