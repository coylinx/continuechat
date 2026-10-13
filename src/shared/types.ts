export type Platform = 'chatgpt' | 'claude';
export interface ConversationMeta { id: string; platform: Platform; title: string; updatedAt: number; }
export interface Turn { role: 'user' | 'assistant'; text: string; }
export interface Conversation extends ConversationMeta { turns: Turn[]; }
export interface Folder { id: string; name: string; createdAt: number; conversationKeys: string[]; }
export type LicenseStatus = 'none' | 'active' | 'invalid' | 'grace' | 'expired';
export interface LicenseState { status: LicenseStatus; key?: string; instanceId?: string; validatedAt?: number; message?: string; }
export type Msg =
  | { type: 'license:activate'; key: string }
  | { type: 'license:get' }
  | { type: 'license:deactivateLocal' };
export const convKey = (p: Platform, id: string) => `${p}:${id}`;
