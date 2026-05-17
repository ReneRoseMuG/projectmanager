import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const e2eRuntimeRoot = fileURLToPath(new URL("../api/.test-runtime/e2e", import.meta.url));
const apiPort = 3101;
const webPort = 5174;
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;
const webBaseUrl = `http://127.0.0.1:${webPort}`;

process.env.PLAYWRIGHT_API_BASE_URL = apiBaseUrl;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
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
        CONTENT_DIR: path.join(e2eRuntimeRoot, "content"),
        BACKUP_WORK_DIR: path.join(e2eRuntimeRoot, "backups"),
        PORT: String(apiPort),
        CORS_ORIGIN: webBaseUrl
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
