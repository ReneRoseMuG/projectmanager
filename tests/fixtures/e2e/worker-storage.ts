import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertSafeTestRuntimeTargets } from "../../../apps/api/src/runtime-safety.js";

/**
 * Per-worker E2E storage roots.
 *
 * Each Playwright worker gets its own uploads/previews/content/backups directories
 * under `tests/.runtime/e2e/w<index>` so that file operations of parallel workers never
 * collide. The directories are validated through the runtime safety guard before use.
 */

export interface WorkerStorage {
  root: string;
  uploadDir: string;
  previewCacheDir: string;
  contentDir: string;
  backupDir: string;
}

const e2eRuntimeRoot = fileURLToPath(new URL("../../.runtime/e2e", import.meta.url));

export function workerStoragePaths(index: number): WorkerStorage {
  const root = path.join(e2eRuntimeRoot, `w${index}`);
  return {
    root,
    uploadDir: path.join(root, "uploads"),
    previewCacheDir: path.join(root, "previews"),
    contentDir: path.join(root, "content"),
    backupDir: path.join(root, "backups")
  };
}

/**
 * Removes any leftover worker storage and recreates the isolated directory tree.
 * Returns the storage paths so the worker server can be started against them.
 */
export function prepareWorkerStorage(index: number): WorkerStorage {
  const storage = workerStoragePaths(index);

  // Refuse to point storage at the application filesystem while tests run.
  assertSafeTestRuntimeTargets({
    uploadDir: storage.uploadDir,
    previewCacheDir: storage.previewCacheDir,
    contentDir: storage.contentDir
  });

  fs.rmSync(storage.root, { recursive: true, force: true });
  for (const dir of [storage.uploadDir, storage.previewCacheDir, storage.contentDir, storage.backupDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return storage;
}

export function cleanupWorkerStorage(index: number): void {
  fs.rmSync(workerStoragePaths(index).root, { recursive: true, force: true });
}
