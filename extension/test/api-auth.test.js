import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuthHeaders, workspaceAccountId, readCookie } from "../src/auth.js";

test("sends both bearer headers the web app uses", () => {
  assert.deepEqual(buildAuthHeaders("tok", null), {
    Authorization: "Bearer tok",
    "X-Authorization": "Bearer tok",
  });
});

test("adds Chatgpt-Account-Id only when a workspace account is selected", () => {
  const headers = buildAuthHeaders("tok", "acct-1");
  assert.equal(headers["Chatgpt-Account-Id"], "acct-1");
});

test("finds the workspace account id from the _account cookie", () => {
  const check = { accounts: { "ws-9": { account: { account_id: "acct-9" } } } };
  assert.equal(workspaceAccountId(check, "ws-9"), "acct-9");
});

test("returns null when no workspace is selected or the cookie is unknown", () => {
  const check = { accounts: { "ws-9": { account: { account_id: "acct-9" } } } };
  assert.equal(workspaceAccountId(check, undefined), null);
  assert.equal(workspaceAccountId(check, "ws-other"), null);
  assert.equal(workspaceAccountId({}, "ws-9"), null);
});

test("reads one cookie by name from a cookie string", () => {
  const jar = "a=1; _account=ws-9; b=2";
  assert.equal(readCookie(jar, "_account"), "ws-9");
  assert.equal(readCookie(jar, "missing"), undefined);
});
