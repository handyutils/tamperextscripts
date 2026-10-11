// gemini.google.com adapter. Calls the page's own batchexecute endpoint with the
// user's session. rpc MaZiqc lists chats and hNvQHb loads one; both were read
// from a logged-in page. The request token (SNlM0e) is read from the page html
// on each call and sent only to gemini.google.com.

import { normalizeGeminiConversation, parseBatchResponse, extractAtToken } from "./gemini-normalize.js";

const CHAT_PATH = /\/app\/([0-9a-f]{16})/i;
const ENDPOINT = "/_/BardChatUi/data/batchexecute";
const titles = new Map(); // id -> title, filled by listConversations

export const geminiAdapter = {
  name: "Gemini",

  currentConversationId() {
    return CHAT_PATH.exec(location.pathname)?.[1] ?? null;
  },

  async loadConversation(id, progress = () => {}) {
    progress("Reading your Gemini session...");
    const at = await requestToken();
    const turns = [];
    let cursor = null;
    do {
      const page = await rpc("hNvQHb", ["c_" + id, 100, cursor, 1, [1], [4], null, 1], at, `/app/${id}`);
      turns.push(...(page?.[0] ?? []));
      progress(`Loading messages... ${turns.length} turns`);
      cursor = typeof page?.[1] === "string" ? page[1] : null;
    } while (cursor);

    const title = titles.get(id) ?? document.title.replace(/\s*-\s*Google Gemini\s*$/i, "");
    return normalizeGeminiConversation({ id, title }, turns);
  },

  async listConversations() {
    const at = await requestToken();
    const items = [];
    let cursor = null;
    do {
      const page = await rpc("MaZiqc", [50, cursor, [0, null, 1]], at, "/app");
      for (const item of page?.[2] ?? []) {
        const id = String(item[0]).replace(/^c_/, "");
        titles.set(id, item[1] ?? "");
        items.push({ id, title: item[1] ?? "" });
      }
      cursor = typeof page?.[1] === "string" ? page[1] : null;
    } while (cursor);
    return items;
  },
};

async function requestToken() {
  const response = await fetch("/app", { credentials: "include" });
  const token = extractAtToken(await response.text());
  if (!token) throw new Error("Not signed in to Gemini (no request token on the page).");
  return token;
}

async function rpc(name, args, at, sourcePath) {
  const body = new URLSearchParams({ "f.req": JSON.stringify([[[name, JSON.stringify(args), null, "generic"]]]), at });
  const response = await fetch(`${ENDPOINT}?rpcids=${name}&source-path=${encodeURIComponent(sourcePath)}&hl=en&rt=c`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (response.status === 429) throw new Error("Gemini is rate limiting requests; try again later.");
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${name}`);
  return parseBatchResponse(await response.text());
}
