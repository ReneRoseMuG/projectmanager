import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(apiRoot, "..", "..");
const defaultRuntimeRoot = path.join(repoRoot, "tests", ".runtime", "e2e");
const runtimeRoot = path.resolve(process.env.TASKMANAGER_TEST_RUNTIME_ROOT ?? defaultRuntimeRoot);
const allowedRoots = [path.join(repoRoot, "tests", ".runtime"), os.tmpdir()].map((root) => path.resolve(root).toLowerCase());

function isSameOrInside(targetPath, rootPath) {
  const target = path.resolve(targetPath).toLowerCase();
  const root = path.resolve(rootPath).toLowerCase();
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

if (process.env.TASKMANAGER_TEST_MODE !== "1" && process.env.NODE_ENV !== "test") {
  throw new Error("Refusing to prepare E2E runtime outside test mode.");
}

if (!allowedRoots.some((root) => isSameOrInside(runtimeRoot, root))) {
  throw new Error(`Refusing to remove E2E runtime outside a test root: ${runtimeRoot}`);
}

fs.rmSync(runtimeRoot, { recursive: true, force: true });
for (const subdir of ["data", "uploads", "previews", "content", "backups"]) {
  fs.mkdirSync(path.join(runtimeRoot, subdir), { recursive: true });
}

console.log(`Prepared isolated E2E runtime at ${runtimeRoot}`);
