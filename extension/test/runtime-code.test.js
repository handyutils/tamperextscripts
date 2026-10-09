import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUserScriptCode } from "../src/userscript/runtime-code.js";

const record = (grants, body = "") => ({
  id: "abc",
  enabled: true,
  meta: {
    name: "Alpha",
    namespace: "ns",
    version: "1.0",
    description: "",
    matches: ["https://chatgpt.com/*"],
    includes: [],
    excludes: [],
    grants,
    requires: [],
    runAt: "document-end",
  },
  source: body,
});

// Runs the generated code the way the USER_SCRIPT world would: with `chrome`
// available and `globalThis` pointing at a scope the test can inspect. Bridge
// calls are recorded; "getValue" replies with "stored".
function run(code, calls = []) {
  const fakeChrome = {
    runtime: {
      sendMessage: async (msg) => {
        calls.push(msg);
        return { ok: true, value: msg.op === "getValue" ? "stored" : undefined };
      },
    },
  };
  const scope = {};
  new Function("chrome", "globalThis", code)(fakeChrome, scope);
  return scope;
}

test("GM_info exposes the script name and version to the script body", () => {
  const body = "globalThis.probe = GM_info.script.name + ' ' + GM_info.script.version;";
  const scope = run(buildUserScriptCode(record([], body)));
  assert.equal(scope.probe, "Alpha 1.0");
});

test("GM_getValue exists only when @grant GM_getValue is declared", () => {
  const body = "globalThis.probe = typeof GM_getValue;";
  assert.equal(run(buildUserScriptCode(record(["GM_getValue"], body))).probe, "function");
  assert.equal(run(buildUserScriptCode(record([], body))).probe, "undefined");
});

test("GM_getValue routes through the bridge with the script id", async () => {
  const calls = [];
  const body = 'globalThis.p = GM_getValue("count", 0);';
  const scope = run(buildUserScriptCode(record(["GM_getValue"], body)), calls);
  assert.equal(await scope.p, "stored");
  assert.deepEqual(calls[0], { type: "gm", scriptId: "abc", op: "getValue", key: "count", defaultValue: 0 });
});

test("GM_setValue sends a set operation through the bridge", async () => {
  const calls = [];
  const body = 'globalThis.p = GM_setValue("count", 3);';
  const scope = run(buildUserScriptCode(record(["GM_setValue"], body)), calls);
  await scope.p;
  assert.deepEqual(calls[0], { type: "gm", scriptId: "abc", op: "setValue", key: "count", value: 3 });
});

test("GM_xmlhttpRequest is exposed only when granted and forwards details to the bridge", async () => {
  const calls = [];
  const body = 'globalThis.probe = typeof GM_xmlhttpRequest; GM_xmlhttpRequest({ method: "GET", url: "https://example.com/x" });';
  const scope = run(buildUserScriptCode(record(["GM_xmlhttpRequest"], body)), calls);
  assert.equal(scope.probe, "function");
  assert.equal(calls[0].op, "xmlhttpRequest");
  assert.equal(calls[0].details.url, "https://example.com/x");
});

test("the script body runs as written (no source edits)", () => {
  const body = 'globalThis.probe = "ran:" + (1 + 2);';
  assert.equal(run(buildUserScriptCode(record([], body))).probe, "ran:3");
});

test("a bridge error is thrown inside the script instead of returning silently", async () => {
  const fakeChrome = {
    runtime: { sendMessage: async () => ({ ok: false, error: "GM_setValue was not granted by this script." }) },
  };
  const scope = {};
  const body = 'globalThis.p = GM_getValue("k").catch((e) => e.message);';
  new Function("chrome", "globalThis", buildUserScriptCode(record(["GM_getValue"], body)))(fakeChrome, scope);
  assert.equal(await scope.p, "GM_setValue was not granted by this script.");
});
