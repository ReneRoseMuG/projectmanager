/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte temporäre MySQL-Datenbank mit realen Attachment- und Owner-Tabellen.
 * - Die corrective Migration wird unverändert anhand ihrer statement-breakpoint-Marker ausgeführt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Eine echte MySQL-Verbindung führt Stored-Procedures und DDL aus.
 *
 * Isolation:
 * - Eigene Testdatenbank pro Suite über createTestDb; vollständiges Entfernen nach der Suite.
 *
 * Abgedeckte Regeln:
 * - Verwaiste Attachment- und Owner-Links werden entfernt, gültige Links bleiben erhalten.
 * - Alle sechs Attachment-Junctions erhalten beide Fremdschlüssel mit ON DELETE CASCADE.
 * - Löschen eines Attachments oder Owners bereinigt die Junction, ohne den jeweils anderen Owner
 *   beziehungsweise das Attachment unbeabsichtigt zu löschen.
 * - Die Migration ist wiederanlaufsicher.
 *
 * Fehlerfälle:
 * - Ein Legacy-Stand ohne Attachment-FKs und mit beidseitig verwaisten Links wird repariert.
 *
 * Ziel:
 * Die produktiv fehlenden Attachment-Fremdschlüssel und ihre Datenbereinigung dauerhaft absichern.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseConnectionConfig, createTestDb, type TestDb } from "../../fixtures/api/index.js";

const MIGRATION_SQL = fileURLToPath(
  new URL(
    "../../../apps/api/src/db/migrations/20260727080900_restore_attachment_junction_fks/migration.sql",
    import.meta.url
  )
);

interface JunctionSpec {
  table: string;
  ownerColumn: string;
  ownerTable: string;
}

const junctions: JunctionSpec[] = [
  { table: "project_attachments", ownerColumn: "project_id", ownerTable: "projects" },
  { table: "milestone_attachments", ownerColumn: "milestone_id", ownerTable: "milestones" },
  { table: "task_attachments", ownerColumn: "task_id", ownerTable: "tasks" },
  { table: "feature_attachments", ownerColumn: "feature_id", ownerTable: "features" },
  { table: "ticket_attachments", ownerColumn: "ticket_id", ownerTable: "tickets" },
  { table: "wiki_page_attachments", ownerColumn: "wiki_page_id", ownerTable: "wiki_pages" }
];

type CountRow = { count: number };
type ConstraintRow = { constraintName: string };
type ReferencedConstraintRow = {
  columnName: string;
  referencedTableName: string;
  deleteRule: string;
};

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

async function dropJunctionForeignKeys(connection: mysql.Connection): Promise<void> {
  for (const junction of junctions) {
    const [rows] = await connection.query(
      `SELECT CONSTRAINT_NAME AS constraintName
       FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [junction.table]
    );
    for (const row of rows as ConstraintRow[]) {
      await connection.query(`ALTER TABLE \`${junction.table}\` DROP FOREIGN KEY \`${row.constraintName}\``);
    }
  }
}

async function junctionCount(connection: mysql.Connection, table: string): Promise<number> {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  return Number((rows as CountRow[])[0].count);
}

async function attachmentExists(connection: mysql.Connection, attachmentId: number): Promise<boolean> {
  const [rows] = await connection.query("SELECT COUNT(*) AS count FROM attachments WHERE id = ?", [attachmentId]);
  return Number((rows as CountRow[])[0].count) === 1;
}

async function foreignKeys(connection: mysql.Connection, table: string): Promise<ReferencedConstraintRow[]> {
  const [rows] = await connection.query(
    `SELECT
       kcu.COLUMN_NAME AS columnName,
       kcu.REFERENCED_TABLE_NAME AS referencedTableName,
       rc.DELETE_RULE AS deleteRule
     FROM information_schema.KEY_COLUMN_USAGE kcu
     INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY kcu.COLUMN_NAME`,
    [table]
  );
  return rows as ReferencedConstraintRow[];
}

describe("Attachment-Junction-FK-Reparaturmigration", () => {
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

  it("bereinigt Legacy-Orphans, stellt alle Kaskaden wieder her und läuft erneut sicher durch", async () => {
    const now = new Date().toISOString();
    await dropJunctionForeignKeys(connection);

    const [projectResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO projects (name, created_at, updated_at) VALUES (?, ?, ?)",
      ["FK-Test-Projekt", now, now]
    );
    const [milestoneResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO milestones (project_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [projectResult.insertId, "FK-Test-Meilenstein", now, now]
    );
    const [taskResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO tasks (title, created_at, updated_at) VALUES (?, ?, ?)",
      ["FK-Test-Aufgabe", now, now]
    );
    const [featureResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO features (title, created_at, updated_at) VALUES (?, ?, ?)",
      ["FK-Test-Feature", now, now]
    );
    const [ticketResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO tickets (title, created_at, updated_at) VALUES (?, ?, ?)",
      ["FK-Test-Ticket", now, now]
    );
    const [wikiResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO wiki_pages (title, created_at, updated_at) VALUES (?, ?, ?)",
      ["FK-Test-Wiki", now, now]
    );
    const ownerIds = [
      projectResult.insertId,
      milestoneResult.insertId,
      taskResult.insertId,
      featureResult.insertId,
      ticketResult.insertId,
      wikiResult.insertId
    ];

    const [attachmentResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO attachments
         (original_name, filename, mimetype, size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["fk-valid.txt", "fk-valid.txt", "text/plain", 8, now, now]
    );
    const validAttachmentId = attachmentResult.insertId;

    for (const [index, junction] of junctions.entries()) {
      await connection.execute(
        `INSERT INTO \`${junction.table}\` (\`${junction.ownerColumn}\`, attachment_id)
         VALUES (?, ?), (?, ?), (?, ?)`,
        [
          ownerIds[index],
          validAttachmentId,
          ownerIds[index],
          900000 + index,
          910000 + index,
          validAttachmentId
        ]
      );
    }

    await expect(runMigration(connection)).resolves.toBeUndefined();
    await expect(runMigration(connection)).resolves.toBeUndefined();

    for (const junction of junctions) {
      expect(await junctionCount(connection, junction.table)).toBe(1);
      expect(await foreignKeys(connection, junction.table)).toEqual([
        {
          columnName: "attachment_id",
          referencedTableName: "attachments",
          deleteRule: "CASCADE"
        },
        {
          columnName: junction.ownerColumn,
          referencedTableName: junction.ownerTable,
          deleteRule: "CASCADE"
        }
      ]);
    }

    await connection.execute("DELETE FROM attachments WHERE id = ?", [validAttachmentId]);
    for (const junction of junctions) {
      expect(await junctionCount(connection, junction.table)).toBe(0);
    }

    const [ownerCascadeAttachmentResult] = await connection.execute<mysql.ResultSetHeader>(
      `INSERT INTO attachments
         (original_name, filename, mimetype, size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ["fk-owner-cascade.txt", "fk-owner-cascade.txt", "text/plain", 8, now, now]
    );
    const ownerCascadeAttachmentId = ownerCascadeAttachmentResult.insertId;
    for (const [index, junction] of junctions.entries()) {
      await connection.execute(
        `INSERT INTO \`${junction.table}\` (\`${junction.ownerColumn}\`, attachment_id) VALUES (?, ?)`,
        [ownerIds[index], ownerCascadeAttachmentId]
      );
    }

    await connection.execute("DELETE FROM tasks WHERE id = ?", [taskResult.insertId]);
    await connection.execute("DELETE FROM features WHERE id = ?", [featureResult.insertId]);
    await connection.execute("DELETE FROM tickets WHERE id = ?", [ticketResult.insertId]);
    await connection.execute("DELETE FROM wiki_pages WHERE id = ?", [wikiResult.insertId]);
    await connection.execute("DELETE FROM milestones WHERE id = ?", [milestoneResult.insertId]);
    await connection.execute("DELETE FROM projects WHERE id = ?", [projectResult.insertId]);

    for (const junction of junctions) {
      expect(await junctionCount(connection, junction.table)).toBe(0);
    }
    expect(await attachmentExists(connection, ownerCascadeAttachmentId)).toBe(true);
  });
});
