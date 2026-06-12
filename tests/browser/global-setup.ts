import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * Global E2E setup — build only.
 *
 * Per-worker isolation (see tests/browser/web/worker-fixtures.ts) spawns the built
 * API server (apps/api/dist/index.js) for every worker, so the API and its
 * shared-types dependency must be built once before the workers start. No global
 * database or session is created here anymore — each worker owns its own.
 */
export default async function globalSetup(): Promise<void> {
  console.log("[e2e] Building api (+ shared-types) for per-worker servers ...");
  execSync("npm run build -w apps/api", { cwd: repoRoot, stdio: "inherit" });
  console.log("[e2e] Build ready");
}
