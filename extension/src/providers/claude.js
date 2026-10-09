// claude.ai adapter. Uses the same-origin web API with the user's session.
// Endpoints are the ones documented by the claude-chat-exporter project; they
// are undocumented and may change.

import { normalizeClaudeConversation } from "./claude-normalize.js";

const CONVERSATION_PATH = /^\/chat\/([0-9a-f-]+)/i;

export const claudeAdapter = {
  name: "Claude",

  currentConversationId() {
    return CONVERSATION_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    const org = organizationId();
    const url = `/api/organizations/${org}/chat_conversations/${id}?tree=true&rendering_mode=messages&render_all_tools=true`;
    return normalizeClaudeConversation(await getJson(url));
  },

  async listConversations() {
    const org = organizationId();
    const list = await getJson(`/api/organizations/${org}/chat_conversations`);
    return list.map((c) => ({ id: c.uuid, title: c.name }));
  },
};

// The active organization is stored in the lastActiveOrg cookie.
function organizationId() {
  const match = /(?:^|;\s*)lastActiveOrg=([^;]+)/.exec(document.cookie);
  if (!match) throw new Error("Not signed in to Claude (no active organization).");
  return decodeURIComponent(match[1]);
}

async function getJson(url) {
  const response = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
  if (response.status === 429) throw new Error("Claude is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`Claude request failed: ${response.status} ${url}`);
  return response.json();
}
