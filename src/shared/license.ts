import { LICENSE_PROXY_ORIGIN, OFFLINE_GRACE_DAYS } from './config';
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

async function call(path: '/activate' | '/validate', body: object) {
  const r = await fetch(LICENSE_PROXY_ORIGIN + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) as { valid?: boolean; instanceId?: string; status?: string; error?: string } };
}

export async function activate(key: string): Promise<LicenseState> {
  try {
    const { data } = await call('/activate', { key, instanceName: 'continuechat-' + crypto.randomUUID().slice(0, 8) });
    const s: LicenseState = data.valid && data.instanceId
      ? { status: 'active', key, instanceId: data.instanceId, validatedAt: Date.now() }
      : { status: 'invalid', key, message: data.error ?? data.status ?? 'invalid' };
    await setLicense(s); return s;
  } catch { return { status: 'invalid', key, message: 'network' }; }
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
