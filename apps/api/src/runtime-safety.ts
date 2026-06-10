import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface RuntimeTargets {
  uploadDir: string;
  previewCacheDir: string;
  contentDir: string;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export const apiRoot = path.resolve(moduleDir, "..");
export const repoRoot = path.resolve(apiRoot, "..", "..");
export const testRuntimeRoot = path.resolve(repoRoot, "tests", ".runtime");
export const vitestRuntimeRoot = path.resolve(testRuntimeRoot, "vitest");

const protectedRuntimePaths = {
  uploadDir: path.resolve(apiRoot, "uploads"),
  previewCacheDir: path.resolve(apiRoot, "previews"),
  contentDir: path.resolve(apiRoot, "content"),
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

export function assertSafeTestDirectoryPath(directoryPath: string, context: "UPLOAD_DIR" | "PREVIEW_CACHE_DIR" | "CONTENT_DIR"): void {
  if (!isTestRuntime()) {
    return;
  }

  const resolvedPath = path.resolve(directoryPath);
  const protectedPath =
    context === "UPLOAD_DIR" ? protectedRuntimePaths.uploadDir :
    context === "PREVIEW_CACHE_DIR" ? protectedRuntimePaths.previewCacheDir :
    protectedRuntimePaths.contentDir;

  if (isSameOrInside(resolvedPath, protectedPath)) {
    throw new Error(`${context} must not point to the application filesystem while tests are running: ${resolvedPath}`);
  }
  if (!isAllowedTestPath(resolvedPath)) {
    throw new Error(`${context} must point to os.tmpdir() or tests/.runtime while tests are running: ${resolvedPath}`);
  }
}

export function assertSafeTestRuntimeTargets(targets: RuntimeTargets): void {
  assertSafeTestDirectoryPath(targets.uploadDir, "UPLOAD_DIR");
  assertSafeTestDirectoryPath(targets.previewCacheDir, "PREVIEW_CACHE_DIR");
  assertSafeTestDirectoryPath(targets.contentDir, "CONTENT_DIR");
}

// Only databases whose name starts with taskmanager_test or taskmanager_e2e may be
// created, migrated, seeded, truncated or dropped while tests are running. This keeps
// the production database (`taskmanager`, no suffix) and any unrelated schema off-limits
// for destructive test operations.
const allowedTestDatabaseNamePattern = /^taskmanager_(test|e2e)(_[a-z0-9_]+)?$/i;

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

export function isAllowedTestDatabaseName(dbName: string): boolean {
  return allowedTestDatabaseNamePattern.test(dbName);
}

export function isAllowedTestDatabaseHost(host: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const allowed = new Set(
    ["127.0.0.1", "localhost", "::1", env.TEST_DB_HOST]
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .map(normalizeHost)
  );
  return allowed.has(normalizeHost(host));
}

// Guards destructive database access during tests. No-op outside test mode, so the
// production runtime is never affected.
export function assertSafeTestDatabaseTarget(
  host: string,
  dbName: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  if (!isTestRuntime(env)) {
    return;
  }

  if (!isAllowedTestDatabaseName(dbName)) {
    throw new Error(
      `Refusing to use database "${dbName}" while tests are running: ` +
        `the name must match taskmanager_test* or taskmanager_e2e*.`
    );
  }

  if (!isAllowedTestDatabaseHost(host, env)) {
    throw new Error(
      `Refusing to use database host "${host}" while tests are running: ` +
        `host is not in the test allowlist (127.0.0.1, localhost, ::1, TEST_DB_HOST).`
    );
  }
}
