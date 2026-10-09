import { test } from "node:test";
import assert from "node:assert/strict";
import { toRegistrations } from "../src/userscript/registration.js";

const record = (metaOverrides, source = "") => ({
  id: "abc",
  enabled: true,
  source,
  meta: {
    name: "Alpha",
    namespace: "ns",
    version: "1.0",
    description: "",
    matches: [],
    includes: [],
    excludes: [],
    grants: [],
    requires: [],
    runAt: "document-end",
    ...metaOverrides,
  },
});

test("uses @match patterns directly and gives the registration a prefixed id", () => {
  const { registrations } = toRegistrations(record({ matches: ["https://chatgpt.com/*"] }));
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].id, "us-abc");
  assert.deepEqual(registrations[0].matches, ["https://chatgpt.com/*"]);
  assert.equal(registrations[0].world, "USER_SCRIPT");
});

test("maps @exclude globs to excludeGlobs", () => {
  const { registrations } = toRegistrations(
    record({ matches: ["https://chatgpt.com/*"], excludes: ["https://chatgpt.com/share/*"] }),
  );
  assert.deepEqual(registrations[0].excludeGlobs, ["https://chatgpt.com/share/*"]);
});

test("@match and @include are a union: a second registration covers the @include pages", () => {
  const { registrations } = toRegistrations(
    record({ matches: ["https://chatgpt.com/*"], includes: ["https://example.org/page*"] }),
  );
  assert.equal(registrations.length, 2);
  const include = registrations.find((r) => r.id === "us-abc-include");
  assert.deepEqual(include.matches, ["*://*/*"]);
  assert.deepEqual(include.includeGlobs, ["https://example.org/page*"]);
  // Pages already covered by @match are excluded, so the code never runs twice.
  assert.deepEqual(include.excludeMatches, ["https://chatgpt.com/*"]);
});

test("@include alone widens matches to any page and lets the globs restrict it", () => {
  const { registrations } = toRegistrations(record({ includes: ["https://example.org/page*"] }));
  assert.equal(registrations.length, 1);
  assert.deepEqual(registrations[0].matches, ["*://*/*"]);
  assert.deepEqual(registrations[0].includeGlobs, ["https://example.org/page*"]);
  assert.equal(registrations[0].excludeMatches, undefined);
});

test("reports regex @include rules as unsupported instead of silently dropping them", () => {
  const result = toRegistrations(
    record({ matches: ["https://chatgpt.com/*"], includes: ["/^https:\\/\\/x\\.org\\/\\d+$/"] }),
  );
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Regex @include is not supported yet/);
  assert.equal(result.registrations.length, 1);
});

test("maps run-at names to the registration's underscore form", () => {
  const start = toRegistrations(record({ matches: ["https://a/*"], runAt: "document-start" }));
  const idle = toRegistrations(record({ matches: ["https://a/*"], runAt: "document-idle" }));
  assert.equal(start.registrations[0].runAt, "document_start");
  assert.equal(idle.registrations[0].runAt, "document_idle");
});

test("carries the generated runtime code as the only js entry", () => {
  const { registrations } = toRegistrations(record({ matches: ["https://a/*"] }, 'console.log("x");'));
  assert.equal(registrations[0].js.length, 1);
  assert.match(registrations[0].js[0].code, /console\.log\("x"\);/);
});

test("a script with no @match and no @include yields no registrations", () => {
  assert.deepEqual(toRegistrations(record({})).registrations, []);
});
