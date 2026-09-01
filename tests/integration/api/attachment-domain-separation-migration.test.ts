/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte, isolierte MySQL-Datenbank mit vollständiger realer Migrationskette.
 * - Die Trennungsmigration wird unverändert mit ihren Statement-Breakpoints ausgeführt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. DDL, Stored Procedure, Constraints und Datenverschiebung laufen in MySQL.
 *
 * Isolation:
 * - Eigene zufällig benannte Testdatenbank über createTestDb; vollständiges Entfernen nach der Suite.
 *
 * Abgedeckte Regeln:
 * - Legacy-Sichtbarkeit wird deterministisch in document und parent_attachment überführt.
 * - Bestehende Dokument-Owner-Zuordnungen werden verlustfrei zu Dokumentverknüpfungen.
 * - Parent-Anhänge bleiben exklusiv in ihrer Parent-Junction.
 * - Die alte Sichtbarkeitsspalte verschwindet und documents-Berechtigungen werden nachgeführt.
 * - Die Migration ist nach Abschluss erneut ausführbar.
 *
 * Fehlerfälle:
 * - Der Wiederanlauf darf weder Links duplizieren noch bereits getrennte Daten verändern.
 *
 * Ziel:
 * Nachweis der verlustfreien und wiederanlaufsicheren Trennung von DMS-Dokumenten und Parent-Anhängen.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseConnectionConfig, createTestDb, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(
  new URL(
    "../../../apps/api/src/db/migrations/20260827082638_brave_human_cannonball/migration.sql",
    import.meta.url
  )
);

interface CountRow {
  count: number;
}

interface AttachmentKindRow {
  id: number;
  kind: "parent_attachment" | "document";
}

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

async function count(connection: mysql.Connection, sql: string, values: unknown[] = []): Promise<number> {
  const [rows] = await connection.execute(sql, values);
  return Number((rows as CountRow[])[0].count);
}

describe("Attachment-Domänentrennungsmigration", () => {
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

  it("trennt Legacy-Daten verlustfrei und läuft anschließend erneut sicher durch", async () => {
    const now = new Date().toISOString();
    const [projectResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO projects (name, created_at, updated_at) VALUES (?, ?, ?)",
      ["Trennungstest", now, now]
    );
    const [parentResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachments (original_name, filename, mimetype, size, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["parent.txt", "parent.txt", "text/plain", 6, "parent_attachment", now, now]
    );
    const [documentResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO attachments (original_name, filename, mimetype, size, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["document.txt", "document.txt", "text/plain", 8, "document", now, now]
    );
    await connection.execute(
      "INSERT INTO project_attachments (project_id, attachment_id) VALUES (?, ?), (?, ?)",
      [projectResult.insertId, parentResult.insertId, projectResult.insertId, documentResult.insertId]
    );
    const [roleResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO roles (`key`, label, is_system, version, created_at, updated_at) VALUES (?, ?, false, 1, ?, ?)",
      ["separation-test", "Trennungstest", now, now]
    );
    await connection.execute(
      "INSERT INTO permissions (role_id, resource, action) VALUES (?, 'attachments', 'read')",
      [roleResult.insertId]
    );

    await connection.query("ALTER TABLE attachments ADD is_in_document_library boolean NOT NULL DEFAULT true");
    await connection.query("ALTER TABLE attachments MODIFY kind varchar(191) NULL");
    await connection.execute(
      "UPDATE attachments SET kind = NULL, is_in_document_library = CASE WHEN id = ? THEN false ELSE true END WHERE id IN (?, ?)",
      [parentResult.insertId, parentResult.insertId, documentResult.insertId]
    );

    await expect(runMigration(connection)).resolves.toBeUndefined();
    await expect(runMigration(connection)).resolves.toBeUndefined();

    const [kindRows] = await connection.execute(
      "SELECT id, kind FROM attachments WHERE id IN (?, ?) ORDER BY id",
      [parentResult.insertId, documentResult.insertId]
    );
    expect(kindRows as AttachmentKindRow[]).toEqual([
      { id: parentResult.insertId, kind: "parent_attachment" },
      { id: documentResult.insertId, kind: "document" }
    ]);
    expect(await count(connection, "SELECT COUNT(*) AS count FROM project_attachments WHERE project_id = ? AND attachment_id = ?", [projectResult.insertId, parentResult.insertId])).toBe(1);
    expect(await count(connection, "SELECT COUNT(*) AS count FROM project_attachments WHERE project_id = ? AND attachment_id = ?", [projectResult.insertId, documentResult.insertId])).toBe(0);
    expect(await count(connection, "SELECT COUNT(*) AS count FROM project_document_links WHERE owner_id = ? AND document_id = ?", [projectResult.insertId, documentResult.insertId])).toBe(1);
    expect(await count(connection, "SELECT COUNT(*) AS count FROM permissions WHERE role_id = ? AND resource = 'documents' AND action = 'read'", [roleResult.insertId])).toBe(1);
    expect(await count(connection, "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attachments' AND COLUMN_NAME = 'is_in_document_library'")).toBe(0);
  });
});
