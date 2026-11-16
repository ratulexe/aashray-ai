import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const API = process.env.HOPE_API_URL ?? "http://127.0.0.1:4000";
const noindex = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * MapLibre 6 parses tiles in an ES-module web worker that imports a shared
 * chunk next to it. Bundlers break that pairing, so we serve MapLibre's own
 * worker files untouched at /maplibre/ (dev) and emit them as-is (build).
 */
function maplibreWorker(): Plugin {
  const dist = dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")) + "/dist";
  const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
  return {
    name: "hope:maplibre-worker",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\/maplibre\//, "");
        if (!req.url?.startsWith("/maplibre/") || !name || !files.includes(name)) return next();
        res.setHeader("Content-Type", "text/javascript");
        res.end(readFileSync(join(dist, name)));
      });
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({ type: "asset", fileName: `maplibre/${name}`, source: readFileSync(join(dist, name)) });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), maplibreWorker()],
  server: {
    port: 5174,
    strictPort: true,
    headers: noindex,
    // Only the staff API is reachable from the console.
    proxy: { "/v1/staff": { target: API } },
  },
  preview: { port: 4174, headers: noindex, proxy: { "/v1/staff": { target: API } } },
  build: { chunkSizeWarningLimit: 1200 },
});
