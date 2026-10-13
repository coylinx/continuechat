export type Platform = 'chatgpt' | 'claude';
export interface ConversationMeta { id: string; platform: Platform; title: string; updatedAt: number; snippet?: string; }
export interface Attachment { name: string; text: string; }
export interface Turn { role: 'user' | 'assistant'; text: string; attachments?: Attachment[]; }
export interface Conversation extends ConversationMeta { turns: Turn[]; }
/** Stored record: turns undefined = only metadata indexed so far. */
export interface StoredConversation extends ConversationMeta { key: string; turns?: Turn[]; }
export interface Folder { id: string; name: string; createdAt: number; conversationKeys: string[]; }
export type LicenseStatus = 'none' | 'active' | 'invalid' | 'grace' | 'expired';
export interface LicenseState { status: LicenseStatus; key?: string; instanceId?: string; validatedAt?: number; message?: string; }
export const convKey = (p: Platform, id: string) => `${p}:${id}`;
export const PLATFORM_LABEL: Record<Platform, string> = { chatgpt: 'ChatGPT', claude: 'Claude' };
