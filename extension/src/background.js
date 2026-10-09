// Service worker for the userscript manager. It owns the chrome.userScripts
// registrations (cleared by Chrome on every extension update, so they are
// rebuilt on install, startup, and each storage change) and answers GM_* calls
// from running scripts through the bridge.

import { createScriptStore } from "./userscript/store.js";
import { toRegistrations } from "./userscript/registration.js";
import { handleGmMessage } from "./userscript/gm-bridge.js";

const store = createScriptStore({
  get: (key) => chrome.storage.local.get(key),
  set: (obj) => chrome.storage.local.set(obj),
});

// Serialize syncs so overlapping storage events cannot interleave
// unregister and register calls.
let syncChain = Promise.resolve();
function syncRegistrations() {
  syncChain = syncChain.then(doSync, doSync);
  return syncChain;
}

async function doSync() {
  await chrome.userScripts.configureWorld({ messaging: true });
  await chrome.userScripts.unregister();

  const registrations = [];
  for (const record of await store.list()) {
    if (!record.enabled) continue;
    const { registrations: scriptRegistrations, warnings } = toRegistrations(record);
    for (const warning of warnings) {
      console.warn(`[tamperextscripts] ${record.meta.name}: ${warning}`);
    }
    registrations.push(...scriptRegistrations);
  }

  if (registrations.length > 0) {
    await chrome.userScripts.register(registrations);
  }
}

chrome.runtime.onInstalled.addListener(() => syncRegistrations());
chrome.runtime.onStartup.addListener(() => syncRegistrations());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.scripts) {
    syncRegistrations();
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onUserScriptMessage.addListener((message, _sender, sendResponse) => {
  handleGmMessage(message, { store })
    .then((value) => sendResponse({ ok: true, value }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true; // keep the channel open for the async reply
});
