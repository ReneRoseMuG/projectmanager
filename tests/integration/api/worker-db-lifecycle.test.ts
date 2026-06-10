import mysql from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";

import { baseConnectionConfig } from "../../fixtures/api/db.js";
import {
  createWorkerDb,
  dropWorkerDb,
  workerDbName
} from "../../fixtures/e2e/worker-db.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - createWorkerDb legt eine isolierte, migrierte und geseedete E2E-Worker-DB an.
 * - Der Seed enthält den Admin-User (admin@local) und die Default-Katalogeinträge.
 * - dropWorkerDb entfernt die DB vollständig.
 *
 * Fehlerfälle:
 * - Erneuter createWorkerDb-Aufruf bei vorhandener Alt-DB startet sauber (drop-before-create).
 *
 * Ziel:
 * Den Per-Worker-DB-Lifecycle (AP03) gegen eine echte MySQL beweisen, ohne die
 * Produktions-DB zu berühren.
 */

// High index to avoid clashing with real Playwright worker databases.
const TEST_WORKER_INDEX = 9999;

async function adminConnection() {
  return mysql.createConnection(baseConnectionConfig());
}

afterAll(async () => {
  await dropWorkerDb(TEST_WORKER_INDEX);
});

describe("per-worker E2E database lifecycle", () => {
  it("creates a migrated, seeded database and drops it again", { timeout: 120_000 }, async () => {
    const handle = await createWorkerDb(TEST_WORKER_INDEX);
    expect(handle.dbName).toBe(workerDbName(TEST_WORKER_INDEX));

    const conn = await adminConnection();
    try {
      const [adminRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT email FROM \`${handle.dbName}\`.users WHERE id = 1`
      );
      expect(adminRows[0]?.email).toBe("admin@local");

      const [catalogRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM \`${handle.dbName}\`.catalog_entries`
      );
      expect(Number(catalogRows[0]?.c)).toBeGreaterThan(0);

      const [roleRows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM \`${handle.dbName}\`.roles`
      );
      expect(Number(roleRows[0]?.c)).toBe(3);
    } finally {
      await conn.end();
    }

    await dropWorkerDb(TEST_WORKER_INDEX);

    const check = await adminConnection();
    try {
      const [dbRows] = await check.query<mysql.RowDataPacket[]>(
        "SHOW DATABASES LIKE ?",
        [handle.dbName]
      );
      expect(dbRows.length).toBe(0);
    } finally {
      await check.end();
    }
  });

  it("recreates cleanly when a stale database from a previous run exists", { timeout: 180_000 }, async () => {
    await createWorkerDb(TEST_WORKER_INDEX);
    // Second call must not fail on the existing database (drop-before-create).
    const handle = await createWorkerDb(TEST_WORKER_INDEX);
    expect(handle.dbName).toBe(workerDbName(TEST_WORKER_INDEX));
  });
});
