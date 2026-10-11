import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCoworkSession } from "../src/providers/claude-cowork-pick.js";

const sessions = [
  { id: "cse_a", title: "Play Store app submission", last_event_at: "2026-09-30T10:00:00Z" },
  { id: "cse_b", title: "Optimzie Electronjs", last_event_at: "2026-09-29T10:00:00Z" },
];

test("matches the page title, ignoring the ' - Claude' suffix, case and spacing", () => {
  assert.deepEqual(pickCoworkSession(sessions, "  play store APP submission - Claude "), { id: "cse_a" });
});

test("reports when no session has that title", () => {
  assert.deepEqual(pickCoworkSession(sessions, "Something else - Claude"), { error: "none" });
});

test("reports an ambiguous title instead of guessing", () => {
  const dup = [...sessions, { id: "cse_c", title: "Play Store app submission" }];
  assert.deepEqual(pickCoworkSession(dup, "Play Store app submission - Claude"), { error: "ambiguous", count: 2 });
});

test("an empty page title never matches", () => {
  assert.deepEqual(pickCoworkSession(sessions, ""), { error: "none" });
  assert.deepEqual(pickCoworkSession(sessions, " - Claude"), { error: "none" });
});
