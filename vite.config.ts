import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const racine = dirname(fileURLToPath(import.meta.url));

/** GitHub Pages : https://<org>.github.io/jeu-maintenance-bts/ */
export default defineConfig({
  base: "/jeu-maintenance-bts/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(racine, "index.html"),
        prof: resolve(racine, "prof.html"),
      },
    },
  },
  server: { host: "0.0.0.0", port: 5173 },
  preview: { host: "0.0.0.0", port: 4173 },
});
