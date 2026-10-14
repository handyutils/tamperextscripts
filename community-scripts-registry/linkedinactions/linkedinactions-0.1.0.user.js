// ==UserScript==
// @name         linkedinactions
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.0
// @description  Quick LinkedIn actions: copy this profile URL, or copy the profile URLs of all open LinkedIn tabs.
// @license      GPL-3.0-only
// @match        https://www.linkedin.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
(() => {
  // src/linkedin/profile-urls.js
  var PROFILE_PATH = /^\/in\/([^/?#]+)/;
  function canonicalProfileUrl(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
    const slug = PROFILE_PATH.exec(url.pathname)?.[1];
    if (!slug) return null;
    return `https://www.linkedin.com/in/${slug}/`;
  }
  function collectProfiles(hrefs) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const href of hrefs) {
      const canonical = canonicalProfileUrl(href);
      if (canonical && !seen.has(canonical)) {
        seen.add(canonical);
        out.push(canonical);
      }
    }
    return out;
  }
  function formatList(urls) {
    return urls.join("\n");
  }

  // src/linkedin/gather.js
  async function gatherProfiles(bus, ownHref, { timeoutMs = 700, newId = () => crypto.randomUUID() } = {}) {
    const id = newId();
    const hrefs = [ownHref];
    const off = bus.on((message) => {
      if (message?.t === "here" && message.id === id && typeof message.url === "string") {
        hrefs.push(message.url);
      }
    });
    bus.send({ t: "whois", id });
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    off();
    return collectProfiles(hrefs);
  }

  // src/linkedin-entry.js
  var HOST_ID = "linkedinactions";
  var CHANNEL = "tamperextscripts-linkedinactions";
  var ACTIONS = [
    { key: "open-profiles", label: "Clipboard open tabs LinkedIn profiles" },
    { key: "current", label: "Copy this profile URL" },
    { key: "templates", label: "Quick message templates (coming later)", disabled: true }
  ];
  if (!document.getElementById(HOST_ID)) {
    const bus = channelBus(CHANNEL);
    answerRequests(bus);
    mount(bus);
  }
  function channelBus(name) {
    const channel = new BroadcastChannel(name);
    return {
      send: (message) => channel.postMessage(message),
      on(handler) {
        const listener = (event) => handler(event.data);
        channel.addEventListener("message", listener);
        return () => channel.removeEventListener("message", listener);
      },
      handle(handler) {
        channel.addEventListener("message", (event) => handler(event.data));
      }
    };
  }
  function answerRequests(bus) {
    bus.handle((message) => {
      if (message?.t === "whois") {
        bus.send({ t: "here", id: message.id, url: location.href });
      }
    });
  }
  function mount(bus) {
    const host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.append(host);
    const root = host.attachShadow({ mode: "open" });
    root.append(styles(), menu(root, bus));
  }
  function menu(root, bus) {
    const wrap = el("div", { class: "wrap" });
    const toggle = el("button", { class: "toggle", type: "button", "aria-haspopup": "true", "aria-expanded": "false" }, "LinkedIn actions");
    const panel = el("div", { class: "panel", hidden: "" });
    const status = el("div", { class: "status", role: "status" });
    for (const action of ACTIONS) {
      const button = el("button", { type: "button", "data-action": action.key }, action.label);
      button.disabled = Boolean(action.disabled);
      if (!action.disabled) button.addEventListener("click", () => run(action.key, button, status, bus));
      panel.append(button);
    }
    panel.append(status);
    toggle.addEventListener("click", () => {
      const open = panel.hasAttribute("hidden");
      panel.toggleAttribute("hidden", !open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    wrap.append(toggle, panel);
    return wrap;
  }
  async function run(key, button, status, bus) {
    button.disabled = true;
    try {
      if (key === "current") {
        const url = canonicalProfileUrl(location.href);
        if (!url) throw new Error("This page is not a LinkedIn profile.");
        await navigator.clipboard.writeText(url);
        status.textContent = "Copied this profile URL.";
      } else if (key === "open-profiles") {
        status.textContent = "Asking open LinkedIn tabs...";
        const urls = await gatherProfiles(bus, location.href);
        if (urls.length === 0) {
          status.textContent = "No profile tabs found. Reload those tabs so they run this script.";
          return;
        }
        await navigator.clipboard.writeText(formatList(urls));
        status.textContent = `Copied ${urls.length} profile URL${urls.length === 1 ? "" : "s"}.`;
      }
    } catch (error) {
      status.textContent = `Failed: ${error.message}`;
      console.error("[linkedinactions]", error);
    } finally {
      button.disabled = false;
    }
  }
  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function styles() {
    const style = document.createElement("style");
    style.textContent = `
    .wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; font: 13px system-ui, sans-serif; }
    .toggle { padding: 8px 14px; border: 0; border-radius: 8px; background: #0F766E; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(15,118,110,.35); }
    .toggle:hover { background: #0b5c56; }
    .panel { position: absolute; right: 0; bottom: 42px; min-width: 260px; display: flex; flex-direction: column; gap: 2px; padding: 8px; border: 1px solid #0F766E; border-radius: 10px; background: #fff; color: #13211f; box-shadow: 0 6px 20px rgba(15,118,110,.25); }
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
})();
