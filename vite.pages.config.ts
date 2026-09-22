import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
const base = process.env.PAGES_BASE || "/tether/";
export default defineConfig({
  root: path.resolve(import.meta.dirname, "github-pages"),
  base,
  publicDir: path.resolve(import.meta.dirname, "public"),
  plugins: [react()],
  resolve: { alias: { "@": import.meta.dirname } },
  define: {
    __TETHER_API_ORIGIN__: JSON.stringify(process.env.TETHER_API_ORIGIN || "https://tether-voice-space.leolunelove.chatgpt.site"),
    __TETHER_BASE__: JSON.stringify(base),
  },
  build: { outDir: path.resolve(import.meta.dirname, "docs"), emptyOutDir: true },
});
