// Builds a loadable unpacked extension into dist/. Content scripts cannot use
// ES module imports in MV3, so src/content.js is bundled into one IIFE file.
import { build } from "esbuild";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: [join(root, "src/content.js")],
  bundle: true,
  format: "iife",
  target: "chrome120",
  outfile: join(dist, "content.js"),
  legalComments: "inline",
});

await copyFile(join(root, "manifest.json"), join(dist, "manifest.json"));
await cp(join(root, "icons"), join(dist, "icons"), { recursive: true });
console.log("Built extension in dist/");
