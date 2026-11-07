import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev/preview: forward API + uploaded media to Django so the SPA is same-origin
// (no CORS needed locally). Override the target with BACKEND_URL.
const target = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const proxy = { "/api": { target }, "/media": { target } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: { sourcemap: false, chunkSizeWarningLimit: 600 },
});
