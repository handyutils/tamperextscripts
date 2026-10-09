// Request authentication for the ChatGPT web backend. Pure helpers, so the
// header rules can be tested without a browser.

// The web app sends the access token in two headers. Team and workspace
// accounts also need the selected account id.
export function buildAuthHeaders(accessToken, accountId) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Authorization": `Bearer ${accessToken}`,
  };
  if (accountId) headers["Chatgpt-Account-Id"] = accountId;
  return headers;
}

// The _account cookie holds the selected workspace; the accounts check lists
// each workspace's real account id.
export function workspaceAccountId(accountsCheck, workspaceCookie) {
  if (!workspaceCookie) return null;
  return accountsCheck?.accounts?.[workspaceCookie]?.account?.account_id ?? null;
}

export function readCookie(cookieString, name) {
  for (const part of cookieString.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}
