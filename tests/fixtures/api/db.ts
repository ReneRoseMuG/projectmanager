import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../../../apps/api/src/db/schema.js";
import { assertSafeTestDatabasePath, vitestRuntimeRoot } from "../../../apps/api/src/runtime-safety.js";

export type TestDb = ReturnType<typeof createTestDb>;

const defaultCatalogEntries = [
  ["workStatus", "active", "Aktiv", 100, 0],
  ["workStatus", "on_hold", "Pausiert", 200, 0],
  ["workStatus", "completed", "Abgeschlossen", 300, 1],
  ["workStatus", "archived", "Archiviert", 400, 1],
  ["workStatus", "todo", "Offen", 500, 0],
  ["workStatus", "open", "Offen", 600, 0],
  ["workStatus", "in_progress", "In Arbeit", 700, 0],
  ["workStatus", "in_review", "In Prüfung", 800, 0],
  ["workStatus", "done", "Erledigt", 900, 1],
  ["workStatus", "resolved", "Gelöst", 1000, 1],
  ["workStatus", "closed", "Geschlossen", 1100, 1],
  ["workStatus", "rejected", "Verworfen", 1200, 1],
  ["featureStatus", "draft", "Entwurf", 100, 0],
  ["featureStatus", "active", "Aktiv", 200, 0],
  ["featureStatus", "done", "Erledigt", 300, 1],
  ["featureStatus", "archived", "Archiviert", 400, 1],
  ["priority", "low", "Niedrig", 100, 0],
  ["priority", "medium", "Mittel", 200, 0],
  ["priority", "high", "Hoch", 300, 0],
  ["priority", "urgent", "Dringend", 400, 0]
] as const;

interface DrizzleJournalEntry {
  tag: string;
  when: number;
  breakpoints: boolean;
}

interface DrizzleJournal {
  entries: DrizzleJournalEntry[];
}

function seedDefaultCatalogEntries(sqlite: Database.Database): void {
  const insert = sqlite.prepare("INSERT INTO catalog_entries (kind, key, label, sort_order, is_closed, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))");
  for (const entry of defaultCatalogEntries) {
    insert.run(...entry);
  }
}

function seedDefaultAuth(sqlite: Database.Database): void {
  sqlite.prepare("INSERT INTO roles (key, label, is_system, version, created_at, updated_at) VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))").run("admin", "Administrator", 1);
  sqlite.prepare("INSERT INTO roles (key, label, is_system, version, created_at, updated_at) VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))").run("editor", "Editor", 1);
  sqlite.prepare("INSERT INTO roles (key, label, is_system, version, created_at, updated_at) VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))").run("reader", "Leser", 1);
  sqlite.prepare("INSERT INTO permissions (role_id, resource, action) SELECT id, '*', '*' FROM roles WHERE key = 'admin'").run();
  sqlite.prepare("INSERT INTO permissions (role_id, resource, action) SELECT id, '*', 'read' FROM roles WHERE key = 'editor'").run();
  sqlite.prepare("INSERT INTO permissions (role_id, resource, action) SELECT id, '*', 'write' FROM roles WHERE key = 'editor'").run();
  sqlite.prepare("INSERT INTO permissions (role_id, resource, action) SELECT id, '*', 'read' FROM roles WHERE key = 'reader'").run();
  sqlite
    .prepare(
      "INSERT INTO users (name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) SELECT '', 'Test', 'Admin', 'admin@local', '$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q', id, 1, 1, datetime('now'), datetime('now') FROM roles WHERE key = 'admin'"
    )
    .run();
  sqlite.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('admin_setup_done', 'true', datetime('now'))").run();
}

function migrateLegacyTestDb(sqlite: Database.Database, migrationsFolder: string): void {
  const journal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8")) as DrizzleJournal;
  sqlite.prepare("CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)").run();

  const insertMigration = sqlite.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)");
  for (const entry of journal.entries) {
    const migrationPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    const query = fs.readFileSync(migrationPath, "utf8");
    const statements = entry.breakpoints ? query.split("--> statement-breakpoint") : [query];
    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        sqlite.exec(trimmedStatement);
      }
    }
    insertMigration.run(crypto.createHash("sha256").update(query).digest("hex"), entry.when);
  }
}

function migrateTestDb(sqlite: Database.Database) {
  const db = drizzle({ client: sqlite, schema });
  const migrationsFolder = fileURLToPath(new URL("../../../apps/api/src/db/migrations", import.meta.url));

  sqlite.pragma("foreign_keys = OFF");
  migrateLegacyTestDb(sqlite, migrationsFolder);
  sqlite.pragma("foreign_keys = ON");

  const foreignKeyErrors = sqlite.pragma("foreign_key_check") as unknown[];
  if (foreignKeyErrors.length > 0) {
    throw new Error(`Test database migration produced foreign key errors: ${JSON.stringify(foreignKeyErrors)}`);
  }

  return { db, sqlite };
}

export function createTestDb() {
  const databasePath = path.join(vitestRuntimeRoot, "databases", `${process.pid}-${crypto.randomUUID()}.sqlite`);
  return createFileTestDb(databasePath);
}

export function createFileTestDb(databasePath: string) {
  assertSafeTestDatabasePath(databasePath, "createFileTestDb databasePath");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");

  return migrateTestDb(sqlite);
}

export function truncateAll(sqlite: Database.Database): void {
  const tables = [
    "app_settings",
    "users",
    "permissions",
    "roles",
    "catalog_entries",
    "use_case_tasks",
    "feature_tasks",
    "milestone_tasks",
    "project_tasks",
    "ticket_comments",
    "wiki_page_comments",
    "backlog_item_comments",
    "use_case_comments",
    "feature_comments",
    "milestone_comments",
    "task_comments",
    "project_comments",
    "ticket_attachments",
    "feature_attachments",
    "milestone_attachments",
    "task_attachments",
    "project_attachments",
    "use_case_tickets",
    "feature_tickets",
    "milestone_tickets",
    "task_tickets",
    "project_tickets",
    "milestone_features",
    "project_features",
    "milestone_events",
    "backlog_items",
    "use_cases",
    "wiki_pages",
    "feature_relations",
    "features",
    "comments",
    "ticket_relations",
    "ticket_tags",
    "ticket_notes",
    "milestone_tags",
    "milestone_notes",
    "task_tags",
    "project_tags",
    "task_notes",
    "project_notes",
    "attachments",
    "task_events",
    "project_events",
    "events",
    "tickets",
    "tasks",
    "notes",
    "tags",
    "milestones",
    "projects"
  ] as const;

  sqlite.pragma("foreign_keys = OFF");
  try {
    sqlite.transaction(() => {
      for (const table of tables) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
        sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(table);
      }
      seedDefaultAuth(sqlite);
      seedDefaultCatalogEntries(sqlite);
    })();
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
