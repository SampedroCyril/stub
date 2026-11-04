import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// base relative : fonctionne sur https://<user>.github.io/<repo>/ quel que soit le nom du repo.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    // Version affichée dans Réglages : « 0.11.0 » s'affiche « 0.11 »
    __APP_VERSION__: JSON.stringify(pkg.version.replace(/\.0$/, "")),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify((process.env.GITHUB_SHA || "").slice(0, 7)),
  },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
});
