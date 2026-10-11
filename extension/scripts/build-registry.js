// Writes registry/index.json from the userscripts in community-scripts-registry/.
// Each script is pinned by SHA-256 of the committed file, so the index must be
// rebuilt after any script changes and committed after the scripts.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildRegistryEntry } from "../src/userscript/registry-build.js";
import { parseRegistryIndex } from "../src/userscript/registry.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const community = join(root, "community-scripts-registry");

const entries = [];
for (const folder of (await readdir(community, { withFileTypes: true })).filter((d) => d.isDirectory())) {
  const files = (await readdir(join(community, folder.name))).filter((f) => f.endsWith(".user.js"));
  // A folder keeps only its newest version: the file with the highest semver-like version.
  const newest = files.sort((a, b) => versionOf(b).localeCompare(versionOf(a), undefined, { numeric: true }))[0];
  if (!newest) continue;
  const source = await readFile(join(community, folder.name, newest), "utf8");
  entries.push(await buildRegistryEntry(source, folder.name, newest));
}

entries.sort((a, b) => a.name.localeCompare(b.name));
const index = parseRegistryIndex({ schema: 1, scripts: entries });
await writeFile(join(root, "registry", "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`Wrote registry/index.json with ${entries.length} scripts`);

function versionOf(file) {
  return /-(\d+(?:\.\d+)*)\.user\.js$/.exec(file)?.[1] ?? "0";
}
