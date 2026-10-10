// claude.ai adapter. Uses the same-origin web API with the user's session.
// Endpoints are the ones documented by the claude-chat-exporter project; they
// are undocumented and may change.

import { normalizeClaudeConversation } from "./claude-normalize.js";
import { orderOrganizations } from "./claude-orgs.js";

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
