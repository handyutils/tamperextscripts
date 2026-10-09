import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGrokConversation } from "../src/providers/grok-normalize.js";

// Shapes as observed on grok.com: response-node lists the tree (parent links),
// load-responses returns the message text per responseId.
const nodes = [
  { responseId: "r1", parentResponseId: "" },
  { responseId: "r2", parentResponseId: "r1" },
  { responseId: "r3", parentResponseId: "r2" },
  { responseId: "r2b", parentResponseId: "r1" },
];
const responses = [
  { responseId: "r1", sender: "human", message: "Hi", createTime: "2026-01-01T10:00:00Z" },
  { responseId: "r2", sender: "assistant", message: "Hello there", createTime: "2026-01-01T10:00:01Z" },
  { responseId: "r3", sender: "human", message: "Thanks", createTime: "2026-01-01T10:00:02Z" },
  { responseId: "r2b", sender: "assistant", message: "Other branch", createTime: "2026-01-01T10:00:09Z" },
];

test("keeps the newest branch, root to leaf, with human and assistant roles", () => {
  const conv = normalizeGrokConversation(
    { conversation: { conversationId: "c1", title: "Chat <x>", createTime: "2026-01-01T10:00:00Z" } },
    { responseNodes: nodes },
    { responses },
  );
  assert.equal(conv.id, "c1");
  assert.equal(conv.title, "Chat <x>");
  // r2b is the most recent leaf, so it is the active branch.
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "Hi"],
    ["assistant", "Other branch"],
  ]);
});

test("skips empty messages and unknown senders", () => {
  const conv = normalizeGrokConversation(
    { conversation: { conversationId: "c1", title: "t" } },
    { responseNodes: [{ responseId: "a", parentResponseId: "" }] },
    { responses: [{ responseId: "a", sender: "system", message: "x" }, { responseId: "b", sender: "human", message: "" }] },
  );
  assert.deepEqual(conv.messages, []);
});

test("defaults the title", () => {
  const conv = normalizeGrokConversation({ conversation: { conversationId: "c1" } }, { responseNodes: [] }, { responses: [] });
  assert.equal(conv.title, "Untitled conversation");
});
