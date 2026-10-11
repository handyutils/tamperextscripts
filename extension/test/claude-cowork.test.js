import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCoworkSession } from "../src/providers/claude-cowork-normalize.js";

// Shapes as observed on claude.ai Cowork sessions (/v1/code/sessions/{sid} and /events).
const session = { id: "cse_1", title: "Play Store <app>", created_at: "2026-09-30T10:00:00Z" };
const ev = (sequence_num, event_type, payload) => ({ sequence_num: String(sequence_num), event_type, payload });

test("orders by sequence number and keeps user strings and assistant text", () => {
  const events = [
    ev(4, "assistant", { message: { role: "assistant", content: [{ type: "text", text: "Final answer" }] }, timestamp: "2026-09-30T10:00:04Z" }),
    ev(2, "assistant", { message: { role: "assistant", content: [{ type: "thinking", thinking: "hmm" }, { type: "tool_use", name: "x" }] } }),
    ev(1, "user", { message: { role: "user", content: "Why is review slow?" }, timestamp: "2026-09-30T10:00:01Z" }),
    ev(3, "user", { message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: [{ type: "text", text: "tool output" }] }] } }),
  ];
  const conv = normalizeCoworkSession(session, events);
  assert.equal(conv.id, "cse_1");
  assert.equal(conv.title, "Play Store <app>");
  assert.deepEqual(conv.messages.map((m) => [m.role, m.text]), [
    ["user", "Why is review slow?"],
    ["assistant", "Final answer"],
  ]);
});

test("skips non-message events", () => {
  const events = [
    ev(1, "rate_limit_event", { type: "rate_limit_event" }),
    ev(2, "system", { type: "system" }),
    ev(3, "result", { type: "result" }),
    ev(4, "control_request", { type: "control_request" }),
  ];
  assert.deepEqual(normalizeCoworkSession(session, events).messages, []);
});

test("keeps text blocks of an array user message, but not tool results", () => {
  const events = [
    ev(1, "user", { message: { role: "user", content: [{ type: "text", text: "Hello" }, { type: "tool_result", content: "x" }] } }),
  ];
  assert.deepEqual(normalizeCoworkSession(session, events).messages.map((m) => m.text), ["Hello"]);
});

test("joins several assistant text blocks and sorts numeric sequence numbers numerically", () => {
  const events = [
    ev(10, "assistant", { message: { content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] } }),
    ev(9, "user", { message: { content: "Q" } }),
  ];
  const conv = normalizeCoworkSession(session, events);
  assert.deepEqual(conv.messages.map((m) => m.text), ["Q", "A\n\nB"]);
});

test("defaults the title", () => {
  assert.equal(normalizeCoworkSession({ id: "cse_1" }, []).title, "Untitled conversation");
});

test("reads title and id when the session is wrapped in response_shape", () => {
  const wrapped = { response_shape: { id: "cse_9", title: "Wrapped title", created_at: "2026-09-30T10:00:00Z" } };
  const conv = normalizeCoworkSession(wrapped, []);
  assert.equal(conv.id, "cse_9");
  assert.equal(conv.title, "Wrapped title");
});

test("falls back to the post-turn summary title", () => {
  const conv = normalizeCoworkSession({ id: "cse_9", post_turn_summary: { title: "Summary title" } }, []);
  assert.equal(conv.title, "Summary title");
});
