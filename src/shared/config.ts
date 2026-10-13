/** Single config constant for the license proxy (also mirrored in scripts/config.mjs for manifest). */
export const LICENSE_PROXY_ORIGIN = 'https://license.continuechat.example';
/** TODO: real Creem checkout links. */
export const CHECKOUT_MONTHLY_URL = 'https://www.creem.io/checkout/TODO_MONTHLY';
export const CHECKOUT_LIFETIME_URL = 'https://www.creem.io/checkout/TODO_LIFETIME';
export const FREE_FOLDER_LIMIT = 5;
export const FREE_CONTINUE_PER_MONTH = 3;
export const REVALIDATE_EVERY_DAYS = 3;
export const OFFLINE_GRACE_DAYS = 7;
export const CONTINUE_TURN_OPTIONS = [4, 8, 12, 20, 'all'] as const;
export type ContinueTurns = (typeof CONTINUE_TURN_OPTIONS)[number];
export const DEFAULT_CONTINUE_TURNS: ContinueTurns = 8;
export const DEFAULT_CONTINUE_CHAR_BUDGET = 12000; // per design 03c
export const ATTACHMENT_CHAR_CAP = 4000; // per attachment, before overall budget
