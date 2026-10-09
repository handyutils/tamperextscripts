import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://handyutils.github.io/tamperextscripts/, so every asset
// URL must be prefixed with the repository name.
export default defineConfig({
  base: "/tamperextscripts/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
