import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/api/src/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
