// Dashboard for installing, enabling, and removing userscripts. It reads and
// writes the same storage the service worker watches, so changes take effect
// without a reload.

import { createScriptStore } from "./userscript/store.js";
import { toRegistrations } from "./userscript/registration.js";
import { parseRegistryIndex, verifySource } from "./userscript/registry.js";

// Community index. Published from the registry/ folder of this repository.
const REGISTRY_URL = "https://raw.githubusercontent.com/inboxxobni/tamperextscripts/master/registry/index.json";

const store = createScriptStore({
  get: (key) => chrome.storage.local.get(key),
  set: (obj) => chrome.storage.local.set(obj),
});

const els = {
  setup: document.getElementById("setup"),
  file: document.getElementById("file"),
  source: document.getElementById("source"),
  install: document.getElementById("install"),
  installError: document.getElementById("install-error"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  registryError: document.getElementById("registry-error"),
  registryEmpty: document.getElementById("registry-empty"),
  registry: document.getElementById("registry"),
};

if (!chrome.userScripts) {
  els.setup.hidden = false;
}

els.file.addEventListener("change", async () => {
  const file = els.file.files[0];
  if (file) els.source.value = await file.text();
});

els.install.addEventListener("click", async () => {
  hideError();
  try {
    await store.install(els.source.value);
    els.source.value = "";
    els.file.value = "";
    await render();
loadRegistry();

async function loadRegistry() {
  try {
    const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const index = parseRegistryIndex(await response.json());
    renderRegistry(index.scripts);
  } catch (error) {
    els.registryError.textContent = `Could not load the community registry: ${error.message}`;
    els.registryError.hidden = false;
  }
}

function renderRegistry(entries) {
  els.registryEmpty.hidden = entries.length > 0;
  els.registry.hidden = entries.length === 0;

  const body = els.registry.querySelector("tbody");
  body.replaceChildren(...entries.map(renderRegistryRow));
}

function renderRegistryRow(entry) {
  const row = document.createElement("tr");

  const name = document.createElement("td");
  const title = document.createElement("div");
  title.textContent = `${entry.name} ${entry.version}`;
  const license = document.createElement("div");
  license.className = "muted";
  license.textContent = entry.license;
  name.append(title, license);

  const description = document.createElement("td");
  description.textContent = entry.description;

  const action = document.createElement("td");
  const load = document.createElement("button");
  load.type = "button";
  load.textContent = "Load for review";
  load.addEventListener("click", () => loadForReview(entry));
  action.append(load);

  row.append(name, description, action);
  return row;
}

async function loadForReview(entry) {
  hideError();
  try {
    const response = await fetch(entry.url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const text = await response.text();
    if (!(await verifySource(text, entry.sha256))) {
      throw new Error(`"${entry.name}" does not match its published SHA-256. Not loaded.`);
    }
    els.source.value = text;
    els.source.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showError(error.message);
  }
}
  } catch (error) {
    showError(error.message);
  }
});

async function render() {
  const records = (await store.list()).sort((a, b) => a.meta.name.localeCompare(b.meta.name));
  els.empty.hidden = records.length > 0;
  els.list.hidden = records.length === 0;

  const body = els.list.querySelector("tbody");
  body.replaceChildren(...records.map(renderRow));
}

function renderRow(record) {
  const row = document.createElement("tr");

  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = record.enabled;
  enabled.addEventListener("change", async () => {
    await store.setEnabled(record.id, enabled.checked);
    await render();
loadRegistry();

async function loadRegistry() {
  try {
    const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const index = parseRegistryIndex(await response.json());
    renderRegistry(index.scripts);
  } catch (error) {
    els.registryError.textContent = `Could not load the community registry: ${error.message}`;
    els.registryError.hidden = false;
  }
}

function renderRegistry(entries) {
  els.registryEmpty.hidden = entries.length > 0;
  els.registry.hidden = entries.length === 0;

  const body = els.registry.querySelector("tbody");
  body.replaceChildren(...entries.map(renderRegistryRow));
}

function renderRegistryRow(entry) {
  const row = document.createElement("tr");

  const name = document.createElement("td");
  const title = document.createElement("div");
  title.textContent = `${entry.name} ${entry.version}`;
  const license = document.createElement("div");
  license.className = "muted";
  license.textContent = entry.license;
  name.append(title, license);

  const description = document.createElement("td");
  description.textContent = entry.description;

  const action = document.createElement("td");
  const load = document.createElement("button");
  load.type = "button";
  load.textContent = "Load for review";
  load.addEventListener("click", () => loadForReview(entry));
  action.append(load);

  row.append(name, description, action);
  return row;
}

async function loadForReview(entry) {
  hideError();
  try {
    const response = await fetch(entry.url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const text = await response.text();
    if (!(await verifySource(text, entry.sha256))) {
      throw new Error(`"${entry.name}" does not match its published SHA-256. Not loaded.`);
    }
    els.source.value = text;
    els.source.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showError(error.message);
  }
}
  });

  const name = document.createElement("td");
  const title = document.createElement("div");
  title.textContent = `${record.meta.name} ${record.meta.version}`;
  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = record.meta.description || record.meta.namespace;
  name.append(title, meta);

  const matches = document.createElement("td");
  const { warnings } = toRegistrations(record);
  matches.textContent = record.meta.matches.concat(record.meta.includes).join("\n") || "(no match rules)";
  for (const warning of warnings) {
    const note = document.createElement("div");
    note.className = "warn";
    note.textContent = warning;
    matches.append(note);
  }

  const actions = document.createElement("td");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", async () => {
    if (!confirm(`Remove "${record.meta.name}" and its saved values?`)) return;
    await store.remove(record.id);
    await render();
loadRegistry();

async function loadRegistry() {
  try {
    const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const index = parseRegistryIndex(await response.json());
    renderRegistry(index.scripts);
  } catch (error) {
    els.registryError.textContent = `Could not load the community registry: ${error.message}`;
    els.registryError.hidden = false;
  }
}

function renderRegistry(entries) {
  els.registryEmpty.hidden = entries.length > 0;
  els.registry.hidden = entries.length === 0;

  const body = els.registry.querySelector("tbody");
  body.replaceChildren(...entries.map(renderRegistryRow));
}

function renderRegistryRow(entry) {
  const row = document.createElement("tr");

  const name = document.createElement("td");
  const title = document.createElement("div");
  title.textContent = `${entry.name} ${entry.version}`;
  const license = document.createElement("div");
  license.className = "muted";
  license.textContent = entry.license;
  name.append(title, license);

  const description = document.createElement("td");
  description.textContent = entry.description;

  const action = document.createElement("td");
  const load = document.createElement("button");
  load.type = "button";
  load.textContent = "Load for review";
  load.addEventListener("click", () => loadForReview(entry));
  action.append(load);

  row.append(name, description, action);
  return row;
}

async function loadForReview(entry) {
  hideError();
  try {
    const response = await fetch(entry.url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const text = await response.text();
    if (!(await verifySource(text, entry.sha256))) {
      throw new Error(`"${entry.name}" does not match its published SHA-256. Not loaded.`);
    }
    els.source.value = text;
    els.source.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showError(error.message);
  }
}
  });
  actions.append(remove);

  const enabledCell = document.createElement("td");
  enabledCell.append(enabled);
  row.append(enabledCell, name, matches, actions);
  return row;
}

function showError(message) {
  els.installError.textContent = message;
  els.installError.hidden = false;
}

function hideError() {
  els.installError.hidden = true;
}

render();
loadRegistry();

async function loadRegistry() {
  try {
    const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Registry request failed: ${response.status}`);
    const index = parseRegistryIndex(await response.json());
    renderRegistry(index.scripts);
  } catch (error) {
    els.registryError.textContent = `Could not load the community registry: ${error.message}`;
    els.registryError.hidden = false;
  }
}

function renderRegistry(entries) {
  els.registryEmpty.hidden = entries.length > 0;
  els.registry.hidden = entries.length === 0;

  const body = els.registry.querySelector("tbody");
  body.replaceChildren(...entries.map(renderRegistryRow));
}

function renderRegistryRow(entry) {
  const row = document.createElement("tr");

  const name = document.createElement("td");
  const title = document.createElement("div");
  title.textContent = `${entry.name} ${entry.version}`;
  const license = document.createElement("div");
  license.className = "muted";
  license.textContent = entry.license;
  name.append(title, license);

  const description = document.createElement("td");
  description.textContent = entry.description;

  const action = document.createElement("td");
  const load = document.createElement("button");
  load.type = "button";
  load.textContent = "Load for review";
  load.addEventListener("click", () => loadForReview(entry));
  action.append(load);

  row.append(name, description, action);
  return row;
}

async function loadForReview(entry) {
  hideError();
  try {
    const response = await fetch(entry.url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const text = await response.text();
    if (!(await verifySource(text, entry.sha256))) {
      throw new Error(`"${entry.name}" does not match its published SHA-256. Not loaded.`);
    }
    els.source.value = text;
    els.source.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showError(error.message);
  }
}
