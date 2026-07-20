import { defineConfig } from "vitest/config";
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["../../tests/setup/api/prepare-test-runtime.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    env: {
      TEST_DB_HOST: testEnv.TEST_DB_HOST ?? process.env.TEST_DB_HOST ?? "127.0.0.1",
      TEST_DB_PORT: testEnv.TEST_DB_PORT ?? process.env.TEST_DB_PORT ?? "3306",
      TEST_DB_USER: testEnv.TEST_DB_USER ?? process.env.TEST_DB_USER ?? "root",
      TEST_DB_PASSWORD: testEnv.TEST_DB_PASSWORD ?? process.env.TEST_DB_PASSWORD ?? "",
      DB_SSL: "false",
      ADMIN_EMAIL: "admin@local",
      ADMIN_FIRST_NAME: "Test",
      ADMIN_LAST_NAME: "Admin",
      ADMIN_INITIAL_PASSWORD: "password123",
      ATTACHMENT_SYNC_ENABLED: "false",
      SFTP_HOST: "",
      SFTP_USER: "",
      SFTP_PASSWORD: ""
    }
  }
});
