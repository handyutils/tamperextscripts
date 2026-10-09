# ChatGPT Exporter (tamperextscripts)

A small, local-first Chromium (Manifest V3) extension that exports ChatGPT
conversations to Markdown, JSON, HTML, or plain text. It runs only on
`chatgpt.com` and `chat.openai.com`, uses your existing signed-in session, and
never sends conversation content anywhere else.

## Build

```sh
cd extension
npm install
npm test     # unit tests for conversation normalization and serializers
npm run build  # writes a loadable unpacked extension to dist/
```

## Install (unpacked)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the `extension/dist/` folder.
3. Reload any open ChatGPT tab. An **Export** button appears in the
   bottom-right corner.

Use a separate Chrome profile if you want to keep this apart from your
everyday setup.

## What it does

| Action | Status |
| --- | --- |
| Export Markdown / JSON / HTML / Plain text (current conversation) | Working |
| Copy text (current conversation) | Working |
| Export all conversations (one JSON bundle, with per-item failures listed) | Working |
| Screenshot | Not implemented yet (shown disabled) |

## Design notes

- The menu lives in a shadow root appended to `document.documentElement`. It
  does not depend on ChatGPT's CSS or `data-testid` selectors, so it does not
  need to be re-found after ChatGPT changes its markup or navigates client-side.
- Serializers and the conversation normalizer are pure functions with tests
  (`npm test`). The browser code only fetches and downloads.
- Permissions: none beyond the content script's two host matches.
- Export All processes one conversation at a time. A conversation that fails
  is recorded in `failed` and does not stop the rest.

## Known limits

- Only the active branch of each conversation is exported (what you see).
- Non-text message parts (images, tool output) appear as `[non-text content]`.
- Requests use the session access token from `/api/auth/session`. If OpenAI
  changes these endpoints, the API client in `src/api.js` is the only place to update.
