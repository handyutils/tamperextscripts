# Feature Specification: Community Chat Exporters

**Feature ID:** 010
**Status:** in progress (Claude only)
**Target milestone:** M4

## Goal

Provide one export widget (Markdown, JSON, HTML, plain text, copy, export all)
for each supported chat site, delivered as a standalone userscript in
`community-scripts-registry/<site>chatsexporter/`, matching the ChatGPT
exporter's behavior.

## Shared rules

- Each site has one adapter that fetches and normalizes conversations. The
  widget and serializers are shared and must not depend on the site.
- Only the active branch is exported, and only text the user can see.
- Requests use the user's own session in the page. No data leaves the site
  origin.
- Each adapter's endpoints are undocumented and may change. A failing site
  must show a clear error in the widget, not a silent timeout.

## Site status

| Site | Folder | Status | Known endpoints | Blocker |
| --- | --- | --- | --- | --- |
| ChatGPT | `gptchatsexporter/` | Working (userscript 2.32.1); extension adapter verified on a stubbed page | `/backend-api/conversation/{id}`, `/backend-api/conversations`, `/api/auth/session` | Not verified with a logged-in account |
| Claude | `claudechatsexporter/` | In progress | `/api/organizations/{org}/chat_conversations/{id}?tree=true&rendering_mode=messages&render_all_tools=true` (org from `lastActiveOrg` cookie) | Needs logged-in check |
| Grok | `grokchatsexporter/` | Built (0.1.1); endpoints read from a logged-in page; not yet run end-to-end | `/rest/app-chat/conversations_v2/{id}`, `/rest/app-chat/conversations/{id}/response-node`, POST `/rest/app-chat/conversations/{id}/load-responses`, `/rest/app-chat/conversations` (pageToken) | Needs logged-in export test |
| Mistral (Le Chat) | `mistralchatsexporter/` | Built (0.1.1); endpoints read from a logged-in page; not yet run end-to-end | tRPC GET `chat.byId` (`{json:{id}}`), `message.all` (`{json:{chatId}}`), `chat.last` (paging via date cursor with superjson `meta`) | Needs logged-in export test |
| DeepSeek | `deepseekchatsexporter/` | Blocked on auth design | `/api/v0/chat/history_messages?chat_session_id=`, `/api/v0/chat_session/fetch_page` | Both need the page's bearer token (INVALID_TOKEN / Missing Token). Decide how the userscript obtains it |
| Gemini | `geminichatsexporter/` | Blocked on auth design | `gemini.google.com/_/BardChatUi/data/batchexecute` (rpcids obfuscated) | Calls need the page's anti-CSRF token. Decide how the userscript obtains it; RPC names need mapping |

Sources reviewed: claude-chat-exporter README (Claude endpoints);
search results for Grok, Mistral, and DeepSeek returned only third-party
extensions, not confirmed endpoints.

## Tasks

### Claude (in progress)
- [x] Message tree normalizer, tested against the documented response shape
- [ ] Adapter: org lookup from `lastActiveOrg`, conversation fetch, list for export all
- [ ] Generate `Claude Exporter-<version>.user.js` into `claudechatsexporter/`
- [ ] Verify on a logged-in claude.ai conversation (user)

### Grok
- [x] Endpoints and message shape read from a logged-in grok.com tab
- [x] Normalizer test, adapter, generated userscript (0.1.1)
- [ ] Verify export on a logged-in conversation (user)

### Mistral (Le Chat)
- [x] Endpoints and shapes read from a logged-in page
- [x] Normalizer test, adapter, generated userscript (0.1.1)
- [ ] Verify export on a logged-in chat (user)

### DeepSeek
- [ ] Capture requests on chat.deepseek.com (user)
- [ ] Confirm response shape and auth
- [ ] Normalizer test, adapter, generated userscript

### Gemini
- [ ] Capture requests on gemini.google.com (user); note the batch RPC format
- [ ] Decide whether a DOM fallback is acceptable for Gemini
- [ ] Normalizer test, adapter, generated userscript

## Capture tool

`tools/endpoint-capture.user.js` runs on the four remaining sites. It records
paths, parameter names, status codes, and response key names (never message
text), and adds a button that copies the summary. Use it to write each adapter
from real traffic.

## Capture steps (user, per site)

1. Open the site logged in and load one conversation.
2. Open DevTools > Network, filter by Fetch/XHR, and reload the page.
3. Find the request that returns the conversation and the one that lists
   conversations. Copy the URL (remove query values that identify you) and
   the response JSON's top-level keys, not the content.
4. Send those to the assistant to finish that site's adapter.
