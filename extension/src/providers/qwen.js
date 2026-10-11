// chat.qwen.ai adapter. Calls the site's own API on the same origin with the
// user's session cookies. Endpoints were read from a logged-in page.

import { normalizeQwenConversation } from "./qwen-normalize.js";

const CHAT_PATH = /^\/c\/([0-9a-f-]{36})/i;

export const qwenAdapter = {
  name: "Qwen",

  currentConversationId() {
    return CHAT_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id, progress = () => {}) {
    progress("Loading conversation...");
    const body = await getJson(`/api/v2/chats/${encodeURIComponent(id)}`);
    return normalizeQwenConversation(body.data ?? body);
  },

  async listConversations() {
    const items = [];
    const seen = new Set();
    // Pages hold 10 chats; an empty page ends the list.
    for (let page = 1; page <= 500; page++) {
      const body = await getJson(`/api/v2/chats/?page=${page}&exclude_project=true`);
      const batch = body.data ?? [];
      const fresh = batch.filter((c) => !seen.has(c.id));
      if (fresh.length === 0) break;
      for (const c of fresh) {
        seen.add(c.id);
        items.push({ id: c.id, title: c.title });
      }
    }
    return items;
  },
};

async function getJson(path) {
  const response = await fetch(path, { credentials: "include", headers: { Accept: "application/json" } });
  if (response.status === 429) throw new Error("Qwen is rate limiting requests; try again later.");
  if (response.status === 401 || response.status === 403) throw new Error("Not signed in to Qwen.");
  if (!response.ok) throw new Error(`Qwen request failed: ${response.status} ${path.split("?")[0]}`);
  return response.json();
}
