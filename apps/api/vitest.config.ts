import { defineConfig } from "vitest/config";
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runtimeRoot = path.join(repoRoot, "tests", ".runtime", "vitest");

// Load .env.test from repo root if present (takes precedence over process.env)
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};

export default defineConfig({
  test: {
    pool: "forks",
    fileParallelism: false,
    include: ["../../tests/unit/api/**/*.test.ts", "../../tests/integration/api/**/*.test.ts"],
    globalSetup: ["../../tests/setup/api/prepare-test-runtime.ts"],
    globals: false,
    testTimeout: 15_000,
    hookTimeout: 120_000,
    reporter: "verbose",
    // TEST_DB_* env vars configure the local MySQL for tests (separate from production DB).
    // Set them in .env.test (see .env.test.example) or via process.env.
    // ADMIN_EMAIL/PASSWORD are locked to the test-seed defaults so auth tests stay stable
    // regardless of the production .env configuration.
    env: {
      TEST_DB_HOST: testEnv.TEST_DB_HOST ?? process.env.TEST_DB_HOST ?? "127.0.0.1",
      TEST_DB_PORT: testEnv.TEST_DB_PORT ?? process.env.TEST_DB_PORT ?? "3306",
      TEST_DB_USER: testEnv.TEST_DB_USER ?? process.env.TEST_DB_USER ?? "root",
      TEST_DB_PASSWORD: testEnv.TEST_DB_PASSWORD ?? process.env.TEST_DB_PASSWORD ?? "",
      ADMIN_EMAIL: "admin@local",
      ADMIN_FIRST_NAME: "Test",
      ADMIN_LAST_NAME: "Admin",
      ADMIN_INITIAL_PASSWORD: "password123",
      ATTACHMENT_BASE_PATH: path.join(runtimeRoot, "uploads"),
      UPLOAD_DIR: path.join(runtimeRoot, "uploads"),
      PREVIEW_CACHE_DIR: path.join(runtimeRoot, "previews"),
      CONTENT_DIR: path.join(runtimeRoot, "content")
    }
  }
});
