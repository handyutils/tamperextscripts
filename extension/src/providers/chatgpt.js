// ChatGPT adapter. Shared by the extension (content.js) and the userscript.
// Uses the same-origin web API with the user's session.

import { getAuth, fetchConversation, listConversations } from "../api.js";
import { normalizeConversation } from "../conversation.js";

const CONVERSATION_PATTERN = /^\/(?:g\/[^/]+\/)?c\/([0-9a-f-]+)/i;
const LIST_PAGE_SIZE = 28;

export const chatgptAdapter = {
  name: "ChatGPT",

  currentConversationId() {
    return CONVERSATION_PATTERN.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    const auth = await getAuth();
    const raw = await fetchConversation(id, auth);
    return normalizeConversation({ ...raw, conversation_id: id });
  },

  async listConversations() {
    const auth = await getAuth();
    const items = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const page = await listConversations({ offset, limit: LIST_PAGE_SIZE }, auth);
      total = page.total ?? 0;
      const batch = page.items ?? [];
      if (batch.length === 0) break;
      items.push(...batch.map((c) => ({ id: c.id, title: c.title })));
      offset += batch.length;
    }
    return items;
  },
};
