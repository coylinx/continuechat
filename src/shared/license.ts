import { LICENSE_PROXY_ORIGIN, OFFLINE_GRACE_DAYS, REVALIDATE_EVERY_DAYS } from './config';
import type { LicenseState } from './types';
const DAY = 86_400_000;
export const KEY = 'license';
export async function getLicense(): Promise<LicenseState> {
  return ((await chrome.storage.local.get(KEY))[KEY] as LicenseState) ?? { status: 'none' };
}
export async function setLicense(s: LicenseState) { await chrome.storage.local.set({ [KEY]: s }); }

/** Premium if last successful validation is within the offline grace window. Never touches user data. */
export function isPremium(s: LicenseState, now = Date.now()) {
  return (s.status === 'active' || s.status === 'grace') && !!s.validatedAt && now - s.validatedAt <= OFFLINE_GRACE_DAYS * DAY;
}
export const needsRevalidation = (s: LicenseState, now = Date.now()) => !!s.key && !!s.instanceId && (!s.validatedAt || now - s.validatedAt >= REVALIDATE_EVERY_DAYS * DAY);

type ProxyRes = { valid?: boolean; instanceId?: string; status?: string; error?: string };
async function call(path: '/activate' | '/validate' | '/deactivate', body: object) {
  const r = await fetch(LICENSE_PROXY_ORIGIN + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) as ProxyRes };
}

export type ActivateError = 'invalid' | 'unavailable' | 'network';
export interface ActivateResult { ok: boolean; state: LicenseState; error?: ActivateError; message?: string; }
/** Only a successful activation is saved: a typo (or a proxy outage) never overwrites a working license. */
export async function activate(key: string): Promise<ActivateResult> {
  const prev = await getLicense();
  try {
    const { ok, data } = await call('/activate', { key, instanceName: 'continuechat-' + crypto.randomUUID().slice(0, 8) });
    if (!ok) return { ok: false, state: prev, error: 'unavailable', message: data.error };
    if (!data.valid || !data.instanceId) return { ok: false, state: prev, error: 'invalid', message: data.error ?? data.status ?? 'invalid' };
    const s: LicenseState = { status: 'active', key, instanceId: data.instanceId, validatedAt: Date.now() };
    await setLicense(s); return { ok: true, state: s };
  } catch { return { ok: false, state: prev, error: 'network' }; }
}

/** Periodic revalidation; network failure -> keep grace until window expires. */
export async function revalidate(): Promise<LicenseState> {
  const s = await getLicense();
  if (!s.key || !s.instanceId) return s;
  let next: LicenseState;
  try {
    const { ok, data } = await call('/validate', { key: s.key, instanceId: s.instanceId });
    if (ok && data.valid) next = { ...s, status: 'active', validatedAt: Date.now(), message: undefined };
    else if (ok) next = { ...s, status: 'invalid', message: data.status };
    else throw new Error('proxy ' + data.error);
  } catch {
    next = { ...s, status: isPremium(s) ? 'grace' : 'expired' };
  }
  await setLicense(next); return next;
}

/** Frees this browser's activation slot (best effort — an old proxy without /deactivate is fine), then forgets the key. */
export async function deactivate(): Promise<LicenseState> {
  const s = await getLicense();
  if (s.key && s.instanceId) await call('/deactivate', { key: s.key, instanceId: s.instanceId }).catch(() => null);
  const none: LicenseState = { status: 'none' }; await setLicense(none); return none;
}
