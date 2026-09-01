import { config as loadDotenv } from "dotenv";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const e2eRuntimeRoot = path.join(repoRoot, "tests/.runtime/e2e");
const testEnv = loadDotenv({ path: path.join(repoRoot, ".env.test"), processEnv: {} }).parsed ?? {};

function dbConfig() {
  return {
    host: process.env.TEST_DB_HOST ?? testEnv.TEST_DB_HOST ?? "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT ?? testEnv.TEST_DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? testEnv.TEST_DB_USER ?? "root",
    password: process.env.TEST_DB_PASSWORD ?? testEnv.TEST_DB_PASSWORD ?? "",
  };
}

/**
 * Global E2E teardown — safety sweep.
 *
 * Each worker drops its own database and storage in the fixture's finally block.
 * This sweep only removes leftovers from a previously crashed run: any database
 * matching taskmanager_test_e2e_w<n> and the per-worker storage roots under
 * tests/.runtime/e2e/w<n>.
 */
export default async function globalTeardown(): Promise<void> {
  const conn = await mysql.createConnection(dbConfig());
  try {
    for (const pattern of ["taskmanager\\_test\\_e2e\\_w%", "taskmanager\\_e2e\\_w%"]) {
      const [rows] = await conn.query("SHOW DATABASES LIKE ?", [pattern]);
      for (const row of rows as Array<Record<string, string>>) {
        const dbName = Object.values(row)[0];
        // Defense in depth: only ever drop databases that match the worker pattern.
        if (dbName && /^taskmanager_(?:test_e2e|e2e)_w\d+$/.test(dbName)) {
          await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
          console.log(`[e2e] Swept leftover database ${dbName}`);
        }
      }
    }
  } finally {
    await conn.end();
  }

  if (fs.existsSync(e2eRuntimeRoot)) {
    for (const entry of fs.readdirSync(e2eRuntimeRoot)) {
      if (/^w\d+$/.test(entry)) {
        fs.rmSync(path.join(e2eRuntimeRoot, entry), { recursive: true, force: true });
      }
    }
  }
}
