import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/prepare-test-runtime.ts"],
    globals: false,
    testTimeout: 10_000,
    reporter: "verbose"
  }
});
