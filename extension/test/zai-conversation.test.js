import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeZaiConversation } from "../src/providers/zai-normalize.js";

// Shapes as observed on chat.z.ai: the chat holds the tree (history.messages ids,
// history.currentId); the message bodies come from POST /messages/batch, where a
// user message has string content and an assistant message has content_blocks.
const chat = (currentId) => ({ id: "chat-1", title: "Z <t>", created_at: 1767261600, chat: { history: { messages: {}, currentId } } });
const user = (id, content, parentId = null, timestamp = 1) => ({ id, role: "user", content, parentId, timestamp });
const bot = (id, blocks, parentId, timestamp = 2) => ({ id, role: "assistant", content: null, content_blocks: blocks, parentId, timestamp });

test("follows the active branch and keeps text blocks only", () => {
  const data = {
    u1: user("u1", "Question"),
    a1: bot("a1", [{ type: "tool_calls", content: [{}] }, { type: "reasoning", content: "private" }, { type: "text", content: "Visible answer" }], "u1"),
    a2: bot("a2", [{ type: "text", content: "Other branch" }], "u1"),
  };
  const conv = normalizeZaiConversation(chat("a1"), data);
  assert.equal(conv.id, "chat-1");
  assert.equal(conv.title, "Z <t>");
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "Question"],
    ["assistant", "Visible answer"],
  ]);
});

test("joins several text blocks in order", () => {
  const data = { u: user("u", "Q"), a: bot("a", [{ type: "text", content: "A" }, { type: "reasoning", content: "x" }, { type: "text", content: "B" }], "u") };
  assert.deepEqual(normalizeZaiConversation(chat("a"), data).messages.map((m) => m.text), ["Q", "A\n\nB"]);
});

test("accepts string content on an assistant message", () => {
  const data = { u: user("u", "Q"), a: { id: "a", role: "assistant", content: "Plain", parentId: "u" } };
  assert.deepEqual(normalizeZaiConversation(chat("a"), data).messages.map((m) => m.text), ["Q", "Plain"]);
});

test("skips empty messages, handles an unknown leaf, defaults the title", () => {
  const data = { u: user("u", "  "), a: bot("a", [{ type: "reasoning", content: "x" }], "u") };
  assert.deepEqual(normalizeZaiConversation(chat("a"), data).messages, []);
  const conv = normalizeZaiConversation({ id: "c", chat: { history: { currentId: "zz" } } }, {});
  assert.deepEqual(conv.messages, []);
  assert.equal(conv.title, "Untitled conversation");
});
