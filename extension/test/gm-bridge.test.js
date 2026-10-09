import { test } from "node:test";
import assert from "node:assert/strict";
import { handleGmMessage } from "../src/userscript/gm-bridge.js";
import { createScriptStore } from "../src/userscript/store.js";

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

const source = (grants) => `// ==UserScript==
// @name Alpha
// @match https://chatgpt.com/*
${grants.map((g) => `// @grant ${g}\n`).join("")}// ==/UserScript==
`;

async function setup(grants) {
  const store = createScriptStore(memoryStorage(), () => "id-1");
  await store.install(source(grants));
  return store;
}

test("GM_getValue returns the stored value, or the default when unset", async () => {
  const store = await setup(["GM_getValue", "GM_setValue"]);
  await store.setValue("id-1", "count", 7);
  const hit = await handleGmMessage({ scriptId: "id-1", op: "getValue", key: "count", defaultValue: 0 }, { store });
  const miss = await handleGmMessage({ scriptId: "id-1", op: "getValue", key: "other", defaultValue: 42 }, { store });
  assert.equal(hit, 7);
  assert.equal(miss, 42);
});

test("GM_setValue persists the value for that script", async () => {
  const store = await setup(["GM_setValue"]);
  await handleGmMessage({ scriptId: "id-1", op: "setValue", key: "k", value: "v" }, { store });
  assert.equal(await store.getValue("id-1", "k"), "v");
});

test("refuses an operation the script did not declare with @grant", async () => {
  const store = await setup(["GM_getValue"]);
  await assert.rejects(
    () => handleGmMessage({ scriptId: "id-1", op: "setValue", key: "k", value: 1 }, { store }),
    /GM_setValue was not granted/,
  );
});

test("refuses calls from a script that is unknown or disabled", async () => {
  const store = await setup(["GM_getValue"]);
  await assert.rejects(
    () => handleGmMessage({ scriptId: "nope", op: "getValue", key: "k" }, { store }),
    /No enabled script/,
  );
  await store.setEnabled("id-1", false);
  await assert.rejects(
    () => handleGmMessage({ scriptId: "id-1", op: "getValue", key: "k" }, { store }),
    /No enabled script/,
  );
});

test("GM_xmlhttpRequest performs the request and returns status and body", async () => {
  const store = await setup(["GM_xmlhttpRequest"]);
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return new Response("hello", { status: 201 });
  };
  const result = await handleGmMessage(
    { scriptId: "id-1", op: "xmlhttpRequest", details: { method: "POST", url: "https://example.com/x", data: "d" } },
    { store, fetchImpl },
  );
  assert.equal(seen[0].url, "https://example.com/x");
  assert.equal(seen[0].init.method, "POST");
  assert.equal(result.status, 201);
  assert.equal(result.responseText, "hello");
});

test("GM_xmlhttpRequest rejects non-http(s) URLs", async () => {
  const store = await setup(["GM_xmlhttpRequest"]);
  await assert.rejects(
    () =>
      handleGmMessage(
        { scriptId: "id-1", op: "xmlhttpRequest", details: { method: "GET", url: "file:///etc/passwd" } },
        { store, fetchImpl: async () => new Response("") },
      ),
    /Only http and https/,
  );
});
