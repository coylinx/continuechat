import type { Conversation, ConversationMeta, Platform } from '../../shared/types';
export interface PlatformAdapter {
  platform: Platform;
  /** UNVERIFIED web-internal endpoint */ listConversations(offset?: number, limit?: number): Promise<ConversationMeta[]>;
  /** UNVERIFIED web-internal endpoint */ getConversation(id: string): Promise<Conversation>;
  getInputBox(): HTMLElement | null;
  prefill(text: string): boolean;
  /** Ordered fallback selectors for sidebar anchor. */ sidebarAnchors: string[];
  newChatUrl: string;
}
export function setInputText(el: HTMLElement, text: string) {
  if (el instanceof HTMLTextAreaElement) {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  } else { // contenteditable (ProseMirror) — UNVERIFIED that execCommand is accepted
    el.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, text);
  }
  return true;
}
