import type { ConversationMeta, Folder, LicenseState, StoredConversation, Conversation } from './types';
import type { Gate } from './paywall';
/** Typed request/response map for content/popup -> background messages. All IndexedDB lives in the extension origin. */
export interface RpcMap {
  'license:activate': { req: { key: string }; res: LicenseState };
  'license:get': { req: {}; res: LicenseState & { premium: boolean } };
  'license:deactivateLocal': { req: {}; res: LicenseState };
  'db:upsertConversation': { req: { conversation: Conversation }; res: void };
  'db:upsertMetas': { req: { metas: ConversationMeta[] }; res: void };
  'db:listStored': { req: {}; res: StoredConversation[] };
  'db:listFolders': { req: {}; res: Folder[] };
  'db:createFolder': { req: { name: string }; res: { ok: true; folder: Folder } | { ok: false; paywall: 'folder' } };
  'db:deleteFolder': { req: { id: string }; res: void };
  'db:setInFolder': { req: { folderId: string; key: string; inFolder: boolean }; res: void };
  'db:listPins': { req: {}; res: { key: string; pinnedAt: number }[] };
  'db:togglePin': { req: { key: string }; res: void };
  'db:search': { req: { query: string }; res: { key: string; title: string; platform: string; score: number }[] };
  'usage:get': { req: {}; res: { used: number; limit: number; premium: boolean } };
  /** Atomic check + increment of the shared monthly continue counter. */
  'usage:consumeContinue': { req: {}; res: { ok: boolean; used: number } };
  'paywall:canUse': { req: { gate: Gate }; res: boolean };
  'ui:openOptions': { req: {}; res: void };
}
export type RpcType = keyof RpcMap;
export type RpcRequest = { [K in RpcType]: { type: K } & RpcMap[K]['req'] }[RpcType];
type Wire<T> = { ok: true; data: T } | { ok: false; error: string };
export async function rpc<K extends RpcType>(type: K, req: RpcMap[K]['req'] = {} as RpcMap[K]['req']): Promise<RpcMap[K]['res']> {
  const r = (await chrome.runtime.sendMessage({ type, ...req })) as Wire<RpcMap[K]['res']> | undefined;
  if (!r) throw new Error(`rpc ${type}: no response`);
  if (!r.ok) throw new Error(r.error);
  return r.data;
}
export type Handlers = { [K in RpcType]: (req: Extract<RpcRequest, { type: K }>) => Promise<RpcMap[K]['res']> };
