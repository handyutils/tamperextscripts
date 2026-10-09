import { test } from "node:test";
import assert from "node:assert/strict";
import { urlMatchesScript } from "../src/userscript/match.js";

const meta = (overrides) => ({
  matches: [],
  includes: [],
  excludes: [],
  ...overrides,
});

test("matches a Chrome match pattern with a wildcard path", () => {
  const m = meta({ matches: ["https://chatgpt.com/*"] });
  assert.equal(urlMatchesScript(m, "https://chatgpt.com/c/abc"), true);
  assert.equal(urlMatchesScript(m, "https://example.com/c/abc"), false);
});

test("supports subdomain wildcards in match patterns", () => {
  const m = meta({ matches: ["https://*.openai.com/*"] });
  assert.equal(urlMatchesScript(m, "https://chat.openai.com/"), true);
  // Chrome treats "*.example.com" as also matching the bare apex domain.
  assert.equal(urlMatchesScript(m, "https://openai.com/"), true);
  assert.equal(urlMatchesScript(m, "https://notopenai.com/"), false);
});

test("@include accepts glob patterns", () => {
  const m = meta({ includes: ["https://example.org/page*"] });
  assert.equal(urlMatchesScript(m, "https://example.org/page12"), true);
  assert.equal(urlMatchesScript(m, "https://example.org/other"), false);
});

test("@include accepts /regex/ patterns", () => {
  const m = meta({ includes: ["/^https:\\/\\/example\\.org\\/page\\d+$/"] });
  assert.equal(urlMatchesScript(m, "https://example.org/page7"), true);
  assert.equal(urlMatchesScript(m, "https://example.org/pageX"), false);
});

test("@exclude overrides a match", () => {
  const m = meta({
    matches: ["https://chatgpt.com/*"],
    excludes: ["https://chatgpt.com/share/*"],
  });
  assert.equal(urlMatchesScript(m, "https://chatgpt.com/c/1"), true);
  assert.equal(urlMatchesScript(m, "https://chatgpt.com/share/2"), false);
});

test("a script with no match or include rules never runs", () => {
  assert.equal(urlMatchesScript(meta({}), "https://chatgpt.com/"), false);
});

test("an invalid URL does not match", () => {
  const m = meta({ matches: ["<all_urls>"] });
  assert.equal(urlMatchesScript(m, "not a url"), false);
});
