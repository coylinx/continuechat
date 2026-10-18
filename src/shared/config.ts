/** Single config constant for the license proxy (also mirrored in scripts/config.mjs for manifest). */
export const LICENSE_PROXY_ORIGIN = 'https://continuechat-license-proxy.costacruz896.workers.dev';
/** Creem payment links (live products "ContinueChat Pro — Monthly" / "— Lifetime"). A link containing "TODO" makes Upgrade explain checkout isn't open yet. */
export const CHECKOUT_MONTHLY_URL = 'https://www.creem.io/payment/prod_1H42djjBKg30qGfZO10tcC';
export const CHECKOUT_LIFETIME_URL = 'https://www.creem.io/payment/prod_37fWKMy4cdjhDTKpyZSrpT';
export const checkoutReady = (url: string) => !url.includes('TODO');
export const PRICE_MONTHLY = '$4.99';
export const PRICE_LIFETIME = '$39';
export const SUPPORT_EMAIL = 'support@coylin.com';
export const FREE_FOLDER_LIMIT = 5;
export const FREE_CONTINUE_PER_MONTH = 3;
export const REVALIDATE_EVERY_DAYS = 3;
export const OFFLINE_GRACE_DAYS = 7;
export const CONTINUE_TURN_OPTIONS = [4, 8, 12, 20, 'all'] as const;
export type ContinueTurns = (typeof CONTINUE_TURN_OPTIONS)[number];
export const DEFAULT_CONTINUE_TURNS: ContinueTurns = 8;
export const DEFAULT_CONTINUE_CHAR_BUDGET = 12000; // per design 03c
export const CONTINUE_BUDGET_OPTIONS = [8000, 12000, 24000, 48000] as const;
export const ATTACHMENT_CHAR_CAP = 4000; // per attachment, before overall budget
/** Conversation list sync: auto-sync reads one page; a manual (or first-ever) sync walks up to SYNC_MAX_PAGES. */
export const SYNC_PAGE_SIZE = 100;
export const SYNC_MAX_PAGES = 30;
export const SYNC_PAGE_DELAY_MS = 400;
/** Prefill handoff to the new tab expires after this long. */
export const PREFILL_TTL_MS = 10 * 60_000;
