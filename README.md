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

## UNVERIFIED / TODO
- ChatGPT: `/api/auth/session` token + `/backend-api/conversations`, `/backend-api/conversation/{id}` shapes.
- Claude: `/api/organizations`, `/api/organizations/{org}/chat_conversations[/{id}]` shapes & query params.
- Sidebar anchor selectors and input-box selectors on both sites; ProseMirror prefill via execCommand.
- Char budget (12k) vs real input limits; summary mode is a TODO stub.
- Creem response fields (`status`, `instance.id`) against live sandbox; key status values other than "active".
- Folder / pin / search / bulk export (MD/JSON/PDF) UI not built yet (storage layer only). Icons are placeholders.
- Paywall checks run in content-script origin IndexedDB; usage counters are per-site origin — should move to background/extension origin (TODO).
