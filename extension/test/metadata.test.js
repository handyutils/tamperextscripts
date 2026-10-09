import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMetadata } from "../src/userscript/metadata.js";

const sample = `// ==UserScript==
// @name         Hello  World
// @namespace    https://example.com/ns
// @version      1.2.3
// @description  Says hi
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @include      /^https:\\/\\/example\\.org\\/page\\d+$/
// @exclude      https://chatgpt.com/share/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @require      https://cdn.example.com/lib.js
// ==/UserScript==

console.log("hi");
`;

test("parses name, namespace, version and description", () => {
  const meta = parseMetadata(sample);
  assert.equal(meta.name, "Hello  World");
  assert.equal(meta.namespace, "https://example.com/ns");
  assert.equal(meta.version, "1.2.3");
  assert.equal(meta.description, "Says hi");
});

test("collects repeated @match, @include, @exclude, @grant and @require", () => {
  const meta = parseMetadata(sample);
  assert.deepEqual(meta.matches, ["https://chatgpt.com/*", "https://chat.openai.com/*"]);
  assert.deepEqual(meta.includes, ["/^https:\\/\\/example\\.org\\/page\\d+$/"]);
  assert.deepEqual(meta.excludes, ["https://chatgpt.com/share/*"]);
  assert.deepEqual(meta.grants, ["GM_getValue", "GM_setValue"]);
  assert.deepEqual(meta.requires, ["https://cdn.example.com/lib.js"]);
});

test("defaults run-at to document-end and grants to none", () => {
  const meta = parseMetadata("// ==UserScript==\n// @name x\n// ==/UserScript==\n");
  assert.equal(meta.runAt, "document-end");
  assert.deepEqual(meta.grants, []);
  assert.deepEqual(meta.matches, []);
});

test("reads run-at when given", () => {
  assert.equal(parseMetadata(sample).runAt, "document-start");
});

test("rejects a file without a metadata block", () => {
  assert.throws(() => parseMetadata("console.log(1);"), /no ==UserScript== block/);
});

test("rejects a metadata block without a name", () => {
  const src = "// ==UserScript==\n// @version 1\n// ==/UserScript==\n";
  assert.throws(() => parseMetadata(src), /@name is required/);
});
