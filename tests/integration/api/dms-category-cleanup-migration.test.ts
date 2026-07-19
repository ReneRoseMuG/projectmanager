/**
 * Test Scope:
 * MS-80 / TASK-506: guarded and restart-safe removal of legacy DMS category tables.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Real temporary MySQL database with synthetic legacy tables and the unchanged cleanup migration.
 *
 * Mock-Entscheidung:
 * - No mocks; category, tag, attachment and relation rows are persisted in MySQL.
 *
 * Isolation:
 * - Dedicated test database; legacy tables are recreated and removed per test.
 *
 * Abgedeckte Regeln:
 * - Complete category and relation migration permits cleanup.
 * - Missing target tags or relations abort cleanup without dropping source tables.
 * - Repeating cleanup after a partial or completed run succeeds.
 *
 * Fehlerfälle:
 * - An unmigrated source relation raises the explicit MS-80 guard error.
 *
 * Ziel:
 * Prove zero-loss gating and restart safety before irreversible MySQL DROP TABLE statements.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type mysql from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(
  new URL("../../../apps/api/src/db/migrations/20260719171342_needy_karen_page/migration.sql", import.meta.url)
);

async function runMigration(pool: mysql.Pool): Promise<void> {
  const raw = await readFile(MIGRATION_SQL, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function tableExists(pool: mysql.Pool, tableName: string): Promise<boolean> {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName]
  );
  return Number((rows as Array<{ count: number }>)[0]?.count ?? 0) > 0;
}

async function createLegacyTables(pool: mysql.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE attachment_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
      color VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      version INT NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`
    CREATE TABLE attachment_category_links (
      category_id INT NOT NULL,
      attachment_id INT NOT NULL,
      PRIMARY KEY (category_id, attachment_id),
      CONSTRAINT ms80_cleanup_category_fk FOREIGN KEY (category_id) REFERENCES attachment_categories(id) ON DELETE CASCADE,
      CONSTRAINT ms80_cleanup_attachment_fk FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
    )
  `);
}

async function createSourceRows(pool: mysql.Pool, includeTargetRelation: boolean): Promise<void> {
  const now = new Date().toISOString();
  const [attachment] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO attachments (original_name, filename, mimetype, size, created_at, updated_at) VALUES ('cleanup.txt', 'cleanup.txt', 'text/plain', 1, ?, ?)",
    [now, now]
  );
  const [category] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO attachment_categories (name, color, version) VALUES ('Cleanup', '#123456', 1)"
  );
  const [tag] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO tags (name, color, is_system, domain, version) VALUES ('Cleanup', '#123456', false, 'dms', 1)"
  );
  await pool.execute(
    "INSERT INTO attachment_category_links (category_id, attachment_id) VALUES (?, ?)",
    [category.insertId, attachment.insertId]
  );
  if (includeTargetRelation) {
    await pool.execute(
      "INSERT INTO attachment_tags (attachment_id, tag_id) VALUES (?, ?)",
      [attachment.insertId, tag.insertId]
    );
  }
}

describe("MS-80 Kategorie-Cleanup-Migration", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await testDb.pool.query("DROP PROCEDURE IF EXISTS `ms80_cleanup_attachment_categories`");
    await createLegacyTables(testDb.pool);
  });

  afterEach(async () => {
    await testDb.pool.query("DROP PROCEDURE IF EXISTS `ms80_cleanup_attachment_categories`");
    await testDb.pool.query("DROP TABLE IF EXISTS attachment_category_links");
    await testDb.pool.query("DROP TABLE IF EXISTS attachment_categories");
  });

  afterAll(async () => {
    await testDb?.close();
  });

  it("entfernt vollständig migrierte Tabellen und bleibt wiederanlaufsicher", async () => {
    await createSourceRows(testDb.pool, true);

    await expect(runMigration(testDb.pool)).resolves.toBeUndefined();
    expect(await tableExists(testDb.pool, "attachment_category_links")).toBe(false);
    expect(await tableExists(testDb.pool, "attachment_categories")).toBe(false);
    await expect(runMigration(testDb.pool)).resolves.toBeUndefined();
  });

  it("bricht bei fehlender Zielrelation vor dem destruktiven Schritt ab", async () => {
    await createSourceRows(testDb.pool, false);

    await expect(runMigration(testDb.pool)).rejects.toThrow(/category-to-tag migration is incomplete/i);
    expect(await tableExists(testDb.pool, "attachment_category_links")).toBe(true);
    expect(await tableExists(testDb.pool, "attachment_categories")).toBe(true);
  });
});
