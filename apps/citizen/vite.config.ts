import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API = process.env.HOPE_API_URL ?? "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "HOPE — disaster alerts and shelter",
        short_name: "HOPE",
        description: "Official disaster warnings, safe shelter booking and rescue requests.",
        theme_color: "#0f5c66",
        background_color: "#fcfcfc",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/v1\//],
        runtimeCaching: [
          {
            // Last known situation stays readable offline.
            urlPattern: ({ url }) => url.pathname === "/v1/public/me" || url.pathname === "/v1/public/shelters",
            handler: "NetworkFirst",
            options: { cacheName: "hope-api", networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    // Only the public API is reachable from the citizen app.
    proxy: { "/v1/public": { target: API } },
  },
  preview: { port: 4173, proxy: { "/v1/public": { target: API } } },
});
