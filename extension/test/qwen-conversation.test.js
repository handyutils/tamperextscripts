import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeQwenConversation } from "../src/providers/qwen-normalize.js";

// Shape as observed on chat.qwen.ai (/api/v2/chats/{id}): a message tree under
// data.chat.history.messages, the active leaf in history.currentId.
const data = (messages, currentId) => ({
  id: "chat-1",
  title: "Qwen <t>",
  created_at: 1767261600,
  chat: { history: { messages, currentId } },
});
const m = (id, role, content, parentId, extra = {}) => ({ id, role, content, parentId, timestamp: 100, ...extra });

test("follows the active branch from currentId, root to leaf", () => {
  const messages = {
    u1: m("u1", "user", "Hi", null),
    a1: m("a1", "assistant", "Hello", "u1"),
    u2: m("u2", "user", "Other branch", "a1"),
    a2: m("a2", "assistant", "Final", "a1"),
  };
  const conv = normalizeQwenConversation(data(messages, "a2"));
  assert.equal(conv.id, "chat-1");
  assert.equal(conv.title, "Qwen <t>");
  assert.deepEqual(conv.messages.map((x) => [x.role, x.text]), [
    ["user", "Hi"],
    ["assistant", "Hello"],
    ["assistant", "Final"],
  ]);
});

test("keeps only the visible answer, not reasoning content", () => {
  const messages = {
    u1: m("u1", "user", "Q", null),
    a1: m("a1", "assistant", "Answer", "u1", { reasoning_content: "private thoughts" }),
  };
  const conv = normalizeQwenConversation(data(messages, "a1"));
  assert.deepEqual(conv.messages.map((x) => x.text), ["Q", "Answer"]);
});

test("skips empty messages and unknown roles", () => {
  const messages = { s: m("s", "system", "x", null), a: m("a", "assistant", "  ", "s") };
  assert.deepEqual(normalizeQwenConversation(data(messages, "a")).messages, []);
});

test("returns no messages when the current leaf is unknown, and defaults the title", () => {
  const conv = normalizeQwenConversation({ id: "c", chat: { history: { messages: {}, currentId: "zz" } } });
  assert.deepEqual(conv.messages, []);
  assert.equal(conv.title, "Untitled conversation");
});
