import fs from "node:fs";
import path from "node:path";
import { vitestRuntimeRoot } from "../../../apps/api/src/runtime-safety.js";

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const target = path.resolve(targetPath).toLowerCase();
  const root = path.resolve(rootPath).toLowerCase();
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function setup(): void {
  const resolvedRuntimeRoot = path.resolve(vitestRuntimeRoot);
  const allowedRoot = path.resolve(vitestRuntimeRoot, "..").toLowerCase();

  if (!isSameOrInside(resolvedRuntimeRoot, allowedRoot)) {
    throw new Error(`Refusing to prepare test runtime outside tests/.runtime: ${resolvedRuntimeRoot}`);
  }

  fs.rmSync(resolvedRuntimeRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(resolvedRuntimeRoot, "databases"), { recursive: true });
}
