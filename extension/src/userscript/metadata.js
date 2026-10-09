// Parses the ==UserScript== header block that Tampermonkey-style scripts use.
// Pure function: no I/O, so it is covered directly by unit tests.

const BLOCK_PATTERN = /\/\/ ==UserScript==\r?\n([\s\S]*?)\r?\n\/\/ ==\/UserScript==/;
const LINE_PATTERN = /^\/\/\s*@([\w:-]+)(?:\s+(.*?))?\s*$/;

const RUN_AT_VALUES = new Set(["document-start", "document-end", "document-idle"]);

export function parseMetadata(source) {
  const block = BLOCK_PATTERN.exec(source);
  if (!block) {
    throw new Error("Script has no ==UserScript== block.");
  }

  const entries = [];
  for (const line of block[1].split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line.trim());
    if (match) entries.push([match[1], match[2] ?? ""]);
  }

  const first = (key) => entries.find(([k]) => k === key)?.[1];
  const all = (key) => entries.filter(([k]) => k === key).map(([, v]) => v);

  const name = first("name");
  if (!name) {
    throw new Error("Script metadata: @name is required.");
  }

  const runAt = first("run-at") ?? "document-end";

  return {
    name,
    namespace: first("namespace") ?? "",
    version: first("version") ?? "0",
    description: first("description") ?? "",
    matches: all("match"),
    includes: all("include"),
    excludes: all("exclude"),
    grants: all("grant"),
    requires: all("require"),
    runAt: RUN_AT_VALUES.has(runAt) ? runAt : "document-end",
  };
}
