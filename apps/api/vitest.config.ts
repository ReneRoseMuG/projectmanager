import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globals: false,
    testTimeout: 10_000,
    reporter: "verbose"
  }
});
