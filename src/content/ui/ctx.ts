import type { PlatformAdapter } from '../adapters/types';
import { SiteError } from '../adapters/types';
import { t, type MsgKey } from '../../shared/i18n';
import { PLATFORM_LABEL, type Conversation } from '../../shared/types';
/** What the panel's dialogs need from the panel. */
export interface Ctx {
  a: PlatformAdapter; other: PlatformAdapter;
  /** Fetches the open chat from the site and saves it locally (null when no chat is open). */
  loadCurrent(): Promise<Conversation | null>;
  refresh(): void;
}
const CODE_MSG: Record<SiteError['code'], MsgKey> = { auth: 'errAuth', org: 'errAuth', rate: 'errRate', net: 'errNet', http: 'errHttp' };
/** Human explanation of a failed site request. */
export function errText(e: unknown, a: PlatformAdapter) {
  return e instanceof SiteError ? t(CODE_MSG[e.code], { site: PLATFORM_LABEL[a.platform] }) : t('errGeneric');
}
export function download(name: string, mime: string, data: BlobPart) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}
export const splitKey = (key: string) => { const i = key.indexOf(':'); return [key.slice(0, i), key.slice(i + 1)] as const; };
