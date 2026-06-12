import { test as base } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createWorkerDb,
  dropWorkerDb,
  type WorkerDbHandle,
} from "../../fixtures/e2e/worker-db.js";
import {
  cleanupWorkerStorage,
  prepareWorkerStorage,
} from "../../fixtures/e2e/worker-storage.js";
import {
  startWorkerServers,
  type WorkerServers,
} from "../../fixtures/e2e/worker-servers.js";
import { createWorkerAuthState } from "../../fixtures/e2e/worker-auth.js";

/**
 * Worker-scoped E2E isolation (MS-67).
 *
 * Each Playwright worker (one per parallelIndex) owns a fully isolated stack:
 * its own database (taskmanager_e2e_w<index>), its own API + Vite servers on
 * dedicated ports, its own storage roots and its own admin session. The building
 * blocks live in tests/fixtures/e2e and are only wired together here, so parallel
 * browser workers never share global state — without touching production code.
 *
 * Tests within one spec file run serially; different spec files run in parallel
 * across workers (Playwright default — no fullyParallel).
 */

const authRoot = fileURLToPath(new URL("../../.runtime/e2e/.auth", import.meta.url));

export interface WorkerIsolation {
  index: number;
  db: WorkerDbHandle;
  servers: WorkerServers;
  authFile: string;
}

export const test = base.extend<object, { workerIsolation: WorkerIsolation }>({
  workerIsolation: [
    async ({}, use, workerInfo) => {
      // parallelIndex (0..workers-1) keeps ports/db/storage stable even when a
      // worker is restarted, and matches workerApiPort()/TEST_PARALLEL_INDEX.
      const index = workerInfo.parallelIndex;
      const db = await createWorkerDb(index);
      const storage = prepareWorkerStorage(index);
      const servers = await startWorkerServers({ index, dbName: db.dbName, db, storage });
      const authFile = path.join(authRoot, `w${index}.json`);
      await createWorkerAuthState(servers.apiBaseUrl, authFile);
      try {
        await use({ index, db, servers, authFile });
      } finally {
        await servers.stop();
        await dropWorkerDb(index);
        cleanupWorkerStorage(index);
      }
    },
    { scope: "worker", auto: true },
  ],

  // Per-worker browser target + session, derived from this worker's own stack.
  baseURL: async ({ workerIsolation }, use) => {
    await use(workerIsolation.servers.webBaseUrl);
  },

  storageState: async ({ workerIsolation }, use) => {
    await use(workerIsolation.authFile);
  },
});

export * from "@playwright/test";
