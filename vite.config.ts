import { defineConfig } from "vite";

/** GitHub Pages : https://<org>.github.io/jeu-maintenance-bts/ */
export default defineConfig({
  base: "/jeu-maintenance-bts/",
  server: { host: "0.0.0.0", port: 5173 },
  preview: { host: "0.0.0.0", port: 4173 },
});
