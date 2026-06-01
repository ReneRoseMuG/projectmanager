import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const e2eRuntimeRoot = fileURLToPath(new URL("../../tests/.runtime/e2e", import.meta.url));
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? process.env.PORT ?? 3101);
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 5174);
const dbName = process.env.DB_NAME ?? "taskmanager_e2e";
const authFile = path.join(e2eRuntimeRoot, ".auth", "admin.json");
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

// Load .env.test from repo root to pick up TEST_DB_* credentials (same source as vitest)
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};

process.env.PLAYWRIGHT_API_BASE_URL = apiBaseUrl;
process.env.PLAYWRIGHT_WEB_BASE_URL = webBaseUrl;
process.env.PLAYWRIGHT_AUTH_FILE = authFile;
process.env.DB_NAME = dbName;

export default defineConfig({
  testDir: "../../tests/browser/web",
  globalSetup: path.join(repoRoot, "tests/browser/global-setup.ts"),
  globalTeardown: path.join(repoRoot, "tests/browser/global-teardown.ts"),
  timeout: 30_000,
  workers: process.env.CI ? 4 : 2,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: webBaseUrl,
    storageState: authFile,
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev:e2e -w apps/api",
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        TASKMANAGER_TEST_MODE: "1",
        TASKMANAGER_TEST_RUNTIME_ROOT: e2eRuntimeRoot,
        DB_HOST: process.env.DB_HOST ?? testEnv.TEST_DB_HOST ?? "127.0.0.1",
        DB_PORT: process.env.DB_PORT ?? testEnv.TEST_DB_PORT ?? "3306",
        DB_NAME: dbName,
        DB_USER: process.env.DB_USER ?? testEnv.TEST_DB_USER ?? "taskmanager",
        DB_PASSWORD: process.env.DB_PASSWORD ?? testEnv.TEST_DB_PASSWORD ?? "",
        UPLOAD_DIR: path.join(e2eRuntimeRoot, "uploads"),
        PREVIEW_CACHE_DIR: path.join(e2eRuntimeRoot, "previews"),
        CONTENT_DIR: path.join(e2eRuntimeRoot, "content"),
        BACKUP_WORK_DIR: path.join(e2eRuntimeRoot, "backups"),
        PORT: String(apiPort),
        CORS_ORIGIN: webBaseUrl,
        ADMIN_EMAIL: "admin@local",
        ADMIN_FIRST_NAME: "E2E",
        ADMIN_LAST_NAME: "Admin",
        ADMIN_INITIAL_PASSWORD: "password123",
        SESSION_SECRET: "playwright-session-secret-change-me-12345"
      },
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
      timeout: 120_000
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        VITE_API_URL: apiBaseUrl
      },
      url: webBaseUrl,
      reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
