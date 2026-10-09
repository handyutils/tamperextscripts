// Community script registry: a JSON index of pre-built userscripts. Each entry
// pins the script's source by SHA-256, so the dashboard can refuse a download
// that does not match what the index promised.

const SCHEMA = 1;
const HEX_64 = /^[0-9a-f]{64}$/;

export function parseRegistryIndex(json) {
  if (json?.schema !== SCHEMA) {
    throw new Error(`Unsupported registry schema: ${json?.schema}`);
  }
  if (!Array.isArray(json.scripts)) {
    throw new Error("Registry index must have a scripts array.");
  }

  const seen = new Set();
  for (const entry of json.scripts) {
    for (const field of ["id", "name", "version", "url", "sha256"]) {
      if (typeof entry[field] !== "string" || entry[field] === "") {
        throw new Error(`Registry entry is missing ${field}.`);
      }
    }
    if (!entry.url.startsWith("https://")) {
      throw new Error(`Registry entry ${entry.id}: url must use https.`);
    }
    if (!HEX_64.test(entry.sha256)) {
      throw new Error(`Registry entry ${entry.id}: sha256 must be 64 hex characters.`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate registry id: ${entry.id}`);
    }
    seen.add(entry.id);
  }

  return json;
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySource(text, expectedSha256) {
  return (await sha256Hex(text)) === expectedSha256;
}
