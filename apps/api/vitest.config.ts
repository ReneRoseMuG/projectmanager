import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    include: ["../../tests/unit/api/**/*.test.ts", "../../tests/integration/api/**/*.test.ts"],
    globalSetup: ["../../tests/setup/api/prepare-test-runtime.ts"],
    globals: false,
    testTimeout: 10_000,
    reporter: "verbose"
  }
});
