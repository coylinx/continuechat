import type { Conversation, ConversationMeta, Platform } from '../../shared/types';
export interface ListPage {
  metas: ConversationMeta[];
  /** Raw items on this page before client-side filtering (e.g. archived) — drives the offset. */
  count: number;
}
export interface PlatformAdapter {
  platform: Platform;
  listConversations(offset: number, limit: number): Promise<ListPage>;
  getConversation(id: string): Promise<Conversation>;
  currentConversationId(): string | null;
  conversationUrl(id: string): string;
  getInputBox(): HTMLElement | null;
  /** Fills the composer only. NEVER clicks send. */
  prefill(text: string): boolean;
  sidebarAnchors: string[];
  newChatUrl: string;
}

export type SiteErrorCode = 'auth' | 'rate' | 'http' | 'net' | 'org';
export class SiteError extends Error {
  constructor(public code: SiteErrorCode, message: string) { super(message); this.name = 'SiteError'; }
}
/** fetch → JSON with errors mapped to SiteError codes the UI can explain. */
export async function fetchJSON<T>(site: string, url: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try { r = await fetch(url, { credentials: 'include', ...init }); } catch (e) { throw new SiteError('net', `${site} ${url}: ${(e as Error).message}`); }
  if (r.status === 401 || r.status === 403) throw new SiteError('auth', `${site} ${url} → ${r.status}`);
  if (r.status === 429) throw new SiteError('rate', `${site} ${url} → 429`);
  if (!r.ok) throw new SiteError('http', `${site} ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

export interface PageOpts { pageSize: number; maxPages: number; delayMs?: number; onPage: (metas: ConversationMeta[], total: number) => Promise<void> | void; }
/** Walks list pages until a short page, maxPages, or a page with nothing new (guards APIs that ignore offset). */
export async function forEachPage(list: (offset: number, limit: number) => Promise<ListPage>, o: PageOpts) {
  const seen = new Set<string>(); let offset = 0;
  for (let p = 0; p < o.maxPages; p++) {
    if (p && o.delayMs) await new Promise((r) => setTimeout(r, o.delayMs));
    const page = await list(offset, o.pageSize);
    const fresh = page.metas.filter((m) => !seen.has(m.id)); fresh.forEach((m) => seen.add(m.id));
    if (fresh.length) await o.onPage(fresh, seen.size);
    if (page.count < o.pageSize) break;
    if (page.metas.length && !fresh.length) break; // offset ignored → same page again
    offset += page.count;
  }
  return seen.size;
}

export const firstMatch = (sels: string[]) => { for (const s of sels) { const el = document.querySelector<HTMLElement>(s); if (el) return el; } return null; };
/** Verified on both sites (Oct 13): focus + execCommand('insertText') updates ProseMirror and enables send. */
export function setInputText(el: HTMLElement, text: string) {
  if (el instanceof HTMLTextAreaElement) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true })); return true;
  }
  el.focus();
  const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(el); sel?.removeAllRanges(); sel?.addRange(r);
  return document.execCommand('insertText', false, text);
}
export const inputText = (el: HTMLElement) => (el instanceof HTMLTextAreaElement ? el.value : el.textContent ?? '');

/** Same-site chat: click the site's own sidebar link when present (SPA navigation, no reload); otherwise load it.
 *  Other site: new tab, so the current chat stays open. */
export function openUrl(url: string) {
  const u = new URL(url);
  if (u.origin !== location.origin) { window.open(url, '_blank', 'noopener'); return; }
  if (u.pathname === location.pathname) return;
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find((l) => l.origin === u.origin && l.pathname === u.pathname);
  if (link) link.click(); else location.assign(url);
}
