// Builds the code that runs a userscript inside the USER_SCRIPT world. The
// GM_* functions are passed to the script body as parameters, so the body can
// use them as bare identifiers exactly as it would under Tampermonkey. Each
// GM function is exposed only when the script declares the matching @grant.
//
// Calls go to the extension service worker through chrome.runtime.sendMessage
// and are answered by the bridge in background.js.

export function buildUserScriptCode(record) {
  const { meta } = record;
  const grants = new Set(meta.grants);
  const scriptId = JSON.stringify(record.id);
  const info = JSON.stringify({
    script: {
      name: meta.name,
      namespace: meta.namespace,
      version: meta.version,
      description: meta.description,
    },
  });

  const shims = [];
  const names = [];

  const add = (name, impl) => {
    if (!grants.has(name)) return;
    names.push(name);
    shims.push(`const ${name} = ${impl};`);
  };

  add(
    "GM_getValue",
    `(key, defaultValue) => __gm({ type: "gm", scriptId: ${scriptId}, op: "getValue", key, defaultValue })`,
  );
  add(
    "GM_setValue",
    `(key, value) => __gm({ type: "gm", scriptId: ${scriptId}, op: "setValue", key, value })`,
  );
  add(
    "GM_xmlhttpRequest",
    `(details) => __gm({ type: "gm", scriptId: ${scriptId}, op: "xmlhttpRequest", details })`,
  );

  // Body is wrapped in its own function so the GM_* names are plain bindings,
  // and the original source is kept byte-for-byte.
  return [
    "(() => {",
    `const GM_info = ${info};`,
    // The bridge answers { ok, value } or { ok, error }; surface errors to the script.
    `const __gm = (msg) => chrome.runtime.sendMessage(msg).then((r) => {
  if (!r || !r.ok) throw new Error((r && r.error) || "GM call failed");
  return r.value;
});`,
    ...shims,
    `(function (GM_info${names.map((n) => `, ${n}`).join("")}) {`,
    record.source,
    "\n})(GM_info" + names.map((n) => `, ${n}`).join("") + ");",
    "})();",
  ].join("\n");
}
