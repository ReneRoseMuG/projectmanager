/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte temporäre MySQL-Datenbank mit der vollständigen realen Migrationskette.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Die zusätzliche MySQL-Verbindung erlaubt Stored-Procedures mit mehreren Statements.
 *
 * Isolation:
 * - Eigene Testdatenbank pro Suite über createTestDb; vollständiges Entfernen nach der Suite.
 *
 * Abgedeckte Regeln:
 * - Das finale Attachment-Kind und die zugehörigen DMS-Indizes ersetzen die alte Sichtbarkeitsspalte.
 * - Ein Attachment kann höchstens einer direkten Sammlung zugeordnet werden.
 * - Tag-Namen sind innerhalb einer Domäne eindeutig, dürfen aber domänenübergreifend gleich sein.
 * - Globale Sammlungen haben keinen Projektbezug; Parent-Ordner und Dokumentlinks liegen in getrennten Tabellen.
 *
 * Fehlerfälle:
 * - Zweite direkte Sammlung und doppelter Tag-Name in derselben Domäne werden von MySQL abgelehnt.
 *
 * Ziel:
 * Nachweis, dass das finale getrennte DMS-Datenmodell konsistent und constraint-gesichert ist.
 */

import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseConnectionConfig, createTestDb, type TestDb } from "../../fixtures/api/index.js";

type CountRow = { c: number };

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

describe("Finales DMS-Trennungsschema", () => {
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

  it("legt Attachment-Kind, Inhalts-Hash und die getrennten Indizes an", async () => {
    expect(await columnExists(connection, "attachments", "content_hash")).toBe(true);
    expect(await columnExists(connection, "attachments", "kind")).toBe(true);
    expect(await columnExists(connection, "attachments", "is_in_document_library")).toBe(false);
    expect(await indexExists(connection, "attachments", "attachments_content_hash_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_kind_created_at_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_kind_mimetype_created_at_idx")).toBe(true);
    expect(await indexExists(connection, "attachments", "attachments_library_created_at_idx")).toBe(false);
    expect(await indexExists(connection, "folder_attachments", "folder_attachments_attachment_unique")).toBe(true);
    expect(await indexExists(connection, "attachment_tags", "attachment_tags_tag_attachment_idx")).toBe(true);
    expect(await indexExists(connection, "tags", "tags_domain_name_unique")).toBe(true);
    expect(await indexExists(connection, "tags", "name_unique")).toBe(false);
  });

  it("erzwingt eine direkte Sammlung und domänenspezifisch eindeutige Tags", async () => {
    const now = new Date().toISOString();
    const [attachmentResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachments (original_name, filename, mimetype, size, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["schema-test.txt", "schema-test.txt", "text/plain", 4, "document", now, now]
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

  it("trennt globale Sammlungen, Parent-Ordner und Parent-Dokumentlinks strukturell", async () => {
    expect(await columnExists(connection, "attachment_folders", "project_id")).toBe(false);
    expect(await columnExists(connection, "project_attachment_folders", "owner_id")).toBe(true);
    expect(await columnExists(connection, "project_attachment_folders", "parent_id")).toBe(true);
    expect(await columnExists(connection, "project_attachments", "folder_id")).toBe(true);
    expect(await columnExists(connection, "project_document_links", "document_id")).toBe(true);
    expect(await columnExists(connection, "project_document_links", "version")).toBe(true);
    expect(await indexExists(connection, "project_attachments", "project_attachments_folder_idx")).toBe(true);
  });
});
