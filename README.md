# ContinueChat (MV3)

AI chat organizer for ChatGPT and Claude. Main feature: continue a chat on the other platform (export context + prefill input; no true import). Name/icon contain no ChatGPT/Claude marks.

## Structure
```
manifest.json            source manifest (__LICENSE_PROXY__ replaced at build)
scripts/config.mjs       LICENSE_PROXY_ORIGIN for manifest (mirror of src/shared/config.ts)
vite.config.ts           pages+background build; content scripts built separately as IIFE
src/shared/              config, types, db (IndexedDB via idb + MiniSearch), license, paywall, continue (last-N + char budget)
src/background/          license activate/get messages, chrome.alarms revalidation every 3 days
src/content/adapters/    PlatformAdapter interface + chatgpt / claude adapters (UNVERIFIED endpoints)
src/content/ui/          Shadow-DOM sidebar mount w/ fallback anchors + MutationObserver, floating fallback; placeholder panel
src/popup, src/options   placeholder UI (本地存储 · 无需注册 badge, remaining uses, license key entry)
license-proxy/           Cloudflare Worker → Creem license API (not deployed)
```

## Build & load
```
npm install && npm run build
```
Chrome → chrome://extensions → Developer mode → Load unpacked → `dist/`.

Proxy (later): `cd license-proxy && npm i && npx wrangler secret put CREEM_API_KEY && npx wrangler dev`. Change the proxy domain in `src/shared/config.ts` AND `scripts/config.mjs`.

## Rules
Free: 5 folders, pin, local search, 3 continue-chat/month (month key resets on the 1st). Premium ($4.99/mo / $39 lifetime, Creem license): unlimited folders & continue, bulk export. Paywall at 4th continue, 6th folder, bulk export. Offline grace 7 days; expiry only locks premium, never deletes data.

## Verified (real sites, Oct 13)
- ChatGPT: /api/auth/session token, /backend-api/conversations, /backend-api/conversation/{id}; sidebar nav[aria-label="Chat history"]; composer div.ProseMirror[role=textbox] + execCommand insertText.
- Claude: /api/organizations (chat-capable org), chat_conversations list + detail (tree=True&rendering_mode=messages, attachments.extracted_content); sidebar aside[aria-label="Sidebar"] / data-testid sidebar*; composer div[data-testid="chat-input"].ProseMirror.

## Still unverified / TODO
- The built extension end-to-end in Chrome (panel placement inside sidebars, prefill handoff after opening a new tab).
- ChatGPT pagination beyond 100; Claude list pagination; Claude branch walking (parent_message_uuid).
- Summary mode (stub). PDF = browser print dialog ("Save as PDF"); bulk export = one combined file, not a zip.
- Creem response fields vs live sandbox; checkout URLs are placeholders (src/shared/config.ts). Icons are placeholders.
- Storage lives in the background service worker (typed RPC, src/shared/rpc.ts); continue counter shared: 3/month total.

## License proxy deployment
Deployed (Oct 13) to https://continuechat-license-proxy.costacruz896.workers.dev — no CREEM_API_KEY yet, so POST /activate|/validate return 503 "license service not configured"; GET /health reports `configured`. Base: test-api.creem.io. Set key later: `wrangler secret put CREEM_API_KEY`. Restrict CORS by setting ALLOWED_EXTENSION_IDS once the store extension ID is known.
