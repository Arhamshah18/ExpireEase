import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { capacitorHtmlPlugin } from "./scripts/capacitor-html-plugin.mjs";

// Capacitor build: a static SPA with no Nitro server, emitted into public/ so
// `capacitor copy` can bundle it into the Android assets.
export default defineConfig({
  base: "./",
  build: {
    outDir: "public",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  resolve: { tsconfigPaths: true },
  plugins: [
    grokPwaPlugin(),
    appEnvPlugin(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    capacitorHtmlPlugin(),
  ],
});