// Builds the extension and packages dist/ into website/public/downloads/ as a
// zip, so the site can offer a direct download. Runs before `vite build`.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const websiteRoot = join(here, "..");
const extensionRoot = join(websiteRoot, "..", "extension");

execFileSync("npm", ["run", "build"], { cwd: extensionRoot, stdio: "inherit" });

const manifest = JSON.parse(readFileSync(join(extensionRoot, "dist", "manifest.json"), "utf8"));
const outDir = join(websiteRoot, "public", "downloads");
const zipName = `tamperextscripts-${manifest.version}.zip`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
// Zip the contents of dist/ so the manifest sits at the root, and "Load unpacked"
// works after unzipping.
execFileSync("zip", ["-qr", join(outDir, zipName), "."], {
  cwd: join(extensionRoot, "dist"),
  stdio: "inherit",
});
console.log(`Packaged public/downloads/${zipName}`);

// Copy every community userscript into public/scripts/<folder>/, so the site serves
// them from its own origin and the download attribute works. Raw GitHub links open
// as text in the browser instead of downloading.
const communityRoot = join(websiteRoot, "..", "community-scripts-registry");
const scriptsOut = join(websiteRoot, "public", "scripts");
rmSync(scriptsOut, { recursive: true, force: true });
let copied = 0;
for (const folder of readdirSync(communityRoot)) {
  const dir = join(communityRoot, folder);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".user.js"))) {
    mkdirSync(join(scriptsOut, folder), { recursive: true });
    copyFileSync(join(dir, file), join(scriptsOut, folder, file));
    copied++;
  }
}
console.log(`Copied ${copied} userscripts to public/scripts/`);
