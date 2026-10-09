// Persists installed userscripts and their GM_* values. Takes a storage object
// with async get(key) / set(object) so it can run on chrome.storage.local in
// the extension and on an in-memory fake in tests.

import { parseMetadata } from "./metadata.js";

const SCRIPTS_KEY = "scripts";
const VALUES_KEY = "values";

export function createScriptStore(storage, newId = () => crypto.randomUUID()) {
  const readScripts = async () => (await storage.get(SCRIPTS_KEY))[SCRIPTS_KEY] ?? {};
  const writeScripts = (scripts) => storage.set({ [SCRIPTS_KEY]: scripts });
  const readValues = async () => (await storage.get(VALUES_KEY))[VALUES_KEY] ?? {};
  const writeValues = (values) => storage.set({ [VALUES_KEY]: values });

  return {
    async install(source) {
      const meta = parseMetadata(source);
      const scripts = await readScripts();

      // Same namespace and name means the same script: update it in place and
      // keep its id and enabled flag, so GM values and user choices survive.
      const existing = Object.values(scripts).find(
        (s) => s.meta.namespace === meta.namespace && s.meta.name === meta.name,
      );
      const record = {
        id: existing?.id ?? newId(),
        meta,
        source,
        enabled: existing?.enabled ?? true,
        installedAt: existing?.installedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      scripts[record.id] = record;
      await writeScripts(scripts);
      return record;
    },

    async list() {
      return Object.values(await readScripts());
    },

    async get(id) {
      return (await readScripts())[id];
    },

    async setEnabled(id, enabled) {
      const scripts = await readScripts();
      if (!scripts[id]) throw new Error(`No script with id ${id}`);
      scripts[id] = { ...scripts[id], enabled: Boolean(enabled) };
      await writeScripts(scripts);
    },

    async remove(id) {
      const scripts = await readScripts();
      delete scripts[id];
      await writeScripts(scripts);

      const values = await readValues();
      delete values[id];
      await writeValues(values);
    },

    async getValue(id, key) {
      return (await readValues())[id]?.[key];
    },

    async setValue(id, key, value) {
      const values = await readValues();
      values[id] = { ...(values[id] ?? {}), [key]: value };
      await writeValues(values);
    },

    async deleteValue(id, key) {
      const values = await readValues();
      if (values[id]) delete values[id][key];
      await writeValues(values);
    },
  };
}
