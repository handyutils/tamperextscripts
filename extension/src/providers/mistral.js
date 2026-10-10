// chat.mistral.ai adapter. Calls the site's tRPC endpoints with the user's
// session cookies. Endpoints and input shapes were read from a logged-in page.

import { normalizeMistralConversation } from "./mistral-normalize.js";

const CHAT_PATH = /^\/work\/([0-9a-f-]+)/i;

export const mistralAdapter = {
  name: "Mistral",

  currentConversationId() {
    return CHAT_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    const chat = await trpc("chat.byId", { json: { id } });
    const messages = await trpc("message.all", { json: { chatId: id } });
    return normalizeMistralConversation(
      { id, title: chat.userTitle || chat.generatedTitle || chat.title, updatedAt: chat.updatedAt },
      messages.items ?? [],
    );
  },

  async listConversations() {
    const items = [];
    let cursor = null;
    do {
      // The cursor is a date, sent with superjson's type annotation.
      const input = { json: { limit: 50, ...(cursor ? { cursor } : {}) } };
      if (cursor) input.meta = { values: { cursor: ["Date"] } };
      const page = await trpc("chat.last", input);
      for (const c of page.items ?? []) {
        items.push({ id: c.id, title: c.userTitle || c.generatedTitle || c.title || "" });
      }
      cursor = page.nextCursor || null;
    } while (cursor);
    return items;
  },
};

async function trpc(procedure, input) {
  const response = await fetch(`/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 429) throw new Error("Mistral is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`Mistral request failed: ${response.status} ${procedure}`);
  const body = await response.json();
  return body.result.data.json;
}
