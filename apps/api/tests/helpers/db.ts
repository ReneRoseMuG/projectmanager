import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../../src/db/schema.js";
import { assertSafeTestDatabasePath, vitestRuntimeRoot } from "../../src/runtime-safety.js";

export type TestDb = ReturnType<typeof createTestDb>;

function migrateTestDb(sqlite: Database.Database) {
  const db = drizzle(sqlite, { schema });
  const migrationsFolder = fileURLToPath(new URL("../../src/db/migrations", import.meta.url));

  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder });
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
    "seed_run_items",
    "app_settings",
    "use_case_tasks",
    "feature_tasks",
    "project_tasks",
    "ticket_comments",
    "wiki_page_comments",
    "backlog_item_comments",
    "use_case_comments",
    "feature_comments",
    "task_comments",
    "project_comments",
    "ticket_attachments",
    "feature_attachments",
    "task_attachments",
    "project_attachments",
    "use_case_tickets",
    "feature_tickets",
    "task_tickets",
    "project_tickets",
    "project_features",
    "backlog_items",
    "use_cases",
    "wiki_pages",
    "feature_relations",
    "features",
    "comments",
    "ticket_relations",
    "ticket_tags",
    "ticket_notes",
    "task_tags",
    "project_tags",
    "task_notes",
    "project_notes",
    "attachments",
    "events",
    "tickets",
    "tasks",
    "notes",
    "tags",
    "projects",
    "seed_runs"
  ] as const;

  sqlite.pragma("foreign_keys = OFF");
  try {
    sqlite.transaction(() => {
      for (const table of tables) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
        sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(table);
      }
    })();
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
