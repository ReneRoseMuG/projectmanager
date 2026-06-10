import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { testRuntimeRoot } from "../../../apps/api/src/runtime-safety.js";
import {
  cleanupWorkerStorage,
  prepareWorkerStorage,
  workerStoragePaths
} from "../../fixtures/e2e/worker-storage.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - prepareWorkerStorage legt isolierte Worker-Verzeichnisse unter tests/.runtime/e2e an.
 * - Jeder Worker-Index erhält einen eigenen Storage-Root.
 *
 * Fehlerfälle:
 * - prepareWorkerStorage räumt einen vorhandenen Worker-Root vor dem Neuaufbau ab.
 *
 * Ziel:
 * Die Per-Worker-Storage-Isolation (AP06) gegen das Dateisystem beweisen.
 */

const TEST_WORKER_INDEX = 4242;

afterEach(() => {
  cleanupWorkerStorage(TEST_WORKER_INDEX);
});

describe("per-worker E2E storage", () => {
  it("creates isolated upload/preview/content/backup directories under tests/.runtime/e2e", () => {
    const storage = prepareWorkerStorage(TEST_WORKER_INDEX);

    const runtimeRootResolved = path.resolve(testRuntimeRoot).toLowerCase();
    expect(path.resolve(storage.root).toLowerCase().startsWith(runtimeRootResolved)).toBe(true);

    for (const dir of [storage.uploadDir, storage.previewCacheDir, storage.contentDir, storage.backupDir]) {
      expect(fs.existsSync(dir)).toBe(true);
    }
  });

  it("gives different workers different roots", () => {
    expect(workerStoragePaths(0).root).not.toBe(workerStoragePaths(1).root);
  });

  it("wipes a stale worker root before recreating it", () => {
    const first = prepareWorkerStorage(TEST_WORKER_INDEX);
    const marker = path.join(first.uploadDir, "stale.txt");
    fs.writeFileSync(marker, "stale");

    prepareWorkerStorage(TEST_WORKER_INDEX);
    expect(fs.existsSync(marker)).toBe(false);
  });
});
