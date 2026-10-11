// Builds community-registry entries from userscript source. Pure apart from the
// SHA-256 digest, so the entry always matches the file it describes.

import { parseMetadata } from "./metadata.js";
import { sha256Hex } from "./registry.js";

const RAW_BASE = "https://raw.githubusercontent.com/handyutils/tamperextscripts/master/community-scripts-registry";

export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Category by registry folder. Anything unlisted falls under "Other".
const CATEGORY_BY_FOLDER = {
  claudechatsexporter: "Chat export",
  chatgptchatsexporter: "Chat export",
  gptchatsexporter: "Chat export",
  geminichatsexporter: "Chat export",
  grokchatsexporter: "Chat export",
  mistralchatsexporter: "Chat export",
  deepseekchatsexporter: "Chat export",
  qwenchatsexporter: "Chat export",
  zaichatsexporter: "Chat export",
};

export function categoryFor(folder) {
  return CATEGORY_BY_FOLDER[folder] ?? "Other";
}

export function rawUrl(folder, file) {
  return `${RAW_BASE}/${folder}/${encodeURIComponent(file)}`;
}

export async function buildRegistryEntry(source, folder, file) {
  const meta = parseMetadata(source);
  const license = /^\/\/\s*@license\s+(.+)$/m.exec(source)?.[1].trim() ?? "GPL-3.0-only";
  return {
    id: slugify(meta.name),
    name: meta.name,
    version: meta.version,
    description: meta.description,
    url: rawUrl(folder, file),
    sha256: await sha256Hex(source),
    license,
    category: categoryFor(folder),
  };
}
