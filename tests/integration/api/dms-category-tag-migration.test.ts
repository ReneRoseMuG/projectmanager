/**
 * Test Scope:
 * MS-80 / TASK-501: idempotente Datenmigration von DMS-Kategorien zu DMS-Tags.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte temporäre MySQL-Datenbank mit realem Schema und unveränderter Custom-Migration.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Kategorien, Tags, Attachments und beide Relationstabellen werden real geschrieben.
 *
 * Isolation:
 * - Eigene Testdatenbank pro Suite über createTestDb und truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Fehlende DMS-Tags werden mit Name und Farbe der Kategorie angelegt.
 * - Kompatible vorhandene DMS-Tags werden wiederverwendet.
 * - Inkompatible Farbe oder Systemschutz brechen kontrolliert ab.
 * - Alle Kategorie-Relationen werden ohne Duplikate migriert; ein Wiederholungslauf bleibt unverändert.
 *
 * Fehlerfälle:
 * - Gleichnamiger inkompatibler DMS-Tag erzeugt einen SQL-Abbruch und keine Zielrelation.
 *
 * Ziel:
 * Nullverlust, Konfliktschutz und Wiederanlauffähigkeit der produktiven Datenmigration beweisen.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type mysql from "mysql2/promise";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(
  new URL("../../../apps/api/src/db/migrations/20260719155646_ms80_category_tags/migration.sql", import.meta.url)
);

type CountRow = { count: number };

async function runMigration(pool: mysql.Pool): Promise<void> {
  const raw = await readFile(MIGRATION_SQL, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function count(pool: mysql.Pool, table: string): Promise<number> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  return Number((rows as CountRow[])[0]?.count ?? 0);
}

async function createAttachment(pool: mysql.Pool, name: string): Promise<number> {
  const now = new Date().toISOString();
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO attachments (original_name, filename, mimetype, size, created_at, updated_at) VALUES (?, ?, 'text/plain', 1, ?, ?)",
    [name, name, now, now]
  );
  return result.insertId;
}

async function createLegacyCategoryTables(pool: mysql.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE attachment_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      color VARCHAR(255) NOT NULL DEFAULT '#94a3b8',
      version INT NOT NULL DEFAULT 1
    )
  `);
  await pool.query(`
    CREATE TABLE attachment_category_links (
      category_id INT NOT NULL,
      attachment_id INT NOT NULL,
      PRIMARY KEY (category_id, attachment_id),
      CONSTRAINT ms80_test_category_fk FOREIGN KEY (category_id) REFERENCES attachment_categories(id) ON DELETE CASCADE,
      CONSTRAINT ms80_test_attachment_fk FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
    )
  `);
}

describe("MS-80 Kategorie-zu-Tag-Migration", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await testDb.pool.query("DROP PROCEDURE IF EXISTS `ms80_migrate_attachment_categories_to_tags`");
    await createLegacyCategoryTables(testDb.pool);
  });

  afterEach(async () => {
    await testDb.pool.query("DROP PROCEDURE IF EXISTS `ms80_migrate_attachment_categories_to_tags`");
    await testDb.pool.query("DROP TABLE IF EXISTS attachment_category_links");
    await testDb.pool.query("DROP TABLE IF EXISTS attachment_categories");
  });

  afterAll(async () => {
    await testDb?.close();
  });

  it("legt neue DMS-Tags und Relationen vollständig an und bleibt beim Wiederholungslauf unverändert", async () => {
    const attachmentId = await createAttachment(testDb.pool, "migration-neu.txt");
    const [category] = await testDb.pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachment_categories (name, color, version) VALUES ('Innenraum', '#123456', 1)"
    );
    await testDb.pool.execute(
      "INSERT INTO attachment_category_links (category_id, attachment_id) VALUES (?, ?)",
      [category.insertId, attachmentId]
    );

    await runMigration(testDb.pool);
    expect(await count(testDb.pool, "tags")).toBe(1);
    expect(await count(testDb.pool, "attachment_tags")).toBe(1);
    const [createdRows] = await testDb.pool.query(
      "SELECT name, color, is_system AS isSystem, domain FROM tags"
    );
    expect(createdRows).toEqual([{ name: "Innenraum", color: "#123456", isSystem: 0, domain: "dms" }]);

    await runMigration(testDb.pool);
    expect(await count(testDb.pool, "tags")).toBe(1);
    expect(await count(testDb.pool, "attachment_tags")).toBe(1);
  });

  it("verwendet einen kompatiblen vorhandenen DMS-Tag wieder", async () => {
    const attachmentId = await createAttachment(testDb.pool, "migration-kompatibel.txt");
    const [category] = await testDb.pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachment_categories (name, color, version) VALUES ('Transport', '#abcdef', 1)"
    );
    const [tag] = await testDb.pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO tags (name, color, is_system, domain, version, created_at, updated_at) VALUES ('Transport', '#abcdef', false, 'dms', 1, NOW(), NOW())"
    );
    await testDb.pool.execute(
      "INSERT INTO attachment_category_links (category_id, attachment_id) VALUES (?, ?)",
      [category.insertId, attachmentId]
    );

    await runMigration(testDb.pool);
    const [links] = await testDb.pool.query("SELECT attachment_id AS attachmentId, tag_id AS tagId FROM attachment_tags");
    expect(links).toEqual([{ attachmentId, tagId: tag.insertId }]);
    expect(await count(testDb.pool, "tags")).toBe(1);
  });

  it("bricht bei inkompatibler Farbe oder Systemschutz ohne Zielrelation ab", async () => {
    const attachmentId = await createAttachment(testDb.pool, "migration-konflikt.txt");
    const [category] = await testDb.pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachment_categories (name, color, version) VALUES ('Geschützt', '#111111', 1)"
    );
    await testDb.pool.execute(
      "INSERT INTO tags (name, color, is_system, domain, version, created_at, updated_at) VALUES ('Geschützt', '#222222', true, 'dms', 1, NOW(), NOW())"
    );
    await testDb.pool.execute(
      "INSERT INTO attachment_category_links (category_id, attachment_id) VALUES (?, ?)",
      [category.insertId, attachmentId]
    );

    await expect(runMigration(testDb.pool)).rejects.toThrow(/incompatible DMS tag/i);
    expect(await count(testDb.pool, "attachment_tags")).toBe(0);
    expect(await count(testDb.pool, "tags")).toBe(1);
  });
});
