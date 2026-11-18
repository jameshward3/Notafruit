import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served under a sub-path when hosted next to the public site (CLERKOS_BASE_PATH=/clerkos/).
const base = process.env.CLERKOS_BASE_PATH || "/";
// Under a sub-path the files must sit in that sub-folder too (dist/clerkos/...), so /clerkos/assets/* resolves on static hosting.
const subPath = base.replace(/^\/+|\/+$/g, "");

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev-only: production traffic goes through Nginx.
      "/api": { target: process.env.CLERKOS_API_URL || "http://localhost:8000", changeOrigin: false },
    },
  },
  build: { outDir: subPath ? `dist/${subPath}` : "dist", sourcemap: false },
});
