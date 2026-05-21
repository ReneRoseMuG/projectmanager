import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimeTargets {
  databasePath: string;
  uploadDir: string;
  previewCacheDir: string;
  contentDir: string;
  backupWorkDir: string;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const apiRoot = path.resolve(moduleDir, "..");
export const repoRoot = path.resolve(apiRoot, "..", "..");
export const testRuntimeRoot = path.resolve(repoRoot, "tests", ".runtime");
export const vitestRuntimeRoot = path.resolve(testRuntimeRoot, "vitest");
export const protectedDataRoot = path.resolve(apiRoot, "data");
export const protectedDatabasePath = path.resolve(protectedDataRoot, "taskmanager.sqlite");

const protectedRuntimePaths = {
  dataDir: protectedDataRoot,
  databasePath: protectedDatabasePath,
  uploadDir: path.resolve(apiRoot, "uploads"),
  previewCacheDir: path.resolve(apiRoot, "previews"),
  contentDir: path.resolve(apiRoot, "content"),
  backupWorkDir: path.resolve(repoRoot, "backups")
};

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const target = path.resolve(targetPath).toLowerCase();
  const root = path.resolve(rootPath).toLowerCase();
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isAllowedTestPath(targetPath: string): boolean {
  return isSameOrInside(targetPath, os.tmpdir()) || isSameOrInside(targetPath, testRuntimeRoot);
}

export function isTestRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "test" || env.VITEST === "true" || env.TASKMANAGER_TEST_MODE === "1";
}

export function assertSafeTestDatabasePath(databasePath: string, context = "DATABASE_PATH"): void {
  if (!isTestRuntime()) {
    return;
  }
  if (databasePath === ":memory:") {
    return;
  }

  const resolvedPath = path.resolve(databasePath);
  if (resolvedPath === protectedRuntimePaths.databasePath || isSameOrInside(resolvedPath, protectedRuntimePaths.dataDir)) {
    throw new Error(`${context} must not point to the application data directory while tests are running: ${resolvedPath}`);
  }
  if (!isAllowedTestPath(resolvedPath)) {
    throw new Error(`${context} must point to os.tmpdir() or tests/.runtime while tests are running: ${resolvedPath}`);
  }
}

export function assertSafeTestDirectoryPath(directoryPath: string, context: "UPLOAD_DIR" | "PREVIEW_CACHE_DIR" | "CONTENT_DIR" | "BACKUP_WORK_DIR"): void {
  if (!isTestRuntime()) {
    return;
  }

  const resolvedPath = path.resolve(directoryPath);
  const protectedPath =
    protectedRuntimePaths[context === "UPLOAD_DIR" ? "uploadDir" : context === "PREVIEW_CACHE_DIR" ? "previewCacheDir" : context === "CONTENT_DIR" ? "contentDir" : "backupWorkDir"];
  if (isSameOrInside(resolvedPath, protectedPath)) {
    throw new Error(`${context} must not point to the application filesystem while tests are running: ${resolvedPath}`);
  }
  if (!isAllowedTestPath(resolvedPath)) {
    throw new Error(`${context} must point to os.tmpdir() or tests/.runtime while tests are running: ${resolvedPath}`);
  }
}

export function assertSafeTestRuntimeTargets(targets: RuntimeTargets): void {
  assertSafeTestDatabasePath(targets.databasePath);
  assertSafeTestDirectoryPath(targets.uploadDir, "UPLOAD_DIR");
  assertSafeTestDirectoryPath(targets.previewCacheDir, "PREVIEW_CACHE_DIR");
  assertSafeTestDirectoryPath(targets.contentDir, "CONTENT_DIR");
  assertSafeTestDirectoryPath(targets.backupWorkDir, "BACKUP_WORK_DIR");
}
