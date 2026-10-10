import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMistralConversation } from "../src/providers/mistral-normalize.js";

// Shape as observed on chat.mistral.ai (tRPC message.all and chat.byId).
const chat = { id: "c1", title: "Mistral <t>", updatedAt: "2026-01-01T10:00:00Z" };
const items = [
  { id: "m2", role: "assistant", content: "Answer", turn: 1, createdAt: "2026-01-01T10:00:02Z", parentId: "m1" },
  { id: "m1", role: "user", content: "Question", turn: 0, createdAt: "2026-01-01T10:00:01Z", parentId: null },
  { id: "m3", role: "tool", content: "tool output", turn: 1, createdAt: "2026-01-01T10:00:03Z", parentId: "m2" },
  { id: "m4", role: "user", content: "   ", turn: 2, createdAt: "2026-01-01T10:00:04Z", parentId: "m2" },
];

test("orders messages by turn and keeps only user and assistant text", () => {
  const conv = normalizeMistralConversation(chat, items);
  assert.equal(conv.id, "c1");
  assert.equal(conv.title, "Mistral <t>");
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "Question"],
    ["assistant", "Answer"],
  ]);
});

test("defaults the title", () => {
  assert.equal(normalizeMistralConversation({ id: "c1" }, []).title, "Untitled conversation");
});
