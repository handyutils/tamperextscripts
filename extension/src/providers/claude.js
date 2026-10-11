// claude.ai adapter. Uses the same-origin web API with the user's session.
// Endpoints are the ones documented by the claude-chat-exporter project; they
// are undocumented and may change.

import { normalizeClaudeConversation } from "./claude-normalize.js";
import { orderOrganizations } from "./claude-orgs.js";
import { normalizeCoworkSession } from "./claude-cowork-normalize.js";
import { pickCoworkSession } from "./claude-cowork-pick.js";

const CONVERSATION_PATH = /^\/chat\/([0-9a-f-]+)/i;

export const claudeAdapter = {
  name: "Claude",

  currentConversationId() {
    return CONVERSATION_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    // Ask Claude which organizations the current account has, on every call, so a
    // switched account never reuses an old organization.
    let notFound = false;
    for (const org of await organizationIds()) {
      const url = `/api/organizations/${org}/chat_conversations/${id}?tree=true&rendering_mode=messages&render_all_tools=true`;
      const response = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
      if (response.status === 404) {
        notFound = true;
        continue;
      }
      return normalizeClaudeConversation(await parse(response, url));
    }
    // Cowork sessions are not in the regular chat API. The page loads them from
    // /v1/code/sessions/{id}, so fall back to that when the chat was not found.
    const coworkId = notFound ? await coworkSessionId() : null;
    if (coworkId) return loadCoworkSession(coworkId);
    if (notFound) {
      throw new Error(`This conversation was not found in the signed-in Claude account (${await signedInEmail()}). Sign in to the account that owns it.`);
    }
    throw new Error("Not signed in to Claude (no organizations found).");
  },

  async listConversations() {
    const items = [];
    for (const org of await organizationIds()) {
      const list = await getJson(`/api/organizations/${org}/chat_conversations`);
      items.push(...list.map((c) => ({ id: c.uuid, title: c.name, org })));
    }
    return items;
  },
};

// Resolves the Cowork session behind this page: the /cowork/ URL if present, else the
// session whose title matches the page title (the chat id is not stored on the
// session), else the page's own newest session request.
async function coworkSessionId() {
  const fromUrl = /\/cowork\/(cse_[A-Za-z0-9]+)/.exec(location.pathname)?.[1];
  if (fromUrl) return fromUrl;

  const list = await coworkJson("/v1/code/sessions?limit=50").catch(() => null);
  if (list) {
    const pick = pickCoworkSession(list.data ?? [], document.title);
    if (pick.id) return pick.id;
    if (pick.error === "ambiguous") {
      throw new Error(`${pick.count} Cowork sessions share this title, so the right one can't be chosen. Rename one of them and try again.`);
    }
  }

  const ids = performance
    .getEntriesByType("resource")
    .map((e) => /\/v1\/code\/sessions\/(cse_[A-Za-z0-9]+)/.exec(e.name)?.[1])
    .filter(Boolean);
  return ids.at(-1) ?? null;
}

const COWORK_HEADERS = { Accept: "application/json", "anthropic-version": "2023-06-01" };

async function loadCoworkSession(sessionId) {
  const session = await coworkJson(`/v1/code/sessions/${sessionId}`);
  const events = [];
  let cursor = null;
  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await coworkJson(`/v1/code/sessions/${sessionId}/events${query}`);
    events.push(...(page.data ?? []));
    cursor = page.next_cursor && page.next_cursor !== cursor ? page.next_cursor : null;
  } while (cursor);
  return normalizeCoworkSession(session, events);
}

async function coworkJson(path) {
  const response = await fetch(path, { credentials: "include", headers: COWORK_HEADERS });
  return parse(response, path);
}

// Shown in the not-found error so the user can see which account is active.
async function signedInEmail() {
  try {
    return (await getJson("/api/account")).email_address ?? "unknown account";
  } catch {
    return "unknown account";
  }
}

async function organizationIds() {
  const organizations = await getJson("/api/organizations");
  const cookie = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(document.cookie);
  return orderOrganizations(organizations, cookie ? decodeURIComponent(cookie[1]) : null);
}

async function getJson(url) {
  const response = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
  return parse(response, url);
}

async function parse(response, url) {
  if (response.status === 429) throw new Error("Claude is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`Claude request failed: ${response.status} ${url.split("?")[0]}`);
  return response.json();
}
