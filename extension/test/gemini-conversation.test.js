import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGeminiConversation, parseBatchResponse, extractAtToken } from "../src/providers/gemini-normalize.js";

// Turn shape as observed on gemini.google.com (rpc hNvQHb): newest turn first,
// user prompt at turn[2][0][0], answer at turn[3][0][0][1][0], seconds at turn[4][0].
const turn = (user, answer, ts) => [["c_1", "r_" + ts], ["c_1", "r_" + ts, "rc_" + ts], [[user]], [[["rc", [answer]]]], [ts, 0]];

test("returns turns oldest first as user then assistant messages", () => {
  const turns = [turn("Second question", "Second answer", 200), turn("First question", "First answer", 100)];
  const conv = normalizeGeminiConversation({ id: "abc", title: "Gemini <t>" }, turns);
  assert.equal(conv.id, "abc");
  assert.equal(conv.title, "Gemini <t>");
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "First question"],
    ["assistant", "First answer"],
    ["user", "Second question"],
    ["assistant", "Second answer"],
  ]);
  assert.equal(conv.messages[0].createTime, 100);
});

test("skips a missing user or answer without failing", () => {
  const turns = [[["c_1", "r"], [], [[]], [[]], [5, 0]]];
  assert.deepEqual(normalizeGeminiConversation({ id: "a" }, turns).messages, []);
});

test("defaults the title", () => {
  assert.equal(normalizeGeminiConversation({ id: "a" }, []).title, "Untitled conversation");
});

test("parses the wrb.fr line of a batchexecute response", () => {
  const inner = JSON.stringify([[1, 2], "cursor"]);
  const body = `)]}'\n\n123\n${JSON.stringify([["wrb.fr", "hNvQHb", inner, null, null, null, "generic"]])}\n25\n[["e",4,null,null,123]]`;
  assert.deepEqual(parseBatchResponse(body), [[1, 2], "cursor"]);
});

test("returns null when the response has no payload", () => {
  assert.equal(parseBatchResponse(")]}'\n\n10\n[[\"e\",4]]"), null);
});

test("extracts the anti-CSRF token from the page html", () => {
  assert.equal(extractAtToken('x"SNlM0e":"AbC-123:456","other":1'), "AbC-123:456");
  assert.equal(extractAtToken("no token here"), null);
});
