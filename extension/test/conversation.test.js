import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeConversation } from "../src/conversation.js";

const fixture = {
  title: "Hello <world>",
  conversation_id: "abc-123",
  create_time: 1700000000,
  current_node: "a2",
  mapping: {
    root: { id: "root", parent: null, children: ["u1"], message: null },
    u1: {
      id: "u1",
      parent: "root",
      children: ["a1"],
      message: {
        id: "u1",
        author: { role: "user" },
        create_time: 1700000001,
        content: { content_type: "text", parts: ["Hi"] },
        metadata: {},
      },
    },
    a1: {
      id: "a1",
      parent: "u1",
      children: ["a2"],
      message: {
        id: "a1",
        author: { role: "system" },
        create_time: 1700000002,
        content: { content_type: "text", parts: [""] },
        metadata: { is_visually_hidden_from_conversation: true },
      },
    },
    a2: {
      id: "a2",
      parent: "a1",
      children: [],
      message: {
        id: "a2",
        author: { role: "assistant" },
        create_time: 1700000003,
        content: {
          content_type: "multimodal_text",
          parts: ["Hello", { content_type: "image_asset_pointer" }, " there"],
        },
        metadata: {},
      },
    },
    orphan: {
      id: "orphan",
      parent: null,
      children: [],
      message: {
        id: "orphan",
        author: { role: "user" },
        create_time: 1700000004,
        content: { content_type: "text", parts: ["not on the active branch"] },
        metadata: {},
      },
    },
  },
};

test("returns active-branch messages in order, skipping hidden and system ones", () => {
  const { messages } = normalizeConversation(fixture);
  assert.deepEqual(
    messages.map((m) => [m.role, m.text]),
    [
      ["user", "Hi"],
      ["assistant", "Hello[non-text content] there"],
    ],
  );
});

test("exposes title, id and created time", () => {
  const conv = normalizeConversation(fixture);
  assert.equal(conv.title, "Hello <world>");
  assert.equal(conv.id, "abc-123");
  assert.equal(conv.createTime, 1700000000);
  assert.equal(conv.messages[0].createTime, 1700000001);
});

test("falls back to an empty title when none is provided", () => {
  const conv = normalizeConversation({ ...fixture, title: undefined });
  assert.equal(conv.title, "Untitled conversation");
});

test("returns no messages when current_node is missing from mapping", () => {
  const conv = normalizeConversation({ ...fixture, current_node: "missing" });
  assert.deepEqual(conv.messages, []);
});
