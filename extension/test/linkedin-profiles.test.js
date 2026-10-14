import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalProfileUrl, collectProfiles, formatList } from "../src/linkedin/profile-urls.js";
import { gatherProfiles } from "../src/linkedin/gather.js";

test("canonicalizes profile links to one stable form", () => {
  assert.equal(canonicalProfileUrl("https://www.linkedin.com/in/jane-doe-123/?miniProfileUrn=x"), "https://www.linkedin.com/in/jane-doe-123/");
  assert.equal(canonicalProfileUrl("https://linkedin.com/in/jane/details/experience/"), "https://www.linkedin.com/in/jane/");
  assert.equal(canonicalProfileUrl("https://de.linkedin.com/in/jane#top"), "https://www.linkedin.com/in/jane/");
});

test("rejects non-profile pages and other hosts", () => {
  assert.equal(canonicalProfileUrl("https://www.linkedin.com/feed/"), null);
  assert.equal(canonicalProfileUrl("https://www.linkedin.com/company/acme/"), null);
  assert.equal(canonicalProfileUrl("https://www.linkedin.com/in/"), null);
  assert.equal(canonicalProfileUrl("https://notlinkedin.com/in/jane/"), null);
  assert.equal(canonicalProfileUrl("https://evil.com/linkedin.com/in/jane/"), null);
  assert.equal(canonicalProfileUrl("not a url"), null);
});

test("collects unique profiles in first-seen order and drops non-profiles", () => {
  const urls = ["https://www.linkedin.com/in/b/", "https://www.linkedin.com/feed/", "https://linkedin.com/in/a/?x=1", "https://www.linkedin.com/in/b/"];
  assert.deepEqual(collectProfiles(urls), ["https://www.linkedin.com/in/b/", "https://www.linkedin.com/in/a/"]);
});

test("formats one URL per line", () => {
  assert.equal(formatList(["https://www.linkedin.com/in/a/", "https://www.linkedin.com/in/b/"]), "https://www.linkedin.com/in/a/\nhttps://www.linkedin.com/in/b/");
  assert.equal(formatList([]), "");
});

// A fake two-way bus: whatever the requester sends, the replies are delivered back.
function fakeBus(repliesFor) {
  const handlers = new Set();
  const sent = [];
  return {
    sent,
    on(fn) { handlers.add(fn); return () => handlers.delete(fn); },
    send(message) {
      sent.push(message);
      for (const reply of repliesFor(message)) {
        setTimeout(() => handlers.forEach((fn) => fn(reply)), 0);
      }
    },
  };
}

test("gathers profile URLs from every tab that answers, including the current one", async () => {
  const bus = fakeBus((msg) => [
    { t: "here", id: msg.id, url: "https://www.linkedin.com/in/tab-two/?ref=1" },
    { t: "here", id: msg.id, url: "https://www.linkedin.com/feed/" },
    { t: "here", id: msg.id, url: "https://www.linkedin.com/in/tab-three/" },
    { t: "here", id: "some-other-request", url: "https://www.linkedin.com/in/stale/" },
  ]);
  const urls = await gatherProfiles(bus, "https://www.linkedin.com/in/current/", { timeoutMs: 20, newId: () => "req-1" });
  assert.deepEqual(urls, [
    "https://www.linkedin.com/in/current/",
    "https://www.linkedin.com/in/tab-two/",
    "https://www.linkedin.com/in/tab-three/",
  ]);
  assert.deepEqual(bus.sent, [{ t: "whois", id: "req-1" }]);
});

test("returns only the current page when no other tab answers", async () => {
  const bus = fakeBus(() => []);
  const urls = await gatherProfiles(bus, "https://www.linkedin.com/feed/", { timeoutMs: 10, newId: () => "r" });
  assert.deepEqual(urls, []);
});
