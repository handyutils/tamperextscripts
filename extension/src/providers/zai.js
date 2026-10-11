// chat.z.ai adapter. Calls the site's own API on the same origin with the user's
// session cookies. The tree comes from /api/v1/chats/{id}; the message bodies come
// from POST /api/v1/chats/{id}/messages/batch. Endpoints were read from a logged-in page.

import { normalizeZaiConversation } from "./zai-normalize.js";

const CHAT_PATH = /^\/c\/([0-9a-f-]{36})/i;
const BATCH_SIZE = 50;

export const zaiAdapter = {
  name: "Z.ai",

  currentConversationId() {
    return CHAT_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id, progress = () => {}) {
    progress("Loading conversation...");
    const chat = await request(`/api/v1/chats/${encodeURIComponent(id)}`);
    const ids = Object.keys(chat.chat?.history?.messages ?? {});

    const bodies = {};
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      progress(`Loading messages... ${Math.min(100, Math.round((i / ids.length) * 100))}%`);
      const batch = await request(`/api/v1/chats/${encodeURIComponent(id)}/messages/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ids.slice(i, i + BATCH_SIZE) }),
      });
      Object.assign(bodies, batch.data ?? {});
    }
    return normalizeZaiConversation(chat, bodies);
  },

  async listConversations() {
    const items = [];
    const seen = new Set();
    // An empty page ends the list.
    for (let page = 1; page <= 500; page++) {
      const batch = await request(`/api/v1/chats/?page=${page}`);
      const fresh = (Array.isArray(batch) ? batch : []).filter((c) => !seen.has(c.id));
      if (fresh.length === 0) break;
      for (const c of fresh) {
        seen.add(c.id);
        items.push({ id: c.id, title: c.title });
      }
    }
    return items;
  },
};

async function request(path, init = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
  });
  if (response.status === 429) throw new Error("Z.ai is rate limiting requests; try again later.");
  if (response.status === 401 || response.status === 403) throw new Error("Not signed in to Z.ai.");
  if (!response.ok) throw new Error(`Z.ai request failed: ${response.status} ${path.split("?")[0]}`);
  return response.json();
}
