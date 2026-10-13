import { ATTACHMENT_CHAR_CAP, DEFAULT_CONTINUE_CHAR_BUDGET, DEFAULT_CONTINUE_TURNS, type ContinueTurns } from './config';
import type { Attachment, Conversation, Turn } from './types';
export interface ContinueOpts {
  turns?: ContinueTurns; charBudget?: number; mode?: 'lastN' | 'summary';
  /** Attachment ids ("turnIndex:name") to exclude. Attachments are text only — files are never uploaded. */
  excludeAttachments?: Set<string>;
}
export interface ContinueResult {
  /** Text actually filled: always fits budget (earliest content trimmed if needed). Never auto-sent. */
  text: string; fullLength: number; budget: number; overflow: number; trimmedChars: number;
  includedTurns: number; omittedTurns: number; totalTurns: number;
}
export const attachmentId = (turnIdx: number, a: Attachment) => `${turnIdx}:${a.name}`;
export function listAttachments(c: Conversation) {
  return c.turns.flatMap((t, i) => (t.attachments ?? []).map((a) => ({ id: attachmentId(i, a), name: a.name, chars: Math.min(a.text.length, ATTACHMENT_CHAR_CAP) })));
}
function turnText(t: Turn, idx: number, ex?: Set<string>) {
  let s = '';
  for (const a of t.attachments ?? []) {
    if (ex?.has(attachmentId(idx, a))) continue;
    const body = a.text.length > ATTACHMENT_CHAR_CAP ? a.text.slice(0, ATTACHMENT_CHAR_CAP) + '…[file truncated]' : a.text;
    s += `[${a.name}] ${body}\n`;
  }
  return s + `${t.role === 'user' ? 'User' : 'AI'}: ${t.text}\n\n`;
}
export function buildContext(c: Conversation, o: ContinueOpts = {}): ContinueResult {
  if (o.mode === 'summary') throw new Error('TODO: summary mode not implemented');
  const n = o.turns ?? DEFAULT_CONTINUE_TURNS, budget = o.charBudget ?? DEFAULT_CONTINUE_CHAR_BUDGET;
  const start = n === 'all' ? 0 : Math.max(0, c.turns.length - n);
  const header = `Context from my earlier chat (last ${c.turns.length - start} turns):\n\n`;
  const footer = `Please continue from here.`;
  const body = c.turns.slice(start).map((t, i) => turnText(t, start + i, o.excludeAttachments)).join('');
  const fullLength = header.length + body.length + footer.length;
  const overflow = Math.max(0, fullLength - budget);
  // Trim from the EARLIEST content, cutting at a line boundary when possible.
  let kept = body;
  if (overflow) { kept = body.slice(overflow + 2); const nl = kept.indexOf('\n'); if (nl >= 0 && nl < 300) kept = kept.slice(nl + 1); kept = '…' + kept; }
  const text = header + kept + footer;
  return { text, fullLength, budget, overflow, trimmedChars: overflow ? body.length - kept.length + 1 : 0,
    includedTurns: c.turns.length - start, omittedTurns: start, totalTurns: c.turns.length };
}
