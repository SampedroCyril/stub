import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relative : fonctionne sur https://<user>.github.io/<repo>/ quel que soit le nom du repo.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
});
