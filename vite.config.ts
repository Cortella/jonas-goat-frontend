import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/static": "http://127.0.0.1:4000",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // es2019: transpila optional chaining (?.) e nullish (??) para baixo. Sem
    // isso o Chromium antigo do react-snap (prerender) quebra com SyntaxError,
    // e ainda amplia a compatibilidade com navegadores mais velhos.
    target: "es2019",
  },
});
