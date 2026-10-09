import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toMarkdown,
  toJson,
  toHtml,
  toText,
  toFilename,
} from "../src/serializers.js";

const conversation = {
  id: "abc-123",
  title: "Hello <world> / test",
  createTime: 1700000000,
  messages: [
    { role: "user", text: "Use <script>alert(1)</script>", createTime: 1700000001 },
    { role: "assistant", text: "Line one\n\nLine two", createTime: 1700000002 },
  ],
};

test("markdown keeps title, roles and message order", () => {
  const md = toMarkdown(conversation);
  assert.match(md, /^# Hello <world> \/ test/);
  assert.ok(md.indexOf("**User**") < md.indexOf("**Assistant**"));
  assert.ok(md.includes("Line one\n\nLine two"));
});

test("json is valid and preserves order and roles", () => {
  const data = JSON.parse(toJson(conversation));
  assert.equal(data.id, "abc-123");
  assert.deepEqual(
    data.messages.map((m) => m.role),
    ["user", "assistant"],
  );
});

test("html escapes untrusted conversation content", () => {
  const html = toHtml(conversation);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("Hello &lt;world&gt; / test"));
});

test("text export keeps role labels and order", () => {
  const text = toText(conversation);
  assert.ok(text.indexOf("User:") < text.indexOf("Assistant:"));
});

test("filenames are sanitized and include the conversation id", () => {
  const name = toFilename(conversation, "md");
  assert.equal(name, "Hello world test - abc-123.md");
  assert.ok(!/[<>/:"\\|?*]/.test(name));
});

test("filenames fall back to a default title", () => {
  assert.equal(
    toFilename({ id: "x1", title: "", messages: [] }, "json"),
    "Untitled conversation - x1.json",
  );
});
