import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { WorkerStorage } from "./worker-storage.js";

/**
 * Per-worker API + Vite servers.
 *
 * Each Playwright worker runs its own built API server (apps/api/dist/index.js) against
 * its own database and storage, plus its own Vite dev server whose VITE_API_URL points
 * at that worker's API. This guarantees full isolation between parallel workers without
 * touching any production application code.
 *
 * The API build is produced once in global setup; this module only starts/stops processes.
 */

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const apiDir = path.join(repoRoot, "apps", "api");
const webDir = path.join(repoRoot, "apps", "web");
const apiEntry = path.join(apiDir, "dist", "index.js");
const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

export const DEFAULT_API_PORT_BASE = Number(process.env.PLAYWRIGHT_API_PORT_BASE ?? 3101);
export const DEFAULT_WEB_PORT_BASE = Number(process.env.PLAYWRIGHT_WEB_PORT_BASE ?? 5174);

export function workerApiPort(index: number): number {
  return DEFAULT_API_PORT_BASE + index;
}

export function workerWebPort(index: number): number {
  return DEFAULT_WEB_PORT_BASE + index;
}

export interface WorkerServers {
  apiPort: number;
  webPort: number;
  apiBaseUrl: string;
  webBaseUrl: string;
  stop: () => Promise<void>;
}

export interface StartWorkerServersOptions {
  index: number;
  dbName: string;
  db: { host: string; port: number; user: string; password: string };
  storage: WorkerStorage;
  startupTimeoutMs?: number;
}

async function waitForHttp(url: string, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      // Any HTTP answer (even 4xx) means the server is up and accepting connections.
      if (res.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label} at ${url}: ${String(lastError)}`);
}

function pipeLogs(child: ChildProcess, prefix: string): void {
  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(`${prefix} ${chunk.toString()}`);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`${prefix} ${chunk.toString()}`);
  });
}

function stopProcess(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.pid === undefined || child.exitCode !== null) {
      resolve();
      return;
    }
    const done = () => resolve();
    child.once("exit", done);
    if (process.platform === "win32") {
      // Kill the whole process tree (vite spawns esbuild children).
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      child.kill("SIGTERM");
    }
    // Safety net so teardown never hangs.
    setTimeout(() => resolve(), 5_000);
  });
}

export async function startWorkerServers(opts: StartWorkerServersOptions): Promise<WorkerServers> {
  const apiPort = workerApiPort(opts.index);
  const webPort = workerWebPort(opts.index);
  const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;
  const webBaseUrl = `http://127.0.0.1:${webPort}`;
  const startupTimeoutMs = opts.startupTimeoutMs ?? 120_000;

  const apiProc = spawn(process.execPath, [apiEntry], {
    cwd: apiDir,
    env: {
      ...process.env,
      NODE_ENV: "test",
      TASKMANAGER_TEST_MODE: "1",
      PORT: String(apiPort),
      DB_HOST: opts.db.host,
      DB_PORT: String(opts.db.port),
      DB_NAME: opts.dbName,
      DB_USER: opts.db.user,
      DB_PASSWORD: opts.db.password,
      DB_SSL: "false",
      UPLOAD_DIR: opts.storage.uploadDir,
      PREVIEW_CACHE_DIR: opts.storage.previewCacheDir,
      CONTENT_DIR: opts.storage.contentDir,
      CORS_ORIGIN: webBaseUrl,
      ADMIN_EMAIL: "admin@local",
      ADMIN_FIRST_NAME: "E2E",
      ADMIN_LAST_NAME: "Admin",
      ADMIN_INITIAL_PASSWORD: "password123",
      SESSION_SECRET: "playwright-session-secret-change-me-12345",
      ATTACHMENT_SYNC_ENABLED: "false",
      NOTIFICATIONS_ENABLED: "false",
      SFTP_HOST: "",
      SFTP_USER: "",
      SFTP_PASSWORD: ""
    },
    stdio: "pipe"
  });
  pipeLogs(apiProc, `[w${opts.index}:api]`);

  const viteProc = spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
    {
      cwd: webDir,
      env: {
        ...process.env,
        NODE_ENV: "test",
        VITE_API_URL: apiBaseUrl
      },
      stdio: "pipe"
    }
  );
  pipeLogs(viteProc, `[w${opts.index}:web]`);

  const stop = async () => {
    await Promise.all([stopProcess(viteProc), stopProcess(apiProc)]);
  };

  try {
    await waitForHttp(`http://127.0.0.1:${apiPort}/health`, startupTimeoutMs, `w${opts.index} api`);
    await waitForHttp(webBaseUrl, startupTimeoutMs, `w${opts.index} web`);
  } catch (error) {
    await stop();
    throw error;
  }

  return { apiPort, webPort, apiBaseUrl, webBaseUrl, stop };
}
