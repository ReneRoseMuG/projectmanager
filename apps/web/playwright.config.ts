import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

// Load .env.test into process.env so the worker fixtures (baseConnectionConfig) and the
// per-worker API servers inherit the local MySQL test credentials. The old global
// webServer did this; with per-worker servers the workers inherit it from this process.
loadDotenv({ path: path.join(repoRoot, ".env.test") });

/**
 * E2E configuration — per-worker isolation (MS-67).
 *
 * No global webServer and no shared database/session: each worker starts its own
 * API + Vite servers, database and admin session via the worker-scoped fixture in
 * tests/browser/web/worker-fixtures.ts. globalSetup builds the API once;
 * globalTeardown sweeps leftover worker databases/storage from crashed runs.
 *
 * Tests in one spec file run serially; different spec files run in parallel across
 * workers. Use E2E_WORKERS=1 for the serial fallback.
 */
export default defineConfig({
  testDir: "../../tests/browser/web",
  globalSetup: path.join(repoRoot, "tests/browser/global-setup.ts"),
  globalTeardown: path.join(repoRoot, "tests/browser/global-teardown.ts"),
  timeout: 30_000,
  workers: Number(process.env.E2E_WORKERS ?? (process.env.CI ? 4 : 2)),
  expect: {
    timeout: 5_000,
  },
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
