import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeClaudeConversation } from "../src/providers/claude-normalize.js";

// Shape per the documented claude.ai tree response: messages linked by uuid,
// the active branch starts at current_leaf_message_uuid.
const fixture = {
  uuid: "conv-1",
  name: "Claude <test>",
  created_at: "2026-01-01T10:00:00Z",
  current_leaf_message_uuid: "a2",
  chat_messages: [
    { uuid: "h1", parent_message_uuid: "root", sender: "human", created_at: "2026-01-01T10:00:01Z",
      content: [{ type: "text", text: " Hello " }] },
    { uuid: "a1", parent_message_uuid: "h1", sender: "assistant", created_at: "2026-01-01T10:00:02Z",
      content: [{ type: "thinking", thinking: "private" }, { type: "tool_use", name: "search" }, { type: "text", text: "Draft" }] },
    { uuid: "a2", parent_message_uuid: "h1", sender: "assistant", created_at: "2026-01-01T10:00:03Z",
      content: [{ type: "text", text: "Final answer" }] },
    { uuid: "x1", parent_message_uuid: "h1", sender: "human", created_at: "2026-01-01T10:00:04Z",
      content: [{ type: "text", text: "Other branch" }] },
  ],
};

test("follows the active branch from the current leaf, in chronological order", () => {
  const conv = normalizeClaudeConversation(fixture);
  assert.deepEqual(conv.messages.map((m) => m.role), ["user", "assistant"]);
  assert.equal(conv.messages[1].text, "Final answer");
  assert.ok(!conv.messages.some((m) => m.text === "Other branch"));
});

test("keeps only text blocks and trims them", () => {
  const conv = normalizeClaudeConversation({
    ...fixture,
    current_leaf_message_uuid: "a1",
  });
  assert.deepEqual(conv.messages.map((m) => m.text), ["Hello", "Draft"]);
  assert.ok(!conv.messages.some((m) => m.text.includes("private")));
});

test("maps identity and title", () => {
  const conv = normalizeClaudeConversation(fixture);
  assert.equal(conv.id, "conv-1");
  assert.equal(conv.title, "Claude <test>");
});

test("drops messages with no text", () => {
  const conv = normalizeClaudeConversation({
    ...fixture,
    current_leaf_message_uuid: "t",
    chat_messages: [
      { uuid: "t", parent_message_uuid: null, sender: "assistant", content: [{ type: "tool_result" }] },
    ],
  });
  assert.deepEqual(conv.messages, []);
});

test("returns no messages when the leaf is unknown", () => {
  assert.deepEqual(normalizeClaudeConversation({ ...fixture, current_leaf_message_uuid: "nope" }).messages, []);
});
