import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["tests/setup/unit.ts"],
          include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
          exclude: ["e2e/**", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          setupFiles: ["tests/setup/component.ts"],
          include: ["src/**/*.test.tsx"],
          exclude: ["e2e/**", "node_modules/**"],
        },
      },
    ],
  },
});
