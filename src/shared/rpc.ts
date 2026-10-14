import type { Backup, Conversation, ConversationMeta, Folder, LicenseState, MetaRow, Pin, Platform, SearchHit, StoredConversation } from './types';
import type { ActivateResult } from './license';
import type { Gate } from './paywall';
/** Typed request/response map for content/popup/options -> background messages. All IndexedDB lives in the extension origin. */
export interface RpcMap {
  'license:activate': { req: { key: string }; res: ActivateResult };
  'license:get': { req: {}; res: LicenseState & { premium: boolean } };
  'license:revalidate': { req: {}; res: LicenseState & { premium: boolean } };
  /** Frees the activation slot on the license server (best effort), then forgets the key locally. */
  'license:deactivate': { req: {}; res: LicenseState };
  'db:upsertConversation': { req: { conversation: Conversation }; res: void };
  'db:upsertMetas': { req: { metas: ConversationMeta[] }; res: void };
  /** Rows without turns (newest first). keys = only those. */
  'db:listMetas': { req: { keys?: string[] }; res: MetaRow[] };
  /** Full records (with saved turns) for the given keys. */
  'db:getMany': { req: { keys: string[] }; res: StoredConversation[] };
  'db:listFolders': { req: {}; res: Folder[] };
  'db:createFolder': { req: { name: string }; res: { ok: true; folder: Folder } | { ok: false; paywall: 'folder' } };
  'db:renameFolder': { req: { id: string; name: string }; res: void };
  'db:deleteFolder': { req: { id: string }; res: void };
  'db:setInFolder': { req: { folderId: string; key: string; inFolder: boolean }; res: void };
  'db:listPins': { req: {}; res: Pin[] };
  'db:togglePin': { req: { key: string }; res: void };
  'db:search': { req: { query: string }; res: SearchHit[] };
  'db:stats': { req: {}; res: { conversations: number; withText: number; folders: number; pins: number } };
  'db:exportBackup': { req: {}; res: Backup };
  'db:importBackup': { req: { data: unknown }; res: { conversations: number; folders: number; pins: number } };
  'db:wipeAll': { req: {}; res: void };
  'usage:get': { req: {}; res: { used: number; limit: number; premium: boolean } };
  'paywall:canUse': { req: { gate: Gate }; res: boolean };
  'ui:openOptions': { req: { hash?: string }; res: void };
  /** Atomically uses one continue (shared monthly counter), opens the target site in a new tab and queues the
   *  text for that tab only. The continue is given back if the tab can't be opened. */
  'continue:open': { req: { url: string; text: string; from: Platform }; res: { ok: true } | { ok: false; paywall: 'quota' } };
  /** Called by content script on load; returns queued text for the sender's tab (once). */
  'prefill:take': { req: {}; res: { text: string; from: Platform } | null };
  /** Opens the printable export in an extension tab (immune to the site's CSP) and prints it. */
  'print:open': { req: { html: string }; res: void };
  'print:take': { req: { id: string }; res: string | null };
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
export type Handlers = { [K in RpcType]: (req: Extract<RpcRequest, { type: K }>, sender: chrome.runtime.MessageSender) => Promise<RpcMap[K]['res']> };
/** Bumped (chrome.storage.local "rev") after every data change so open panels/popups in other tabs refresh. */
export const REV_KEY = 'rev';
