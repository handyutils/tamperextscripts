// Answers GM_* calls that a userscript sends from the USER_SCRIPT world. Every
// call is checked against the stored script: it must exist, be enabled, and
// have declared the matching @grant. Nothing is answered on the script's say-so.

const GRANT_FOR_OP = {
  getValue: "GM_getValue",
  setValue: "GM_setValue",
  xmlhttpRequest: "GM_xmlhttpRequest",
};

export async function handleGmMessage(message, { store, fetchImpl = fetch }) {
  const script = await store.get(message.scriptId);
  if (!script || !script.enabled) {
    throw new Error("No enabled script matches this request.");
  }

  const grant = GRANT_FOR_OP[message.op];
  if (!grant) {
    throw new Error(`Unknown GM operation: ${message.op}`);
  }
  if (!script.meta.grants.includes(grant)) {
    throw new Error(`${grant} was not granted by this script.`);
  }

  switch (message.op) {
    case "getValue": {
      const stored = await store.getValue(message.scriptId, message.key);
      return stored === undefined ? message.defaultValue : stored;
    }
    case "setValue":
      await store.setValue(message.scriptId, message.key, message.value);
      return undefined;
    case "xmlhttpRequest":
      return performRequest(message.details, fetchImpl);
  }
}

async function performRequest(details, fetchImpl) {
  const url = new URL(details.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed in GM_xmlhttpRequest.");
  }

  const response = await fetchImpl(url.href, {
    method: details.method ?? "GET",
    headers: details.headers,
    body: details.data,
  });

  return {
    status: response.status,
    statusText: response.statusText,
    responseText: await response.text(),
    finalUrl: response.url || url.href,
  };
}
