import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegistryIndex, verifySource, sha256Hex } from "../src/userscript/registry.js";

const validEntry = {
  id: "hello-world",
  name: "Hello World",
  version: "1.0.0",
  description: "Says hello",
  url: "https://raw.githubusercontent.com/inboxxobni/tamperextscripts/master/registry/scripts/hello.user.js",
  sha256: "a".repeat(64),
  license: "GPL-3.0-only",
};

test("parses a valid index with entries", () => {
  const index = parseRegistryIndex({ schema: 1, scripts: [validEntry] });
  assert.equal(index.scripts.length, 1);
  assert.equal(index.scripts[0].id, "hello-world");
});

test("rejects an unknown schema version", () => {
  assert.throws(() => parseRegistryIndex({ schema: 2, scripts: [] }), /Unsupported registry schema/);
});

test("rejects entries that are missing required fields", () => {
  const { sha256, ...broken } = validEntry;
  assert.throws(() => parseRegistryIndex({ schema: 1, scripts: [broken] }), /sha256/);
});

test("rejects sources that are not served over https", () => {
  const entry = { ...validEntry, url: "http://example.com/x.user.js" };
  assert.throws(() => parseRegistryIndex({ schema: 1, scripts: [entry] }), /must use https/);
});

test("rejects a sha256 that is not 64 hex characters", () => {
  const entry = { ...validEntry, sha256: "xyz" };
  assert.throws(() => parseRegistryIndex({ schema: 1, scripts: [entry] }), /sha256 must be 64 hex/);
});

test("rejects duplicate entry ids", () => {
  assert.throws(
    () => parseRegistryIndex({ schema: 1, scripts: [validEntry, { ...validEntry }] }),
    /Duplicate registry id/,
  );
});

test("hashes text with SHA-256", async () => {
  // Known vector: SHA-256 of "abc".
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("verifySource accepts text whose hash matches the index", async () => {
  const text = "// ==UserScript==\n// ==/UserScript==\n";
  const digest = await sha256Hex(text);
  assert.equal(await verifySource(text, digest), true);
});

test("verifySource rejects tampered text", async () => {
  const digest = await sha256Hex("original");
  assert.equal(await verifySource("tampered", digest), false);
});
