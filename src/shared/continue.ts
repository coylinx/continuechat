import { ATTACHMENT_CHAR_CAP, DEFAULT_CONTINUE_CHAR_BUDGET, DEFAULT_CONTINUE_TURNS, type ContinueTurns } from './config';
import type { Attachment, Conversation, Turn } from './types';
/** Text that goes to the other AI. Follows the UI language so the reply language matches the user's. */
export interface ContextLabels { header: (turns: number, title: string) => string; footer: string; user: string; ai: string; trimmed: string; fileTruncated: string; }
export const EN_CONTEXT_LABELS: ContextLabels = {
  header: (n, title) => `Context from my earlier chat "${title}" (last ${n} turn${n === 1 ? '' : 's'}):`,
  footer: 'Please continue from here.', user: 'User', ai: 'AI', trimmed: '…[earlier context trimmed]', fileTruncated: '…[file truncated]',
};
export interface ContinueOpts {
  turns?: ContinueTurns; charBudget?: number; mode?: 'lastN' | 'summary'; labels?: ContextLabels;
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
function turnText(t: Turn, idx: number, l: ContextLabels, ex?: Set<string>) {
  let s = '';
  for (const a of t.attachments ?? []) {
    if (ex?.has(attachmentId(idx, a))) continue;
    const body = a.text.length > ATTACHMENT_CHAR_CAP ? a.text.slice(0, ATTACHMENT_CHAR_CAP) + l.fileTruncated : a.text;
    s += `[${a.name}]\n${body}\n`;
  }
  return s + `${t.role === 'user' ? l.user : l.ai}:\n${t.text}\n\n`;
}
const shortTitle = (s: string) => (s.length > 80 ? s.slice(0, 79) + '…' : s);
export function buildContext(c: Conversation, o: ContinueOpts = {}): ContinueResult {
  if (o.mode === 'summary') throw new Error('TODO: summary mode not implemented');
  const l = o.labels ?? EN_CONTEXT_LABELS;
  const n = o.turns ?? DEFAULT_CONTINUE_TURNS, budget = o.charBudget ?? DEFAULT_CONTINUE_CHAR_BUDGET;
  const start = n === 'all' ? 0 : Math.max(0, c.turns.length - n);
  const header = `${l.header(c.turns.length - start, shortTitle(c.title))}\n\n`;
  const footer = l.footer; const mark = `${l.trimmed}\n\n`;
  const parts = c.turns.slice(start).map((t, i) => turnText(t, start + i, l, o.excludeAttachments));
  const bodyLen = parts.reduce((n, p) => n + p.length, 0);
  const fullLength = header.length + bodyLen + footer.length;
  const overflow = Math.max(0, fullLength - budget);
  // Trim from the EARLIEST content at safe boundaries: whole turns first, then whole blocks
  // (paragraphs / complete tables / complete ``` code blocks) — never splits a code block or table row.
  const room = budget - header.length - footer.length - mark.length;
  const kept = parts.slice(); let len = bodyLen;
  while (overflow && kept.length && len > room) {
    const need = len - room;
    if (kept.length > 1 && kept[0].length <= need) { len -= kept.shift()!.length; continue; }
    const t = trimBlocks(kept[0], Math.max(0, kept[0].length - need)); len += t.length - kept[0].length; kept[0] = t; break;
  }
  const keptText = (overflow ? mark : '') + kept.join('');
  const text = header + keptText + footer;
  return { text, fullLength, budget, overflow, trimmedChars: overflow ? bodyLen - kept.join('').length : 0,
    includedTurns: c.turns.length - start, omittedTurns: start, totalTurns: c.turns.length };
}

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
  const pre = fence && !tail.startsWith(fence) ? fence + '\n' : '';
  const keep = Math.max(0, room - pre.length); // (slice(-0) would keep everything)
  return pre + tail.slice(Math.max(0, tail.length - keep));
}

/** Merge consecutive same-role messages (e.g. an answer split around tool calls) into one turn; drop empty ones. */
export function normalizeTurns(turns: Turn[]): Turn[] {
  const out: Turn[] = [];
  for (const t of turns) {
    if (!t.text && !t.attachments?.length) continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === t.role) {
      prev.text = [prev.text, t.text].filter(Boolean).join('\n\n');
      if (t.attachments?.length) prev.attachments = [...(prev.attachments ?? []), ...t.attachments];
    } else out.push(t.attachments?.length ? { role: t.role, text: t.text, attachments: [...t.attachments] } : { role: t.role, text: t.text });
  }
  return out;
}
