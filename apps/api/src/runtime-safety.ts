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
