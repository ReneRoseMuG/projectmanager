import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const e2eRuntimeRoot = fileURLToPath(new URL("../../tests/.runtime/e2e", import.meta.url));
const apiPort = 3101;
const webPort = 5174;
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

process.env.PLAYWRIGHT_API_BASE_URL = apiBaseUrl;

export default defineConfig({
  testDir: "../../tests/browser/web",
  timeout: 30_000,
  workers: 1,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: webBaseUrl,
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
        DATABASE_PATH: path.join(e2eRuntimeRoot, "data", "taskmanager.sqlite"),
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
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: "npm run dev:e2e -w apps/web",
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        VITE_API_URL: apiBaseUrl
      },
      url: webBaseUrl,
      reuseExistingServer: false,
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
