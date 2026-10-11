# tamperextscripts

Export your AI chats and run your own userscripts, in modern Chrome, without sending anything to a third party.

- **Website and docs:** https://handyutils.github.io/tamperextscripts/
- **Community scripts:** https://handyutils.github.io/tamperextscripts/#registry

## What it does

1. **Chat exporters.** Save a conversation as Markdown, JSON, HTML, or plain text, copy it, or export all of your chats. Supported sites: ChatGPT, Claude (including Cowork sessions), Gemini, Grok, Mistral Le Chat, DeepSeek, Qwen, and Z.ai.
2. **Userscript manager.** Install your own `.user.js` scripts or community scripts from a registry. Each registry entry is pinned by SHA-256, so a changed file is refused.

## Install

### The extension (manager and ChatGPT exporter)

1. Download `tamperextscripts-<version>.zip` from the latest release, or from the website.
2. Unzip it to a folder you'll keep. Chrome loads the extension from there.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the folder.
4. On the extension's details page, turn on **Allow User Scripts**.

### An exporter userscript

Each site's exporter is a standalone userscript in `community-scripts-registry/<site>chatsexporter/`. Install one with either tool:

- **Tampermonkey:** open the `.user.js` file from the website's download button, then click Install.
- **The extension:** open its options page, choose the file, and press Install.

Install one copy of each script. Two copies of the same exporter show two Export buttons.

## Use

Open a chat on a supported site and click **Export** in the bottom-right corner, then choose a format. **Export all** saves every chat in your account to one JSON file, and the status line shows progress.

Only the visible conversation is exported. Reasoning, tool calls, and hidden messages are left out.

## Repository layout

| Path | What it is |
| --- | --- |
| `extension/` | The Manifest V3 extension: manager, options page, ChatGPT exporter. Source in `src/`, tests in `test/`. |
| `extension/src/providers/` | One adapter per site. Each adapter talks to that site's own web API with the signed-in session. |
| `community-scripts-registry/` | Generated userscripts for the exporters. |
| `registry/index.json` | The community registry index that the extension and website read. |
| `website/` | The documentation site, deployed to GitHub Pages. |
| `specs/` | Feature specifications and their status. |
| `docs/` | Roadmap and the legacy Tampermonkey 2.9 README. |
| `build_sys/`, `src/`, `server/` | The original Tampermonkey 2.9 source, kept as provenance. Not used by the extension. |

## Develop

```sh
cd extension
npm install
npm test                  # unit tests
npm run build             # extension in dist/
npm run build:userscripts # regenerate community-scripts-registry/
npm run build:registry    # regenerate registry/index.json (run after script changes)

cd ../website
npm install
npm run build             # also packages the extension zip and copies the userscripts
```

After changing a userscript, run `build:registry` and commit the scripts and the index together. The registry checks each file against its SHA-256, so a stale index refuses the new file.

## Adding a site or a community script

- **A site exporter:** add an adapter in `extension/src/providers/`, a normalizer with tests, and a build target in `extension/scripts/build-userscripts.js`.
- **A community script:** put the `.user.js` file in a folder under `community-scripts-registry/`, then run `npm run build:registry`.

## Status and limits

- The ChatGPT, Claude, Mistral, DeepSeek, and Grok exporters have been tested against logged-in accounts. Gemini, Qwen, and Z.ai were tested on the same basis, but are newer.
- Site APIs are undocumented and can change. If an export fails, check the status line under the buttons, then open an issue.
- The `Screenshot` export is not implemented.

## Licence and provenance

GPL-3.0. The extension and exporters are original work. `build_sys/`, `src/`, and `server/` are the GPL-licensed Tampermonkey 2.9 source, kept for reference, and are not part of the extension. Newer proprietary Tampermonkey code is not used.
