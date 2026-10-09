// grok.com adapter. Same-origin requests with the user's session cookies.
// Endpoints were read from a logged-in grok.com page (paths and key names only).

import { normalizeGrokConversation } from "./grok-normalize.js";

const CONVERSATION_PATH = /^\/c\/([0-9a-f-]+)/i;

export const grokAdapter = {
  name: "Grok",

  currentConversationId() {
    return CONVERSATION_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    const meta = await getJson(`/rest/app-chat/conversations_v2/${id}?includeWorkspaces=true&includeTaskResult=true`);
    const tree = await getJson(`/rest/app-chat/conversations/${id}/response-node`);
    const loaded = await postJson(`/rest/app-chat/conversations/${id}/load-responses`, {
      responseIds: tree.responseNodes.map((n) => n.responseId),
    });
    return normalizeGrokConversation(meta, tree, loaded);
  },

  async listConversations() {
    const items = [];
    let token = null;
    do {
      const query = new URLSearchParams({ pageSize: "60" });
      if (token) query.set("pageToken", token);
      const page = await getJson(`/rest/app-chat/conversations?${query}`);
      for (const c of page.conversations ?? []) items.push({ id: c.conversationId, title: c.title });
      token = page.nextPageToken || null;
    } while (token);
    return items;
  },
};

async function getJson(path) {
  return request(path, { headers: { Accept: "application/json" } });
}

async function postJson(path, body) {
  return request(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function request(path, init) {
  const response = await fetch(path, { credentials: "include", ...init });
  if (response.status === 429) throw new Error("Grok is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`Grok request failed: ${response.status} ${path}`);
  return response.json();
}
