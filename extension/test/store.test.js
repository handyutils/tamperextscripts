import { test } from "node:test";
import assert from "node:assert/strict";
import { createScriptStore } from "../src/userscript/store.js";

// Minimal in-memory stand-in for chrome.storage.local (async get/set).
function memoryStorage() {
  const data = {};
  return {
    async get(key) {
      return { [key]: structuredClone(data[key]) };
    },
    async set(obj) {
      Object.assign(data, structuredClone(obj));
    },
  };
}

const source = (name, extra = "") => `// ==UserScript==
// @name ${name}
// @namespace https://example.com
// @version 1.0
// @match https://chatgpt.com/*
${extra}// ==/UserScript==
console.log("${name}");
`;

test("installs a script and lists it as enabled", async () => {
  const store = createScriptStore(memoryStorage(), () => "id-1");
  const installed = await store.install(source("Alpha"));
  assert.equal(installed.id, "id-1");
  assert.equal(installed.enabled, true);
  const all = await store.list();
  assert.deepEqual(all.map((s) => s.meta.name), ["Alpha"]);
});

test("reinstalling the same namespace and name updates the existing script", async () => {
  const ids = ["id-1", "id-2"];
  const store = createScriptStore(memoryStorage(), () => ids.shift());
  await store.install(source("Alpha"));
  const updated = await store.install(source("Alpha").replace("1.0", "2.0"));
  assert.equal(updated.id, "id-1");
  const all = await store.list();
  assert.equal(all.length, 1);
  assert.equal(all[0].meta.version, "2.0");
});

test("keeps the enabled flag when a script is updated", async () => {
  const ids = ["id-1"];
  const store = createScriptStore(memoryStorage(), () => ids.shift() ?? "unused");
  await store.install(source("Alpha"));
  await store.setEnabled("id-1", false);
  await store.install(source("Alpha").replace("1.0", "2.0"));
  assert.equal((await store.get("id-1")).enabled, false);
});

test("disables and removes scripts", async () => {
  const store = createScriptStore(memoryStorage(), () => "id-1");
  await store.install(source("Alpha"));
  await store.setEnabled("id-1", false);
  assert.equal((await store.get("id-1")).enabled, false);
  await store.remove("id-1");
  assert.equal(await store.get("id-1"), undefined);
  assert.deepEqual(await store.list(), []);
});

test("rejects invalid userscript source without storing anything", async () => {
  const store = createScriptStore(memoryStorage(), () => "id-1");
  await assert.rejects(() => store.install("console.log(1)"), /no ==UserScript== block/);
  assert.deepEqual(await store.list(), []);
});

test("keeps GM values per script and isolates them from other scripts", async () => {
  const ids = ["a", "b"];
  const store = createScriptStore(memoryStorage(), () => ids.shift());
  await store.install(source("Alpha"));
  await store.install(source("Beta"));

  await store.setValue("a", "count", 3);
  assert.equal(await store.getValue("a", "count"), 3);
  assert.equal(await store.getValue("b", "count"), undefined);

  await store.deleteValue("a", "count");
  assert.equal(await store.getValue("a", "count"), undefined);
});

test("removing a script also deletes its GM values", async () => {
  const store = createScriptStore(memoryStorage(), () => "id-1");
  await store.install(source("Alpha"));
  await store.setValue("id-1", "k", "v");
  await store.remove("id-1");
  assert.equal(await store.getValue("id-1", "k"), undefined);
});
