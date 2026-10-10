// chat.deepseek.com adapter. Calls the site's own API on the same origin. The
// bearer token is the one the page stores in localStorage.userToken; it is read
// at call time, sent only to this origin, and never stored or logged.
// Endpoints and shapes were read from a logged-in page.

import { normalizeDeepSeekConversation } from "./deepseek-normalize.js";

const SESSION_PATH = /^\/a\/chat\/s\/([0-9a-f-]+)/i;

export const deepseekAdapter = {
  name: "DeepSeek",

  currentConversationId() {
    return SESSION_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id) {
    const data = await api(`/api/v0/chat/history_messages?chat_session_id=${encodeURIComponent(id)}`);
    return normalizeDeepSeekConversation(data.chat_session, data.chat_messages);
  },

  async listConversations() {
    const page = await api("/api/v0/chat_session/fetch_page?lte_cursor.pinned=false");
    if (page.has_more) {
      // Only the first page is supported so far; stop rather than export a partial list silently.
      throw new Error("This account has more chats than the DeepSeek exporter can list yet.");
    }
    return page.chat_sessions.map((s) => ({ id: s.id, title: s.title }));
  },
};

function userToken() {
  const raw = localStorage.getItem("userToken");
  if (!raw) throw new Error("Not signed in to DeepSeek (no session token on this page).");
  try {
    return JSON.parse(raw).value;
  } catch {
    return raw;
  }
}

async function api(path) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", Authorization: `Bearer ${userToken()}` },
  });
  if (response.status === 429) throw new Error("DeepSeek is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`DeepSeek request failed: ${response.status} ${path.split("?")[0]}`);
  const body = await response.json();
  if (body.code !== 0) throw new Error(`DeepSeek error ${body.code}: ${body.msg}`);
  return body.data.biz_data;
}
