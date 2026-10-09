// Thin client for the ChatGPT web backend, used from the content script so
// requests carry the user's own session cookies. Nothing here leaves the
// chatgpt.com origin; conversation data is never sent to third parties.

const SESSION_PATH = "/api/auth/session";
const CONVERSATION_PATH = "/backend-api/conversation";
const CONVERSATIONS_PATH = "/backend-api/conversations";

export async function getAccessToken() {
  const session = await getJson(SESSION_PATH);
  if (!session?.accessToken) {
    throw new Error("Not signed in to ChatGPT (no access token in session).");
  }
  return session.accessToken;
}

export async function fetchConversation(id, token) {
  return getJson(`${CONVERSATION_PATH}/${encodeURIComponent(id)}`, token);
}

export async function listConversations({ offset, limit }, token) {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    order: "updated",
  });
  return getJson(`${CONVERSATIONS_PATH}?${query}`, token);
}

async function getJson(path, token) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { credentials: "include", headers });
  if (!response.ok) {
    throw new Error(`ChatGPT request failed: ${response.status} ${path}`);
  }
  return response.json();
}
