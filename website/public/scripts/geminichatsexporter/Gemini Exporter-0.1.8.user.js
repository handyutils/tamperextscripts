// ==UserScript==
// @name         Gemini Chat Exporter
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.8
// @description  Export Gemini conversations to Markdown, JSON, HTML, or plain text.
// @license      GPL-3.0-only
// @match        https://gemini.google.com/*
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

  // src/providers/gemini-normalize.js
  function normalizeGeminiConversation(meta, turns) {
    const messages = [];
    for (const turn of [...turns].reverse()) {
      const time = turn?.[4]?.[0] ?? null;
      const user = turn?.[2]?.[0]?.[0];
      const answer = turn?.[3]?.[0]?.[0]?.[1]?.[0];
      if (typeof user === "string" && user.trim()) messages.push({ role: "user", text: user.trim(), createTime: time });
      if (typeof answer === "string" && answer.trim()) messages.push({ role: "assistant", text: answer.trim(), createTime: time });
    }
    return { id: meta.id ?? "", title: meta.title || "Untitled conversation", createTime: null, messages };
  }
  function parseBatchResponse(text) {
    const line = text.split("\n").find((l) => l.includes("wrb.fr"));
    if (!line) return null;
    const payload = JSON.parse(line)[0]?.[2];
    return payload ? JSON.parse(payload) : null;
  }
  function extractAtToken(html) {
    return /"SNlM0e":"([^"]+)"/.exec(html)?.[1] ?? null;
  }

  // src/providers/gemini.js
  var CHAT_PATH = /\/app\/([0-9a-f]{16})/i;
  var ENDPOINT = "/_/BardChatUi/data/batchexecute";
  var titles = /* @__PURE__ */ new Map();
  var geminiAdapter = {
    name: "Gemini",
    currentConversationId() {
      return CHAT_PATH.exec(location.pathname)?.[1] ?? null;
    },
    async loadConversation(id, progress = () => {
    }) {
      progress("Reading your Gemini session...");
      const at = await requestToken();
      const turns = [];
      let cursor = null;
      do {
        const page = await rpc("hNvQHb", ["c_" + id, 100, cursor, 1, [1], [4], null, 1], at, `/app/${id}`);
        turns.push(...page?.[0] ?? []);
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
    }
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
      body
    });
    if (response.status === 429) throw new Error("Gemini is rate limiting requests; try again later.");
    if (!response.ok) throw new Error(`Gemini request failed: ${response.status} ${name}`);
    return parseBatchResponse(await response.text());
  }

  // src/gemini-entry.js
  mountWidget(geminiAdapter);
})();
