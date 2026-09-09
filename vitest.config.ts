import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["tests/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "dom", environment: "jsdom", include: ["tests/**/*.test.tsx"] },
      },
    ],
  },
});
