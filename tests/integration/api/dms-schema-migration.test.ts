/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte temporäre MySQL-Datenbank mit der vollständigen realen Migrationskette.
 * - Die MS-80-Migration wird unverändert anhand ihrer statement-breakpoint-Marker erneut ausgeführt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Die zusätzliche MySQL-Verbindung erlaubt Stored-Procedures mit mehreren Statements.
 *
 * Isolation:
 * - Eigene Testdatenbank pro Suite über createTestDb; vollständiges Entfernen nach der Suite.
 *
 * Abgedeckte Regeln:
 * - Additive Attachment-Felder und Indizes sind vorhanden und bestehende Zeilen werden sichtbar vorbelegt.
 * - Ein Attachment kann höchstens einer direkten Sammlung zugeordnet werden.
 * - Tag-Namen sind innerhalb einer Domäne eindeutig, dürfen aber domänenübergreifend gleich sein.
 * - Die Migration ist nach einem simulierten Teilabbruch wiederanlaufsicher.
 *
 * Fehlerfälle:
 * - Zweite direkte Sammlung und doppelter Tag-Name in derselben Domäne werden von MySQL abgelehnt.
 *
 * Ziel:
 * Nachweis, dass das additive MS-80-Datenmodell konsistent, constraint-gesichert und wiederanlaufsicher ist.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseConnectionConfig, createTestDb, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(
  new URL("../../../apps/api/src/db/migrations/20260719145521_sparkling_imperial_guard/migration.sql", import.meta.url)
);

type CountRow = { c: number };

async function runMigration(connection: mysql.Connection): Promise<void> {
  const raw = await readFile(MIGRATION_SQL, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function columnExists(connection: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column]
  );
  return Number((rows as CountRow[])[0].c) > 0;
}

async function indexExists(connection: mysql.Connection, table: string, indexName: string): Promise<boolean> {
  const [rows] = await connection.query(
    "SELECT COUNT(*) AS c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [table, indexName]
  );
  return Number((rows as CountRow[])[0].c) > 0;
}

describe("MS-80 DMS-Schema-Migration", () => {
  let testDb: TestDb;
  let connection: mysql.Connection;

  beforeAll(async () => {
    testDb = await createTestDb();
    connection = await mysql.createConnection({
      ...baseConnectionConfig(),
      database: testDb.dbName,
      multipleStatements: true
    });
  });

  afterAll(async () => {
    await connection?.end();
    await testDb?.close();
  });

  it("legt Bibliothekssichtbarkeit, Inhalts-Hash und die benötigten Indizes an", async () => {
    expect(await columnExists(connection, "attachments", "content_hash")).toBe(true);
    expect(await columnExists(connection, "attachments", "is_in_document_library")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_content_hash_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_library_created_at_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_library_mimetype_created_at_idx")).toBe(true);
    expect(await indexExists(connection, "folder_attachments", "folder_attachments_attachment_unique")).toBe(true);
    expect(await indexExists(connection, "attachment_tags", "attachment_tags_tag_attachment_idx")).toBe(true);
    expect(await indexExists(connection, "tags", "tags_domain_name_unique")).toBe(true);
    expect(await indexExists(connection, "tags", "name_unique")).toBe(false);
  });

  it("erzwingt eine direkte Sammlung und domänenspezifisch eindeutige Tags", async () => {
    const now = new Date().toISOString();
    const [attachmentResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachments (original_name, filename, mimetype, size, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["schema-test.txt", "schema-test.txt", "text/plain", 4, now, now]
    );
    const attachmentId = attachmentResult.insertId;
    const [firstFolderResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachment_folders (name, created_at, updated_at) VALUES (?, ?, ?)",
      ["MS-80 A", now, now]
    );
    const [secondFolderResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachment_folders (name, created_at, updated_at) VALUES (?, ?, ?)",
      ["MS-80 B", now, now]
    );

    await connection.execute("INSERT INTO folder_attachments (folder_id, attachment_id) VALUES (?, ?)", [
      firstFolderResult.insertId,
      attachmentId
    ]);
    await expect(
      connection.execute("INSERT INTO folder_attachments (folder_id, attachment_id) VALUES (?, ?)", [
        secondFolderResult.insertId,
        attachmentId
      ])
    ).rejects.toThrow();

    await connection.execute(
      "INSERT INTO tags (name, color, domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)",
      ["MS-80 gleich", "#94a3b8", "pm", now, now, "MS-80 gleich", "#94a3b8", "dms", now, now]
    );
    await expect(
      connection.execute("INSERT INTO tags (name, color, domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [
        "MS-80 gleich",
        "#94a3b8",
        "dms",
        now,
        now
      ])
    ).rejects.toThrow();
  });

  it("läuft nach einem simulierten Teilabbruch erneut an und belegt Bestandszeilen sichtbar vor", async () => {
    await connection.query("DROP INDEX `attachments_content_hash_idx` ON `attachments`");
    await connection.query("ALTER TABLE `attachments` DROP COLUMN `content_hash`");
    await connection.query("DROP INDEX `attachments_library_created_at_idx` ON `attachments`");
    await connection.query("ALTER TABLE `attachments` DROP COLUMN `is_in_document_library`");
    await connection.query("CREATE INDEX `ms80_test_folder_attachment_fk_idx` ON `folder_attachments` (`attachment_id`)");
    await connection.query("DROP INDEX `folder_attachments_attachment_unique` ON `folder_attachments`");
    await connection.query("DROP INDEX `tags_domain_name_unique` ON `tags`");

    await expect(runMigration(connection)).resolves.toBeUndefined();
    await expect(runMigration(connection)).resolves.toBeUndefined();

    const [visibilityRows] = await connection.query("SELECT COUNT(*) AS c FROM attachments WHERE is_in_document_library = true");
    expect(Number((visibilityRows as CountRow[])[0].c)).toBeGreaterThan(0);
    expect(await indexExists(connection, "attachments", "attachments_content_hash_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_library_created_at_idx")).toBe(true);
    expect(await indexExists(connection, "folder_attachments", "folder_attachments_attachment_unique")).toBe(true);
    expect(await indexExists(connection, "tags", "tags_domain_name_unique")).toBe(true);
  });
});
