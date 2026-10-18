# ContinueChat (MV3)

AI chat organizer for ChatGPT and Claude. Main feature: continue a chat on the other platform (export context + prefill input; no true import, never auto-sends). Name/icon contain no ChatGPT/Claude marks. UI in English and 简体中文 (follows the browser; switchable in Settings).

## Structure
```
manifest.json            source manifest (__LICENSE_PROXY__ + version filled at build; __MSG_*__ from public/_locales)
scripts/                 build.mjs (cross-platform build), pack.mjs (release zip), test.mjs (runs tests/*.test.ts), config.mjs (proxy origin for manifest)
vite.config.ts           pages (popup/options/print) + background; content scripts built separately as IIFE
src/shared/              config, settings, i18n (en/zh), types, db (IndexedDB + MiniSearch w/ CJK bigram tokenizer), search (tokenizer/snippets),
                         license, paywall, continue (last-N + block-safe trimming), export (MD/JSON/printable HTML), markdown (escape-first renderer), zip, rpc
src/background/          handlers.ts (all RPCs, incl. continue:open = consume + open tab + per-tab prefill), index.ts (listeners, revalidation alarm)
src/content/adapters/    PlatformAdapter + chatgpt / claude (pure parse functions are unit-tested), pagination helper, typed SiteError
src/content/ui/          mount (Shadow DOM, sidebar or floating), panel, continue dialog, export wizard, paywall, layer (body-level modals/toasts), theme
src/content/prefill.ts   target tab: fill composer, verify, toast; "Copy context" fallback if the composer can't be filled
src/popup, src/options   popup (quota, quick links), settings (continue defaults, search, language, license, backup/import/wipe, about)
src/print                printable export page (extension page, so the site's CSP can't interfere) → browser "Save as PDF"
dev/                     local harness: fake ChatGPT/Claude pages + chrome.* mock running the REAL UI/background code on fixtures
tests/                   continue, search (CJK), export/markdown/zip, adapters (branches, pagination), db (fake-indexeddb), license, i18n
license-proxy/           Cloudflare Worker → Creem license API
site/                    privacy policy page (also copied into the extension as privacy.html)
site/www/                product site https://continuechat.coylin.com (landing + pricing, /privacy, /terms); `bash site/deploy.sh` → nginx on the sg host,
                         config in site/nginx/ (certbot webroot, cert-name continuechat.coylin.com)
```

## Build & load
```
npm install
npm run build        # typecheck + build → dist/   (works on Windows cmd/PowerShell and POSIX shells)
npm test             # 66 tests, Node only
npm run pack         # build + release/continuechat-v<version>.zip + release/unpacked/
```
Chrome → chrome://extensions → Developer mode → Load unpacked → `dist/` (or `release/unpacked/`).
Version comes from package.json. Change the proxy domain in `src/shared/config.ts` AND `scripts/config.mjs`.

## Dev harness (no real sites)
`npm run dev` → http://localhost:5179/chatgpt/ or http://localhost:5179/claude/new — a fake site with a sidebar and a ProseMirror-like composer.
The real content script, background handlers (IndexedDB), popup (`/dev/popup.html`), options (`/dev/options.html`) and print page run against
fixture chats (230 ChatGPT / 40 Claude, mixed EN/中文, long code/table answers, attachments). "Continue" opens the other fake site and prefills it.
Toolbar: collapse sidebar (→ floating panel), dark theme, reset data. URL flags: `?fail=auth|rate|net` (sync errors), `?nobox` (no composer → copy fallback).
chatgpt.com / claude.ai are never contacted; external tabs are blocked by the mock.

## Rules
Free: 5 folders, pin, local search, 3 continue-chat/month (month key resets on the 1st). Premium ($4.99/mo / $39 lifetime, Creem license): unlimited folders & continue, bulk Markdown/PDF export. Paywall at 4th continue, 6th folder, multi-chat Markdown/PDF (multi-chat JSON stays free). Offline grace 7 days; expiry only locks premium, never deletes data. A continue is counted only when the target tab actually opened (refunded otherwise).

## Behaviour notes
- Sync: first visit per site walks all list pages (≤30×100, 400 ms apart); later page loads read the newest page; "Sync" re-walks all. Pagination stops on a short page or when a page brings nothing new (guards an endpoint that ignores `offset`).
- Search: titles + the full text of chats you open (setting "save the text of chats I open", default on, local only). Chinese/Japanese are indexed as character bigrams, so words inside sentences match; results show highlighted snippets. Index is updated in place.
- Continue context follows the UI language (header/labels), includes the chat title, fits the budget (8k/12k/24k/48k chars, default 12k) by trimming whole turns/blocks from the start, never splitting code blocks or table rows.
- Prefill: the new tab waits for the composer, fills it, verifies the text landed, refills once only if an editor re-mount emptied it, shows a toast; after 45 s without success it offers "Copy context".
- Keys typed in the panel don't reach the site's global shortcuts (events stop at the shadow root). Modals/toasts live in a body-level layer.
- License: only a successful activation is saved (a typo or proxy outage never overwrites a working license). "Remove license" calls `/deactivate` (best effort) to free the activation slot. Revalidated every 3 days via alarm, and on browser start when due.
- Backup: Settings → Export backup (chats + folders + pins, v2) / Import backup (also accepts the old "export all chats" JSON); import merges, never deletes.

## Verified (real sites, Oct 13)
- ChatGPT: /api/auth/session token, /backend-api/conversations, /backend-api/conversation/{id}; sidebar nav[aria-label="Chat history"]; composer div.ProseMirror[role=textbox] + execCommand insertText.
- Claude: /api/organizations (chat-capable org), chat_conversations list + detail (tree=True&rendering_mode=messages, attachments.extracted_content); sidebar aside[aria-label="Sidebar"] / data-testid sidebar*; composer div[data-testid="chat-input"].ProseMirror.
- Since then everything was verified only in the dev harness + unit tests (Oct 14), not on the live sites.

## Still unverified / TODO
- On the live sites: panel placement inside the current sidebars, prefill in a freshly opened tab, the print page.
- ChatGPT pagination past 100 (offset param used before) and Claude list `offset` (unverified; the stop-guard makes it safe). Claude `current_leaf_message_uuid` and the `lastActiveOrg` cookie (used only when present).
- Summary mode (stub). Chats deleted on the site stay in the local index.
- Creem response fields vs live sandbox; checkout URLs are placeholders (`src/shared/config.ts`) — Upgrade shows "checkout not open yet" until set.
- Storage lives in the background service worker (typed RPC, `src/shared/rpc.ts`); continue counter shared: 3/month total.

## License proxy deployment
Deployed (Oct 13) to https://continuechat-license-proxy.costacruz896.workers.dev — no CREEM_API_KEY yet, so POST /activate|/validate return 503 "license service not configured"; GET /health reports `configured`. Base: test-api.creem.io. Set key later: `wrangler secret put CREEM_API_KEY`. Restrict CORS by setting ALLOWED_EXTENSION_IDS once the store extension ID is known.
`/deactivate` was added Oct 14 and is NOT deployed yet (`cd license-proxy && npx wrangler deploy`); until then "Remove license" just forgets the key locally.
