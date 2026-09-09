import process from "node:process";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [preact()],
  clearScreen: false,
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
