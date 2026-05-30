/**
 * SQLite → MySQL Migrationsskript
 *
 * Liest Daten aus einer SQLite-Datei und migriert sie in die MySQL-Datenbank.
 * Foreign Keys werden temporär deaktiviert, um Reihenfolgeprobleme zu vermeiden.
 * Alle IDs bleiben erhalten.
 *
 * Verwendung:
 *   npx tsx scripts/migrate-sqlite-to-mysql.ts "C:\Users\schro\Desktop\Data\taskmanager.sqlite"
 *
 * Oder mit Umgebungsvariablen:
 *   SQLITE_PATH="C:\path\to\taskmanager.sqlite" npx tsx scripts/migrate-sqlite-to-mysql.ts
 */

import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// .env aus apps/api laden
const envPath = path.resolve(process.cwd(), "apps", "api", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// ─── Konfiguration ───────────────────────────────────────────────────────

const SQLITE_PATH = process.env.SQLITE_PATH || process.argv[2];

if (!SQLITE_PATH) {
  console.error("❌ Fehler: Pfad zur SQLite-Datei fehlt.");
  console.error("");
  console.error("Verwendung:");
  console.error("  npx tsx scripts/migrate-sqlite-to-mysql.ts \"C:\\Pfad\\zur\\taskmanager.sqlite\"");
  console.error("");
  console.error("Oder Umgebungsvariable setzen:");
  console.error("  SQLITE_PATH=\"C:\\Pfad\\zur\\taskmanager.sqlite\" npx tsx scripts/migrate-sqlite-to-mysql.ts");
  process.exit(1);
}

const MYSQL_CONFIG = {
  host: process.env.DB_HOST?.trim() ?? "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER?.trim() ?? "taskmanager",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME?.trim() ?? "taskmanager",
};

// ─── Tabellen-Reihenfolge (Foreign-Key-Abhängigkeiten beachten) ──────────
// Stufe 1: Keine Foreign-Key-Abhängigkeiten
// Stufe 2: FK zu Stufe-1-Tabellen
// Stufe 3: FK zu Stufe-2-Tabellen
// Stufe 4: Join-Tabellen (viele FK-Beziehungen)

const MIGRATION_ORDER: { stage: number; tables: string[] }[] = [
  {
    stage: 1,
    tables: [
      "app_settings",
      "catalog_entries",
      "tags",
      "content_images",
    ],
  },
  {
    stage: 2,
    tables: [
      "roles",
      "users",
      "permissions",
    ],
  },
  {
    stage: 3,
    tables: [
      "projects",
      "features",
      "use_cases",
      "milestones",
      "wiki_pages",
      "backlog_items",
      "events",
      "day_plans",
      "notes",
      "comments",
      "attachments",
      "tickets",
      "tasks",
      "journal_entries",
      "journal_entry_changes",
      "journal_entry_contexts",
      "settings_values",
      "dashboards",
      "dashboard_widgets",
      "dashboard_defaults",
      "push_subscriptions",
      "sent_notifications",
      "feature_relations",
      "wiki_page_relations",
    ],
  },
  {
    stage: 4,
    tables: [
      // Comments-Joins
      "project_comments",
      "milestone_comments",
      "task_comments",
      "day_plan_comments",
      "feature_comments",
      "use_case_comments",
      "backlog_item_comments",
      "wiki_page_comments",
      "ticket_comments",
      // Notes-Joins
      "project_notes",
      "milestone_notes",
      "task_notes",
      "day_plan_notes",
      "wiki_page_notes",
      "ticket_notes",
      // Attachments-Joins
      "project_attachments",
      "milestone_attachments",
      "task_attachments",
      "feature_attachments",
      "wiki_page_attachments",
      "ticket_attachments",
      // Events-Joins
      "project_events",
      "milestone_events",
      "task_events",
      "day_plan_events",
      // Tasks-Joins
      "project_tasks",
      "milestone_tasks",
      "day_plan_tasks",
      "feature_tasks",
      "use_case_tasks",
      "wiki_page_tasks",
      // Features-Joins
      "project_features",
      "milestone_features",
      // Tags-Joins
      "project_tags",
      "milestone_tags",
      "task_tags",
      "ticket_tags",
      // Tickets-Joins
      "project_tickets",
      "milestone_tickets",
      "task_tickets",
      "feature_tickets",
      "use_case_tickets",
      "wiki_page_tickets",
      "ticket_relations",
    ],
  },
];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────

function log(message: string, type: "info" | "success" | "warning" | "error" = "info") {
  const prefix = {
    info: "  ",
    success: "✅ ",
    warning: "⚠️  ",
    error: "❌ ",
  }[type];
  console.log(`${prefix}${message}`);
}

interface TableInfo {
  name: string;
  rowCount: number;
}

// ─── Hauptfunktion ───────────────────────────────────────────────────────

async function main() {
  console.log("");
  log("═══════════════════════════════════════════════════════════", "info");
  log("  SQLite → MySQL Migration", "info");
  log("═══════════════════════════════════════════════════════════", "info");
  console.log("");

  // SQLite-Datei prüfen
  if (!fs.existsSync(SQLITE_PATH)) {
    log(`SQLite-Datei nicht gefunden: ${SQLITE_PATH}`, "error");
    process.exit(1);
  }

  log(`SQLite-Quelle: ${SQLITE_PATH}`, "info");
  log(`MySQL-Ziel: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`, "info");
  console.log("");

  let sqliteDb: Database.Database | null = null;
  let mysqlConn: mysql.Connection | null = null;

  try {
    // ── SQLite verbinden ──────────────────────────────────────────────
    log("Verbinde mit SQLite...", "info");
    sqliteDb = new Database(SQLITE_PATH, { readonly: true });

    // Alle Tabellen in SQLite ermitteln
    const sqliteTables: string[] = sqliteDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
      .all()
      .map((row: any) => row.name);

    log(`Gefundene SQLite-Tabellen: ${sqliteTables.length}`, "info");
    console.log("");

    // ── MySQL verbinden ───────────────────────────────────────────────
    log("Verbinde mit MySQL...", "info");
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);

    // Foreign Keys temporär deaktivieren
    await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 0;");
    log("Foreign Keys deaktiviert (für Migration)", "warning");

    // ── Tabellen-Informationen sammeln ────────────────────────────────
    const tableInfos: TableInfo[] = [];
    for (const tableGroup of MIGRATION_ORDER) {
      for (const tableName of tableGroup.tables) {
        if (!sqliteTables.includes(tableName)) continue;

        const result = sqliteDb.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as { count: number };
        tableInfos.push({
          name: tableName,
          rowCount: result.count,
        });
      }
    }

    const totalRows = tableInfos.reduce((sum, t) => sum + t.rowCount, 0);
    log(`Zu migrierende Tabellen: ${tableInfos.length} (insgesamt ${totalRows} Zeilen)`, "info");
    console.log("");

    // ── Migration durchführen ─────────────────────────────────────────
    let migratedTables = 0;
    let migratedRows = 0;
    let errors: { table: string; error: string }[] = [];

    for (const { stage, tables } of MIGRATION_ORDER) {
      log(`─── Stufe ${stage} (${tables.length} Tabellen) ───`, "info");

      for (const tableName of tables) {
        if (!sqliteTables.includes(tableName)) {
          // Tabelle existiert nicht in SQLite – überspringen
          continue;
        }

        const tableInfo = tableInfos.find(t => t.name === tableName)!;

        if (tableInfo.rowCount === 0) {
          log(`  ${tableName}: leer (übersprungen)`, "warning");
          migratedTables++;
          continue;
        }

        try {
          const rows = await migrateTable(sqliteDb, mysqlConn, tableName);
          migratedRows += rows;
          migratedTables++;
          log(`  ${tableName}: ${rows} Zeilen migriert`, "success");
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          errors.push({ table: tableName, error: errorMsg });
          log(`  ${tableName}: FEHLER – ${errorMsg}`, "error");
        }
      }
      console.log("");
    }

    // ── Zusammenfassung ───────────────────────────────────────────────
    console.log("");
    log("═══════════════════════════════════════════════════════════", "info");
    log("  Migrations-Zusammenfassung", "info");
    log("═══════════════════════════════════════════════════════════", "info");
    log(`Tabellen migriert: ${migratedTables} / ${tableInfos.length}`, migratedTables === tableInfos.length ? "success" : "warning");
    log(`Zeilen migriert: ${migratedRows} / ${totalRows}`, migratedRows === totalRows ? "success" : "warning");

    if (errors.length > 0) {
      console.log("");
      log("Fehler bei:", "error");
      for (const { table, error } of errors) {
        log(`  • ${table}: ${error}`, "error");
      }
    }

    console.log("");

  } finally {
    // ── Aufräumen ─────────────────────────────────────────────────────
    if (mysqlConn) {
      try {
        await mysqlConn.query("SET FOREIGN_KEY_CHECKS = 1;");
        log("Foreign Keys wieder aktiviert", "info");
      } catch {
        // Ignorieren
      }
      await mysqlConn.end();
      log("MySQL-Verbindung getrennt", "info");
    }

    if (sqliteDb) {
      sqliteDb.close();
      log("SQLite-Verbindung getrennt", "info");
    }
  }
}

// ─── Tabellen-Migration ──────────────────────────────────────────────────

async function migrateTable(
  sqliteDb: Database.Database,
  mysqlConn: mysql.Connection,
  tableName: string
): Promise<number> {
  // 1. Alle Daten aus SQLite lesen
  const sqliteRows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[];

  if (sqliteRows.length === 0) return 0;

  // 2. Spaltennamen ermitteln
  const columns = Object.keys(sqliteRows[0]);
  const columnList = columns.map(c => `\`${c}\``).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  // 3. INSERT vorbereiten (REPLACE, um Duplikate bei wiederholter Migration zu vermeiden)
  const insertSql = `REPLACE INTO \`${tableName}\` (${columnList}) VALUES (${placeholders})`;

  // 4. Daten einfügen
  let inserted = 0;
  for (const row of sqliteRows) {
    const values = columns.map(col => {
      let val = row[col];
      // SQLite speichert booleans als 0/1, MySQL akzeptiert das auch in TINYINT
      // NULL-Werte korrekt behandeln
      if (val === null || val === undefined) return null;
      return val;
    });

    // Bei Fehlern weitermachen (einzelne Zeile überspringen)
    try {
      await mysqlConn.execute(insertSql, values);
      inserted++;
    } catch (err) {
      // Einzelne Zeile fehlgeschlagen – weiter mit nächster
      // Nur beim ersten Fehler pro Tabelle werfen, um Spam zu vermeiden
      if (inserted === 0) {
        throw err;
      }
    }
  }

  return inserted;
}

// ─── Start ───────────────────────────────────────────────────────────────

main().catch(err => {
  console.error("");
  console.error("❌ Fataler Fehler:", err);
  process.exit(1);
});