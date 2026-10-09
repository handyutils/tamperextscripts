// Export widget shared by every site. The site-specific part is an adapter:
//   adapter.name                 display name
//   adapter.currentConversationId()  id of the conversation on this page, or null
//   adapter.loadConversation(id) -> normalized conversation
//   adapter.listConversations?() -> [{ id, title }] (enables "Export all")

import { toMarkdown, toJson, toHtml, toText, toFilename } from "./serializers.js";

const HOST_ID = "tamperextscripts-exporter";

const FORMATS = [
  { key: "markdown", label: "Markdown", ext: "md", mime: "text/markdown", build: toMarkdown },
  { key: "json", label: "JSON", ext: "json", mime: "application/json", build: toJson },
  { key: "html", label: "HTML", ext: "html", mime: "text/html", build: toHtml },
  { key: "text", label: "Plain text", ext: "txt", mime: "text/plain", build: toText },
];

export function mountWidget(adapter) {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: "open" });

  const actions = [
    ...FORMATS.map((f) => ({ key: f.key, label: `Export ${f.label}` })),
    { key: "copy", label: "Copy text" },
    { key: "screenshot", label: "Screenshot (not available yet)", disabled: true },
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

// One bundle file. Each conversation is processed on its own; a failure is
// recorded and does not stop the rest.
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
  const bundle = { exportedAt: new Date().toISOString(), count: exported.length, failed, conversations: exported };
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function styleElement() {
  const style = document.createElement("style");
  style.textContent = `
    .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; font: 13px system-ui, sans-serif; }
    .toggle { padding: 6px 12px; border: 1px solid #888; border-radius: 6px; background: #fff; color: #111; cursor: pointer; }
    .panel { position: absolute; right: 0; bottom: 36px; min-width: 220px; display: flex; flex-direction: column; gap: 4px; padding: 8px; border: 1px solid #888; border-radius: 8px; background: #fff; color: #111; box-shadow: 0 4px 16px rgba(0,0,0,.2); }
    .panel[hidden] { display: none; }
    .panel button { text-align: left; padding: 6px 8px; border: 0; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
    .panel button:hover:not(:disabled) { background: rgba(127,127,127,.15); }
    .panel button:disabled { opacity: .5; cursor: not-allowed; }
    .status { min-height: 1.2em; padding: 4px 8px; color: #555; }
    @media (prefers-color-scheme: dark) {
      .toggle, .panel { background: #202123; color: #ececf1; border-color: #555; }
      .status { color: #aaa; }
    }
  `;
  return style;
}
