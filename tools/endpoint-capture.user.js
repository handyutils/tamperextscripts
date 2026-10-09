// ==UserScript==
// @name         tamperextscripts endpoint capture
// @namespace    https://github.com/handyutils/tamperextscripts
// @version      0.1.0
// @description  Records the chat-related web requests a site makes, so an exporter adapter can be written. Stores only URL paths, parameter names, status codes, and response key names. Never message text.
// @license      GPL-3.0-only
// @match        https://grok.com/*
// @match        https://chat.deepseek.com/*
// @match        https://chat.mistral.ai/*
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
(() => {
  const PATTERN = /(api|backend|rest|conversation|chat|history|session|thread|batch|rpc)/i;
  const seen = [];

  const record = (method, url, status, body) => {
    const u = new URL(url, location.origin);
    if (u.origin !== location.origin || !PATTERN.test(u.pathname)) return;
    let shape = null;
    try {
      const json = JSON.parse(body);
      shape = Array.isArray(json)
        ? { type: "array", length: json.length, firstItemKeys: json[0] && typeof json[0] === "object" ? Object.keys(json[0]) : null }
        : { type: "object", keys: json && typeof json === "object" ? Object.keys(json) : null };
    } catch {
      shape = { type: "non-json" };
    }
    seen.push({
      method,
      path: u.pathname,
      params: [...u.searchParams.keys()],
      status,
      response: shape,
    });
  };

  const originalFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = (init.method || (input && input.method) || "GET").toUpperCase();
    const response = await originalFetch(input, init);
    response.clone().text().then((body) => record(method, url, response.status, body)).catch(() => {});
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener("load", () => record(method.toUpperCase(), String(url), this.status, this.responseText));
    return originalOpen.call(this, method, url, ...rest);
  };

  // Copies a summary to the clipboard. Paths and key names only, no content.
  const button = document.createElement("button");
  button.textContent = "Copy endpoint summary";
  Object.assign(button.style, {
    position: "fixed", right: "16px", bottom: "16px", zIndex: 2147483000,
    padding: "8px 12px", border: "0", borderRadius: "8px",
    background: "#0F766E", color: "#fff", fontWeight: "600", cursor: "pointer",
  });
  button.addEventListener("click", async () => {
    const summary = JSON.stringify(seen, null, 2);
    await navigator.clipboard.writeText(summary);
    button.textContent = `Copied ${seen.length} requests`;
  });
  document.addEventListener("DOMContentLoaded", () => document.body.append(button));
})();
