import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRegistryEntry, slugify, rawUrl } from "../src/userscript/registry-build.js";
import { sha256Hex, parseRegistryIndex } from "../src/userscript/registry.js";

const source = `// ==UserScript==
// @name         Claude Chat Exporter
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.8
// @description  Export Claude chats.
// @license      GPL-3.0-only
// @match        https://claude.ai/*
// ==/UserScript==
console.log(1);
`;

test("slugifies a script name into a stable id", () => {
  assert.equal(slugify("Claude Chat Exporter"), "claude-chat-exporter");
  assert.equal(slugify("ChatGPT Chat Exporter (tamperextscripts)"), "chatgpt-chat-exporter-tamperextscripts");
});

test("builds a raw GitHub url with the file name encoded", () => {
  assert.equal(
    rawUrl("claudechatsexporter", "Claude Exporter-0.1.8.user.js"),
    "https://raw.githubusercontent.com/handyutils/tamperextscripts/master/community-scripts-registry/claudechatsexporter/Claude%20Exporter-0.1.8.user.js",
  );
});

test("builds an entry whose hash matches the source and that the index parser accepts", async () => {
  const entry = await buildRegistryEntry(source, "claudechatsexporter", "Claude Exporter-0.1.8.user.js");
  assert.equal(entry.id, "claude-chat-exporter");
  assert.equal(entry.name, "Claude Chat Exporter");
  assert.equal(entry.version, "0.1.8");
  assert.equal(entry.license, "GPL-3.0-only");
  assert.equal(entry.sha256, await sha256Hex(source));
  assert.doesNotThrow(() => parseRegistryIndex({ schema: 1, scripts: [entry] }));
});

test("assigns a category from the folder, defaulting to Other", async () => {
  const chat = await buildRegistryEntry(source, "claudechatsexporter", "Claude Exporter-0.1.8.user.js");
  assert.equal(chat.category, "Chat export");
  const other = await buildRegistryEntry(source, "unknownfolder", "x-1.0.user.js");
  assert.equal(other.category, "Other");
});
