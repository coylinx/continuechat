import { CONTINUE_BUDGET_OPTIONS, CONTINUE_TURN_OPTIONS, DEFAULT_CONTINUE_CHAR_BUDGET, DEFAULT_CONTINUE_TURNS, type ContinueTurns } from './config';
export type LangSetting = 'auto' | 'en' | 'zh';
export interface Settings {
  continueTurns: ContinueTurns;
  continueBudget: number;
  /** Save the text of chats the user opens so search finds words inside them (local only). */
  indexOnOpen: boolean;
  lang: LangSetting;
}
export const DEFAULT_SETTINGS: Settings = { continueTurns: DEFAULT_CONTINUE_TURNS, continueBudget: DEFAULT_CONTINUE_CHAR_BUDGET, indexOnOpen: true, lang: 'en' };
const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

/** Validates whatever is in storage, so a bad value can never break the UI. */
export function sanitizeSettings(raw: Record<string, unknown>): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if ((CONTINUE_TURN_OPTIONS as readonly unknown[]).includes(raw.continueTurns)) s.continueTurns = raw.continueTurns as ContinueTurns;
  if ((CONTINUE_BUDGET_OPTIONS as readonly unknown[]).includes(raw.continueBudget)) s.continueBudget = raw.continueBudget as number;
  if (typeof raw.indexOnOpen === 'boolean') s.indexOnOpen = raw.indexOnOpen;
  if (raw.lang === 'en' || raw.lang === 'zh' || raw.lang === 'auto') s.lang = raw.lang;
  return s;
}
export async function getSettings(): Promise<Settings> { return sanitizeSettings(await chrome.storage.local.get(KEYS)); }
export async function setSettings(p: Partial<Settings>) { await chrome.storage.local.set(p); }
