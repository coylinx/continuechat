import type { Conversation, ConversationMeta, Platform } from '../../shared/types';
export interface PlatformAdapter {
  platform: Platform;
  listConversations(offset?: number, limit?: number): Promise<ConversationMeta[]>;
  getConversation(id: string): Promise<Conversation>;
  currentConversationId(): string | null;
  conversationUrl(id: string): string;
  getInputBox(): HTMLElement | null;
  /** Fills the composer only. NEVER clicks send. */
  prefill(text: string): boolean;
  sidebarAnchors: string[];
  newChatUrl: string;
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
