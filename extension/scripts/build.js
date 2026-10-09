// Builds a loadable unpacked extension into dist/. MV3 content scripts and the
// service worker cannot rely on ES module loading from the extension, so each
// entry point is bundled into one IIFE file.
import { build } from "esbuild";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const entries = {
  "content.js": "src/content.js",
  "background.js": "src/background.js",
  "options.js": "src/options.js",
};

for (const [out, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [join(root, entry)],
    bundle: true,
    format: "iife",
    target: "chrome138",
    outfile: join(dist, out),
    legalComments: "inline",
  });
}

await copyFile(join(root, "manifest.json"), join(dist, "manifest.json"));
await copyFile(join(root, "src/options.html"), join(dist, "options.html"));
await cp(join(root, "icons"), join(dist, "icons"), { recursive: true });
console.log("Built extension in dist/");
