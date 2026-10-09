// Thin client for the ChatGPT web backend, used from the content script so
// requests carry the user's own session cookies. Nothing here leaves the
// chatgpt.com origin; conversation data is never sent to third parties.

import { buildAuthHeaders, workspaceAccountId, readCookie } from "./auth.js";

const SESSION_PATH = "/api/auth/session";
const ACCOUNTS_CHECK_PATH = "/backend-api/accounts/check/v4-2023-04-27";
const CONVERSATION_PATH = "/backend-api/conversation";
const CONVERSATIONS_PATH = "/backend-api/conversations";

// Resolves the bearer token and, for workspace accounts, the account id.
export async function getAuth() {
  const session = await getJson(SESSION_PATH);
  if (!session?.accessToken) {
    throw new Error("Not signed in to ChatGPT (no access token in session).");
  }

  let accountId = null;
  const workspace = readCookie(document.cookie, "_account");
  if (workspace) {
    const accountsCheck = await getJson(ACCOUNTS_CHECK_PATH, buildAuthHeaders(session.accessToken, null));
    accountId = workspaceAccountId(accountsCheck, workspace);
  }

  return { headers: buildAuthHeaders(session.accessToken, accountId) };
}

export async function fetchConversation(id, auth) {
  return getJson(`${CONVERSATION_PATH}/${encodeURIComponent(id)}`, auth.headers);
}

export async function listConversations({ offset, limit }, auth) {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    order: "updated",
  });
  return getJson(`${CONVERSATIONS_PATH}?${query}`, auth.headers);
}

async function getJson(path, headers = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { Accept: "application/json", ...headers },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new Error(
      `ChatGPT is rate limiting requests${retryAfter ? `; retry after ${retryAfter} seconds` : ""}.`,
    );
  }
  if (!response.ok) {
    throw new Error(`ChatGPT request failed: ${response.status} ${path}`);
  }
  return response.json();
}
