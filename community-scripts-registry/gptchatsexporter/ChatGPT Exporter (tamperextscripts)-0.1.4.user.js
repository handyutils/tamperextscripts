// ==UserScript==
// @name         ChatGPT Chat Exporter (tamperextscripts)
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.4
// @description  Export ChatGPT conversations to Markdown, JSON, HTML, or plain text.
// @license      GPL-3.0-only
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  // src/serializers.js
  var ROLE_LABELS = { user: "User", assistant: "Assistant" };
  var MAX_FILENAME_LENGTH = 120;
  function toMarkdown(conversation) {
    const sections = conversation.messages.map(
      (m) => `**${roleLabel(m.role)}**

${m.text}`
    );
    return [`# ${conversation.title}`, ...sections].join("\n\n---\n\n") + "\n";
  }
  function toJson(conversation) {
    return JSON.stringify(conversation, null, 2) + "\n";
  }
  function toText(conversation) {
    const sections = conversation.messages.map(
      (m) => `${roleLabel(m.role)}:
${m.text}`
    );
    return [conversation.title, ...sections].join("\n\n") + "\n";
  }
  function toHtml(conversation) {
    const title = escapeHtml(conversation.title);
    const messages = conversation.messages.map(
      (m) => `<section class="message ${escapeHtml(m.role)}"><h2>${escapeHtml(roleLabel(m.role))}</h2><pre>${escapeHtml(m.text)}</pre></section>`
    ).join("\n");
    return [
      "<!doctype html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="utf-8">',
      `<title>${title}</title>`,
      "</head>",
      "<body>",
      `<h1>${title}</h1>`,
      messages,
      "</body>",
      "</html>",
      ""
    ].join("\n");
  }
  function toFilename(conversation, extension) {
    const title = sanitize(conversation.title) || "Untitled conversation";
    const base = `${title} - ${conversation.id}`.slice(0, MAX_FILENAME_LENGTH);
    return `${base}.${extension}`;
  }
  function roleLabel(role) {
    return ROLE_LABELS[role] ?? role;
  }
  function sanitize(value) {
    return String(value ?? "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // src/widget.js
  var HOST_ID = "tamperextscripts-exporter";
  var FORMATS = [
    { key: "markdown", label: "Markdown", ext: "md", mime: "text/markdown", build: toMarkdown },
    { key: "json", label: "JSON", ext: "json", mime: "application/json", build: toJson },
    { key: "html", label: "HTML", ext: "html", mime: "text/html", build: toHtml },
    { key: "text", label: "Plain text", ext: "txt", mime: "text/plain", build: toText }
  ];
  function mountWidget(adapter) {
    if (document.getElementById(HOST_ID)) return;
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.append(host);
    const root = host.attachShadow({ mode: "open" });
    const actions = [
      ...FORMATS.map((f) => ({ key: f.key, label: `Export ${f.label}` })),
      { key: "copy", label: "Copy text" },
      { key: "screenshot", label: "Screenshot (not available yet)", disabled: true }
    ];
    if (adapter.listConversations) {
      actions.push({ key: "export-all", label: "Export all conversations" });
    }
    root.append(styleElement(), buildMenu(actions, adapter));
  }
  function buildMenu(actions, adapter) {
    const wrapper = el("div", { class: "wrap" });
    const toggle = el("button", { class: "toggle", type: "button", title: "Export" }, "Export");
    const panel = el("div", { class: "panel", hidden: "" });
    const status = el("div", { class: "status", role: "status" });
    for (const action of actions) {
      const button = el("button", { type: "button", "data-action": action.key }, action.label);
      button.disabled = Boolean(action.disabled);
      button.addEventListener("click", () => run(action.key, status, button, adapter));
      panel.append(button);
    }
    panel.append(status);
    toggle.addEventListener("click", () => panel.toggleAttribute("hidden"));
    wrapper.append(toggle, panel);
    return wrapper;
  }
  async function run(key, status, button, adapter) {
    button.disabled = true;
    try {
      if (key === "export-all") await exportAll(status, adapter);
      else if (key === "copy") await copyCurrent(status, adapter);
      else await exportCurrent(key, status, adapter);
    } catch (error) {
      status.textContent = `Failed: ${error.message}`;
      console.error(`[tamperextscripts ${adapter.name}]`, error);
    } finally {
      button.disabled = key === "screenshot";
    }
  }
  async function exportCurrent(key, status, adapter) {
    const id = adapter.currentConversationId();
    if (!id) throw new Error("Open a conversation first.");
    const format = FORMATS.find((f) => f.key === key);
    const conversation = await adapter.loadConversation(id);
    download(format.build(conversation), toFilename(conversation, format.ext), format.mime);
    status.textContent = `Exported ${format.label}.`;
  }
  async function copyCurrent(status, adapter) {
    const id = adapter.currentConversationId();
    if (!id) throw new Error("Open a conversation first.");
    const conversation = await adapter.loadConversation(id);
    await navigator.clipboard.writeText(toText(conversation));
    status.textContent = "Copied conversation text.";
  }
  async function exportAll(status, adapter) {
    const items = await adapter.listConversations();
    const exported = [];
    const failed = [];
    for (const [index, item] of items.entries()) {
      status.textContent = `Exporting ${index + 1} of ${items.length}...`;
      try {
        exported.push(await adapter.loadConversation(item.id));
      } catch (error) {
        failed.push({ id: item.id, title: item.title ?? null, error: error.message });
      }
    }
    const bundle = { exportedAt: (/* @__PURE__ */ new Date()).toISOString(), count: exported.length, failed, conversations: exported };
    download(JSON.stringify(bundle, null, 2) + "\n", `${adapter.name.toLowerCase()}-export-${dateStamp()}.json`, "application/json");
    status.textContent = `Exported ${exported.length} conversation(s); ${failed.length} failed.`;
  }
  function download(content, filename, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function dateStamp() {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function styleElement() {
    const style = document.createElement("style");
    style.textContent = `
    .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; font: 13px system-ui, sans-serif; }
    .toggle { padding: 8px 14px; border: 0; border-radius: 8px; background: #0F766E; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(15,118,110,.35); }
    .toggle:hover { background: #0b5c56; }
    .panel { position: absolute; right: 0; bottom: 42px; min-width: 230px; display: flex; flex-direction: column; gap: 2px; padding: 8px; border: 1px solid #0F766E; border-radius: 10px; background: #fff; color: #13211f; box-shadow: 0 6px 20px rgba(15,118,110,.25); }
    .panel[hidden] { display: none; }
    .panel button { text-align: left; padding: 7px 10px; border: 0; border-left: 3px solid transparent; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
    .panel button:hover:not(:disabled) { background: rgba(245,158,11,.18); border-left-color: #F59E0B; }
    .panel button:disabled { color: #8a9a97; cursor: not-allowed; }
    .panel button:focus-visible, .toggle:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
    .status { min-height: 1.2em; margin-top: 4px; padding: 6px 10px; border-top: 1px solid rgba(15,118,110,.25); color: #0F766E; font-weight: 600; }
    @media (prefers-color-scheme: dark) {
      .panel { background: #13211f; color: #e6f4f1; }
      .panel button:disabled { color: #6b7d7a; }
      .status { color: #F59E0B; border-top-color: rgba(245,158,11,.3); }
    }
  `;
    return style;
  }

  // src/auth.js
  function buildAuthHeaders(accessToken, accountId) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "X-Authorization": `Bearer ${accessToken}`
    };
    if (accountId) headers["Chatgpt-Account-Id"] = accountId;
    return headers;
  }
  function workspaceAccountId(accountsCheck, workspaceCookie) {
    if (!workspaceCookie) return null;
    return accountsCheck?.accounts?.[workspaceCookie]?.account?.account_id ?? null;
  }
  function readCookie(cookieString, name) {
    for (const part of cookieString.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key === name) return rest.join("=");
    }
    return void 0;
  }

  // src/api.js
  var SESSION_PATH = "/api/auth/session";
  var ACCOUNTS_CHECK_PATH = "/backend-api/accounts/check/v4-2023-04-27";
  var CONVERSATION_PATH = "/backend-api/conversation";
  var CONVERSATIONS_PATH = "/backend-api/conversations";
  async function getAuth() {
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
  async function fetchConversation(id, auth) {
    return getJson(`${CONVERSATION_PATH}/${encodeURIComponent(id)}`, auth.headers);
  }
  async function listConversations({ offset, limit }, auth) {
    const query = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
      order: "updated"
    });
    return getJson(`${CONVERSATIONS_PATH}?${query}`, auth.headers);
  }
  async function getJson(path, headers = {}) {
    const response = await fetch(path, {
      credentials: "include",
      headers: { Accept: "application/json", ...headers }
    });
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new Error(
        `ChatGPT is rate limiting requests${retryAfter ? `; retry after ${retryAfter} seconds` : ""}.`
      );
    }
    if (!response.ok) {
      throw new Error(`ChatGPT request failed: ${response.status} ${path}`);
    }
    return response.json();
  }

  // src/conversation.js
  var VISIBLE_ROLES = /* @__PURE__ */ new Set(["user", "assistant"]);
  var DEFAULT_TITLE = "Untitled conversation";
  function normalizeConversation(raw) {
    const mapping = raw.mapping ?? {};
    const messages = activeBranch(mapping, raw.current_node).map((node) => toMessage(node.message)).filter(Boolean);
    return {
      id: raw.conversation_id ?? raw.id ?? "",
      title: raw.title || DEFAULT_TITLE,
      createTime: raw.create_time ?? null,
      messages
    };
  }
  function activeBranch(mapping, currentNode) {
    const branch = [];
    const seen = /* @__PURE__ */ new Set();
    let id = currentNode;
    while (id && mapping[id] && !seen.has(id)) {
      seen.add(id);
      branch.push(mapping[id]);
      id = mapping[id].parent;
    }
    return branch.reverse();
  }
  var HIDDEN_CONTENT_TYPES = /* @__PURE__ */ new Set(["thoughts", "reasoning_recap"]);
  function toMessage(message) {
    if (!message) return null;
    if (message.metadata?.is_visually_hidden_from_conversation) return null;
    if (message.recipient && message.recipient !== "all") return null;
    if (HIDDEN_CONTENT_TYPES.has(message.content?.content_type)) return null;
    const role = message.author?.role;
    if (!VISIBLE_ROLES.has(role)) return null;
    return {
      role,
      text: partsToText(message.content),
      createTime: message.create_time ?? null
    };
  }
  function partsToText(content) {
    const parts = content?.parts ?? [];
    return parts.map((part) => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      return "[non-text content]";
    }).join("");
  }

  // src/providers/chatgpt.js
  var CONVERSATION_PATTERN = /^\/(?:g\/[^/]+\/)?c\/([0-9a-f-]+)/i;
  var LIST_PAGE_SIZE = 28;
  var chatgptAdapter = {
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
    }
  };

  // src/chatgpt-entry.js
  mountWidget(chatgptAdapter);
})();
