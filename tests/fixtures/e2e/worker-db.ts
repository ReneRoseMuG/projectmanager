import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

import * as schema from "../../../apps/api/src/db/schema.js";
import { assertSafeTestDatabaseTarget } from "../../../apps/api/src/runtime-safety.js";
import {
  baseConnectionConfig,
  seedDefaultAuth,
  seedDefaultCatalogEntries
} from "../api/db.js";

/**
 * Per-worker E2E database lifecycle.
 *
 * Each Playwright worker owns an isolated database `taskmanager_test_e2e_w<index>` so that
 * parallel browser workers never share global state (settings, dashboards, catalog,
 * sessions). The same seeding logic as the integration test database is reused, so
 * there is only one source of truth for the default auth + catalog seed.
 */

export interface WorkerDbHandle {
  dbName: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

export function workerDbName(index: number): string {
  return `taskmanager_test_e2e_w${index}`;
}

const migrationsFolder = fileURLToPath(
  new URL("../../../apps/api/src/db/migrations", import.meta.url)
);

/**
 * Creates a fresh, migrated and seeded database for the given worker index.
 * Drops any leftover database from a previously crashed run first, so a worker
 * always starts from a clean, deterministic state.
 */
export async function createWorkerDb(index: number): Promise<WorkerDbHandle> {
  const dbName = workerDbName(index);
  const connConfig = baseConnectionConfig();

  // Refuse to touch anything but an approved temporary E2E database.
  assertSafeTestDatabaseTarget(connConfig.host, dbName);

  const adminConn = await mysql.createConnection(connConfig);
  try {
    await adminConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await adminConn.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConn.end();
  }

  const pool = mysql.createPool({ ...connConfig, database: dbName, connectionLimit: 5 });
  try {
    const db = drizzle({ client: pool, schema });
    await migrate(db, {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations_taskmanager"
    });
    await seedDefaultAuth(pool);
    await seedDefaultCatalogEntries(pool);
  } finally {
    await pool.end();
  }

  return { dbName, ...connConfig };
}

/**
 * Drops the worker database. Safe to call even if it does not exist.
 */
export async function dropWorkerDb(index: number): Promise<void> {
  const dbName = workerDbName(index);
  const connConfig = baseConnectionConfig();

  assertSafeTestDatabaseTarget(connConfig.host, dbName);

  const adminConn = await mysql.createConnection(connConfig);
  try {
    await adminConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } finally {
    await adminConn.end();
  }
}
