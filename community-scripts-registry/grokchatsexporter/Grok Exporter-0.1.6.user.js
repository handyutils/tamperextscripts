// ==UserScript==
// @name         Grok Chat Exporter
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.6
// @description  Export grok.com conversations to Markdown, JSON, HTML, or plain text.
// @license      GPL-3.0-only
// @match        https://grok.com/*
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
    const base = (conversation.id ? `${title} - ${conversation.id}` : title).slice(0, MAX_FILENAME_LENGTH);
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
    status.textContent = "Loading conversation...";
    const conversation = await adapter.loadConversation(id, (message) => {
      status.textContent = message;
    });
    download(format.build(conversation), toFilename(conversation, format.ext), format.mime);
    status.textContent = `Exported ${format.label}.`;
  }
  async function copyCurrent(status, adapter) {
    const id = adapter.currentConversationId();
    if (!id) throw new Error("Open a conversation first.");
    status.textContent = "Loading conversation...";
    const conversation = await adapter.loadConversation(id, (message) => {
      status.textContent = message;
    });
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

  // src/providers/grok-normalize.js
  var ROLE_BY_SENDER = { human: "user", assistant: "assistant" };
  function normalizeGrokConversation(meta, tree, loaded) {
    const byId = new Map(loaded.responses.map((r) => [r.responseId, r]));
    const nodes = new Map(tree.responseNodes.map((n) => [n.responseId, n]));
    const parents = new Set(tree.responseNodes.map((n) => n.parentResponseId).filter(Boolean));
    const leaves = tree.responseNodes.filter((n) => !parents.has(n.responseId));
    const newest = (ids) => ids.reduce((best, id) => timeOf(byId.get(id)) > timeOf(byId.get(best)) ? id : best);
    let cur = leaves.length ? newest(leaves.map((n) => n.responseId)) : null;
    const branch = [];
    const seen = /* @__PURE__ */ new Set();
    while (cur && nodes.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      branch.push(byId.get(cur));
      cur = nodes.get(cur).parentResponseId || null;
    }
    branch.reverse();
    const messages = branch.filter(Boolean).map((r) => ({
      role: ROLE_BY_SENDER[r.sender],
      text: typeof r.message === "string" ? r.message.trim() : "",
      createTime: r.createTime ? Math.floor(Date.parse(r.createTime) / 1e3) : null
    })).filter((m) => m.role && m.text);
    return {
      id: meta.conversation?.conversationId ?? "",
      title: meta.conversation?.title || "Untitled conversation",
      createTime: meta.conversation?.createTime ? Math.floor(Date.parse(meta.conversation.createTime) / 1e3) : null,
      messages
    };
  }
  function timeOf(response) {
    return response?.createTime ? Date.parse(response.createTime) : 0;
  }

  // src/providers/grok.js
  var CONVERSATION_PATH = /^\/c\/([0-9a-f-]+)/i;
  var grokAdapter = {
    name: "Grok",
    currentConversationId() {
      return CONVERSATION_PATH.exec(location.pathname)?.[1] ?? null;
    },
    async loadConversation(id) {
      const meta = await getJson(`/rest/app-chat/conversations_v2/${id}?includeWorkspaces=true&includeTaskResult=true`);
      const tree = await getJson(`/rest/app-chat/conversations/${id}/response-node`);
      const loaded = await postJson(`/rest/app-chat/conversations/${id}/load-responses`, {
        responseIds: tree.responseNodes.map((n) => n.responseId)
      });
      return normalizeGrokConversation(meta, tree, loaded);
    },
    async listConversations() {
      const items = [];
      let token = null;
      do {
        const query = new URLSearchParams({ pageSize: "60" });
        if (token) query.set("pageToken", token);
        const page = await getJson(`/rest/app-chat/conversations?${query}`);
        for (const c of page.conversations ?? []) items.push({ id: c.conversationId, title: c.title });
        token = page.nextPageToken || null;
      } while (token);
      return items;
    }
  };
  async function getJson(path) {
    return request(path, { headers: { Accept: "application/json" } });
  }
  async function postJson(path, body) {
    return request(path, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  async function request(path, init) {
    const response = await fetch(path, { credentials: "include", ...init });
    if (response.status === 429) throw new Error("Grok is rate limiting requests; try again later.");
    if (!response.ok) throw new Error(`Grok request failed: ${response.status} ${path}`);
    return response.json();
  }

  // src/grok-entry.js
  mountWidget(grokAdapter);
})();
