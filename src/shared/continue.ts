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
    s += `[${a.name}]\n${body}\n`;
  }
  return s + `${t.role === 'user' ? 'User' : 'AI'}:\n${t.text}\n\n`;
}
export function buildContext(c: Conversation, o: ContinueOpts = {}): ContinueResult {
  if (o.mode === 'summary') throw new Error('TODO: summary mode not implemented');
  const n = o.turns ?? DEFAULT_CONTINUE_TURNS, budget = o.charBudget ?? DEFAULT_CONTINUE_CHAR_BUDGET;
  const start = n === 'all' ? 0 : Math.max(0, c.turns.length - n);
  const header = `Context from my earlier chat (last ${c.turns.length - start} turns):\n\n`;
  const footer = `Please continue from here.`;
  const parts = c.turns.slice(start).map((t, i) => turnText(t, start + i, o.excludeAttachments));
  const bodyLen = parts.reduce((n, p) => n + p.length, 0);
  const fullLength = header.length + bodyLen + footer.length;
  const overflow = Math.max(0, fullLength - budget);
  // Trim from the EARLIEST content at safe boundaries: whole turns first, then whole blocks
  // (paragraphs / complete tables / complete ``` code blocks) — never splits a code block or table row.
  const room = budget - header.length - footer.length - MARK.length;
  let kept = parts.slice(); let len = bodyLen;
  while (overflow && kept.length && len > room) {
    const need = len - room;
    if (kept.length > 1 && kept[0].length <= need) { len -= kept.shift()!.length; continue; }
    const t = trimBlocks(kept[0], Math.max(0, kept[0].length - need)); len += t.length - kept[0].length; kept[0] = t; break;
  }
  const keptText = (overflow ? MARK : '') + kept.join('');
  const text = header + keptText + footer;
  return { text, fullLength, budget, overflow, trimmedChars: overflow ? bodyLen - kept.join('').length : 0,
    includedTurns: c.turns.length - start, omittedTurns: start, totalTurns: c.turns.length };
}

const MARK = '…[earlier context trimmed]\n\n';
/** Split into blocks keeping fenced code blocks atomic; tables/paragraphs split on blank lines. */
export function splitBlocks(s: string): string[] {
  const out: string[] = []; let buf: string[] = []; let inFence = false;
  for (const line of s.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    buf.push(line);
    if (!inFence && line.trim() === '') { out.push(buf.join('\n') + '\n'); buf = []; }
  }
  if (buf.length) out.push(buf.join('\n'));
  return out;
}
function trimBlocks(s: string, room: number) {
  const blocks = splitBlocks(s); let len = s.length;
  while (blocks.length > 1 && len > room) len -= blocks.shift()!.length;
  if (len <= room) return blocks.join('');
  // Single oversized block: cut on line boundaries from the start, re-open a fence if we cut inside one.
  const b = blocks[0]; const lines = b.split('\n'); const fence = /^\s*```/.test(lines[0]) ? lines[0] : '';
  let tail = b; while (tail.length + fence.length + 1 > room && tail.includes('\n')) tail = tail.slice(tail.indexOf('\n') + 1);
  return (fence && !tail.startsWith(fence) ? fence + '\n' : '') + tail.slice(-room);
}
