/** Search text helpers shared by the background index and the panel (no MiniSearch import here). */
// Chinese/Japanese have no spaces between words, so the default tokenizer turns a whole sentence into one
// token and a word in the middle of it can never match. Index overlapping character bigrams instead.
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const RUNS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;
const SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u; // MiniSearch's default separator

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const word of text.split(SPACE_OR_PUNCTUATION)) {
    if (!word) continue;
    for (const [run] of word.matchAll(RUNS)) {
      if (!CJK_CHAR.test(run[0])) out.push(run);
      else if (run.length === 1) out.push(run);
      else for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
    }
  }
  return out;
}

/** ~width chars of body around the earliest matched term (whitespace collapsed). */
export function makeSnippet(body: string, terms: string[], width = 140): string {
  const flat = body.replace(/\s+/g, ' ').trim(); if (!flat) return '';
  const low = flat.toLowerCase(); let at = -1;
  for (const t of terms) { const i = t ? low.indexOf(t.toLowerCase()) : -1; if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return flat.length > width ? flat.slice(0, width).trimEnd() + '…' : flat;
  const start = Math.max(0, at - 40), end = Math.min(flat.length, start + width);
  return (start > 0 ? '…' : '') + flat.slice(start, end).trim() + (end < flat.length ? '…' : '');
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Splits text into [plain, match, plain, match, …]; odd indexes are matches. Escape each part when rendering. */
export function splitHighlights(text: string, terms: string[]): string[] {
  const ts = [...new Set(terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0))].sort((a, b) => b.length - a.length);
  if (!ts.length) return [text];
  return text.split(new RegExp(`(${ts.map(escRe).join('|')})`, 'iu'));
}
