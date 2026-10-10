// Bundles the site entries into standalone Tampermonkey-style userscripts in
// community-scripts-registry/. Each output is checked with the same metadata
// parser the manager uses, so a broken header fails the build.
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseMetadata } from "../src/userscript/metadata.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = join(root, "..", "community-scripts-registry");

const VERSION = "0.1.1";

const targets = [
  {
    entry: "src/claude-entry.js",
    folder: "claudechatsexporter",
    file: `Claude Exporter-${VERSION}.user.js`,
    header: {
      name: "Claude Chat Exporter",
      match: "https://claude.ai/*",
      description: "Export claude.ai conversations to Markdown, JSON, HTML, or plain text.",
    },
  },
  {
    entry: "src/grok-entry.js",
    folder: "grokchatsexporter",
    file: `Grok Exporter-${VERSION}.user.js`,
    header: {
      name: "Grok Chat Exporter",
      match: "https://grok.com/*",
      description: "Export grok.com conversations to Markdown, JSON, HTML, or plain text.",
    },
  },
  {
    entry: "src/mistral-entry.js",
    folder: "mistralchatsexporter",
    file: `Mistral Exporter-${VERSION}.user.js`,
    header: {
      name: "Mistral Chat Exporter",
      match: "https://chat.mistral.ai/*",
      description: "Export Mistral Le Chat conversations to Markdown, JSON, HTML, or plain text.",
    },
  },
  {
    entry: "src/deepseek-entry.js",
    folder: "deepseekchatsexporter",
    file: `DeepSeek Exporter-${VERSION}.user.js`,
    header: {
      name: "DeepSeek Chat Exporter",
      match: "https://chat.deepseek.com/*",
      description: "Export DeepSeek conversations to Markdown, JSON, HTML, or plain text.",
    },
  },
];

for (const target of targets) {
  const result = await build({
    entryPoints: [join(root, target.entry)],
    bundle: true,
    format: "iife",
    target: "es2022",
    write: false,
    legalComments: "none",
  });
  const code = result.outputFiles[0].text;

  const header = [
    "// ==UserScript==",
    `// @name         ${target.header.name}`,
    "// @namespace    https://github.com/handyutils/tamperextscripts",
    `// @version      ${VERSION}`,
    `// @description  ${target.header.description}`,
    "// @license      GPL-3.0-only",
    `// @match        ${target.header.match}`,
    "// @grant        none",
    "// @run-at       document-idle",
    "// ==/UserScript==",
    "",
  ].join("\n");

  const source = header + code;
  parseMetadata(source); // throws if the header is malformed

  const dir = join(registry, target.folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, target.file), source);
  console.log(`Wrote ${target.folder}/${target.file}`);
}
