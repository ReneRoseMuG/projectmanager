/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL (createTestDb migriert die reale Migrationskette). Die AP-0.1-Migration
 *   wird als rohes SQL exakt wie vom Drizzle-Migrator (Split an "--> statement-breakpoint")
 *   erneut/rückwärts gefahren.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Einzige technische Beigabe: eine zweite Verbindung mit multipleStatements=true,
 *   damit die idempotente Stored Procedure (mehrere Statements) am Stück ausführbar ist — ohne
 *   Einfluss auf das geprüfte Verhalten.
 *
 * Isolation:
 * - Temp-DB pro Suite (createTestDb), am Ende gedroppt.
 *
 * Abgedeckte Regeln:
 * - Migration legt auf frischer DB alle 4 Tabellen + events.origin/readonly an
 * - Unique- und Fremdschlüssel-Constraints sind gesetzt
 * - Idempotenz: erneutes Ausführen wirft nicht und verliert keine Daten (Abbruchsicherheit)
 * - up -> down -> up: down entfernt sauber, erneutes up stellt die Struktur wieder her
 *
 * Fehlerfälle:
 * - Wiederholtes up auf bereits migrierter DB darf NICHT fehlschlagen (Resume nach Abbruch)
 *
 * Ziel:
 * Nachweis, dass die AP-0.1-Migration gegen die zentrale (remote) MySQL abbruchsicher und
 * reversibel ist.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseConnectionConfig, createTestDb, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(new URL("../../../apps/api/src/db/migrations/20260705131235_dazzling_abomination/migration.sql", import.meta.url));
const NEW_TABLES = ["calendar_connections", "external_calendars", "calendar_sync_states", "event_mappings"] as const;

type CountRow = { c: number };

async function runMigration(conn: mysql.Connection): Promise<void> {
  const raw = await readFile(MIGRATION_SQL, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await conn.query(statement);
  }
}

async function runDown(conn: mysql.Connection): Promise<void> {
  await conn.query("SET FOREIGN_KEY_CHECKS=0");
  for (const table of ["event_mappings", "calendar_sync_states", "external_calendars", "calendar_connections"]) {
    await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await conn.query("ALTER TABLE `events` DROP COLUMN `origin`");
  await conn.query("ALTER TABLE `events` DROP COLUMN `readonly`");
  await conn.query("SET FOREIGN_KEY_CHECKS=1");
}

async function tableExists(conn: mysql.Connection, table: string): Promise<boolean> {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [table]);
  return Number((rows as CountRow[])[0].c) > 0;
}

async function columnExists(conn: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column]
  );
  return Number((rows as CountRow[])[0].c) > 0;
}

async function constraintExists(conn: mysql.Connection, table: string, name: string, type: string): Promise<boolean> {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS c FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ?",
    [table, name, type]
  );
  return Number((rows as CountRow[])[0].c) > 0;
}

describe("Calendar-Sync Migration (AP-0.1)", () => {
  let testDb: TestDb;
  let conn: mysql.Connection;

  beforeAll(async () => {
    testDb = await createTestDb();
    conn = await mysql.createConnection({ ...baseConnectionConfig(), database: testDb.dbName, multipleStatements: true });
  });

  afterAll(async () => {
    await conn?.end();
    await testDb?.close();
  });

  it("legt nach der Migration alle vier Tabellen und die events-Spalten an", async () => {
    for (const table of NEW_TABLES) {
      expect(await tableExists(conn, table)).toBe(true);
    }
    expect(await columnExists(conn, "events", "origin")).toBe(true);
    expect(await columnExists(conn, "events", "readonly")).toBe(true);
  });

  it("setzt Unique- und Fremdschlüssel-Constraints", async () => {
    expect(await constraintExists(conn, "event_mappings", "event_mappings_connection_external_unique", "UNIQUE")).toBe(true);
    expect(await constraintExists(conn, "external_calendars", "external_calendars_connection_external_unique", "UNIQUE")).toBe(true);
    expect(await constraintExists(conn, "event_mappings", "event_mappings_local_event_id_events_id_fkey", "FOREIGN KEY")).toBe(true);
    expect(await constraintExists(conn, "calendar_connections", "calendar_connections_user_id_users_id_fkey", "FOREIGN KEY")).toBe(true);
  });

  it("ist idempotent: erneutes Ausführen wirft nicht und erhält bestehende Daten", async () => {
    await conn.query(
      "INSERT INTO `calendar_connections` (user_id, provider, display_name, status, version, created_at, updated_at) VALUES (1, 'google', 'Idempotenz', 'active', 1, NOW(), NOW())"
    );

    await expect(runMigration(conn)).resolves.toBeUndefined();

    for (const table of NEW_TABLES) {
      expect(await tableExists(conn, table)).toBe(true);
    }
    const [rows] = await conn.query("SELECT COUNT(*) AS c FROM `calendar_connections`");
    expect(Number((rows as CountRow[])[0].c)).toBe(1);
  });

  it("up -> down -> up: down entfernt sauber, erneutes up stellt die Struktur wieder her", async () => {
    await runDown(conn);
    for (const table of NEW_TABLES) {
      expect(await tableExists(conn, table)).toBe(false);
    }
    expect(await columnExists(conn, "events", "origin")).toBe(false);
    expect(await columnExists(conn, "events", "readonly")).toBe(false);

    await expect(runMigration(conn)).resolves.toBeUndefined();

    for (const table of NEW_TABLES) {
      expect(await tableExists(conn, table)).toBe(true);
    }
    expect(await columnExists(conn, "events", "origin")).toBe(true);
    expect(await columnExists(conn, "events", "readonly")).toBe(true);
  });
});
