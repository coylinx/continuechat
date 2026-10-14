export type Platform = 'chatgpt' | 'claude';
export const PLATFORMS: Platform[] = ['chatgpt', 'claude'];
export interface ConversationMeta { id: string; platform: Platform; title: string; updatedAt: number; snippet?: string; }
export interface Attachment { name: string; text: string; }
export interface Turn { role: 'user' | 'assistant'; text: string; attachments?: Attachment[]; }
export interface Conversation extends ConversationMeta { turns: Turn[]; }
/** Stored record: turns undefined = only metadata indexed so far. fetchedAt = when turns were last fetched. */
export interface StoredConversation extends ConversationMeta { key: string; turns?: Turn[]; fetchedAt?: number; }
/** Stored record without turns — what lists and the panel need (keeps messages small). */
export interface MetaRow extends ConversationMeta { key: string; turnCount: number; }
export interface Folder { id: string; name: string; createdAt: number; conversationKeys: string[]; }
export interface Pin { key: string; pinnedAt: number; }
export type LicenseStatus = 'none' | 'active' | 'invalid' | 'grace' | 'expired';
export interface LicenseState { status: LicenseStatus; key?: string; instanceId?: string; validatedAt?: number; message?: string; }
export interface SearchHit { key: string; title: string; platform: Platform; score: number; snippet: string; terms: string[]; }
export interface Backup { app: 'ContinueChat'; kind: 'backup'; version: 2; exportedAt: string; conversations: StoredConversation[]; folders: Folder[]; pins: Pin[]; }
export const convKey = (p: Platform, id: string) => `${p}:${id}`;
export const PLATFORM_LABEL: Record<Platform, string> = { chatgpt: 'ChatGPT', claude: 'Claude' };
export const NEW_CHAT_URL: Record<Platform, string> = { chatgpt: 'https://chatgpt.com/', claude: 'https://claude.ai/new' };
export const conversationUrl = (p: Platform, id: string) => (p === 'chatgpt' ? `https://chatgpt.com/c/${id}` : `https://claude.ai/chat/${id}`);
export const isPlatform = (p: unknown): p is Platform => p === 'chatgpt' || p === 'claude';
