import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeDeepSeekConversation } from "../src/providers/deepseek-normalize.js";

// Shape as observed on chat.deepseek.com (history_messages biz_data).
const session = { id: "s1", title: "DeepSeek <t>", updated_at: 1767261600, current_message_id: 4 };
const messages = [
  { message_id: 1, parent_id: null, role: "USER", fragments: [{ type: "REQUEST", content: "Hi" }] },
  { message_id: 2, parent_id: 1, role: "ASSISTANT", fragments: [{ type: "THINK", content: "secret" }, { type: "RESPONSE", content: "Hello" }] },
  { message_id: 3, parent_id: 2, role: "USER", fragments: [{ type: "REQUEST", content: "Other branch" }] },
  { message_id: 4, parent_id: 2, role: "ASSISTANT", fragments: [{ type: "TOOL_SEARCH", content: "x" }, { type: "RESPONSE", content: "Final" }, { type: "TIP", content: "tip" }] },
];

test("follows the active branch from current_message_id and keeps response text only", () => {
  const conv = normalizeDeepSeekConversation(session, messages);
  assert.equal(conv.id, "s1");
  assert.equal(conv.title, "DeepSeek <t>");
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "Hi"],
    ["assistant", "Hello"],
    ["assistant", "Final"],
  ]);
});

test("the active branch is the path to current_message_id, not every message", () => {
  const conv = normalizeDeepSeekConversation({ ...session, current_message_id: 3 }, messages);
  assert.deepEqual(conv.messages.map((m) => m.text), ["Hi", "Hello", "Other branch"]);
});

test("defaults the title", () => {
  assert.equal(normalizeDeepSeekConversation({ id: "s1" }, []).title, "Untitled conversation");
});
