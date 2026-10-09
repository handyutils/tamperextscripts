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

// Builds a one-message branch so each filter rule can be checked in isolation.
function singleMessage(message) {
  return {
    conversation_id: "c",
    title: "t",
    current_node: "n",
    mapping: {
      root: { id: "root", parent: null, children: ["n"], message: null },
      n: { id: "n", parent: "root", children: [], message },
    },
  };
}

const base = {
  id: "m",
  author: { role: "assistant" },
  create_time: 1,
  content: { content_type: "text", parts: ["visible"] },
  metadata: {},
  recipient: "all",
};

test("skips messages addressed to a tool instead of the user", () => {
  const conv = normalizeConversation(singleMessage({ ...base, recipient: "python" }));
  assert.deepEqual(conv.messages, []);
});

test("skips thinking and reasoning-recap content", () => {
  const thoughts = normalizeConversation(
    singleMessage({ ...base, content: { content_type: "thoughts", parts: [] } }),
  );
  const recap = normalizeConversation(
    singleMessage({ ...base, content: { content_type: "reasoning_recap", parts: ["x"] } }),
  );
  assert.deepEqual(thoughts.messages, []);
  assert.deepEqual(recap.messages, []);
});

test("skips tool-role messages", () => {
  const conv = normalizeConversation(singleMessage({ ...base, author: { role: "tool" } }));
  assert.deepEqual(conv.messages, []);
});

test("keeps a visible assistant message addressed to the user", () => {
  const conv = normalizeConversation(singleMessage(base));
  assert.deepEqual(conv.messages.map((m) => m.text), ["visible"]);
});
