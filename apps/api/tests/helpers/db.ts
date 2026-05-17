import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "../../src/db/schema.js";
import { assertSafeTestDatabasePath } from "../../src/runtime-safety.js";

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
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");

  return migrateTestDb(sqlite);
}

export function createFileTestDb(databasePath: string) {
  assertSafeTestDatabasePath(databasePath, "createFileTestDb databasePath");
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");

  return migrateTestDb(sqlite);
}

export function truncateAll(sqlite: Database.Database): void {
  const tables = [
    "seed_run_items",
    "task_use_cases",
    "task_features",
    "project_features",
    "backlog_items",
    "use_cases",
    "wiki_pages",
    "features",
    "comments",
    "task_tags",
    "project_tags",
    "task_notes",
    "project_notes",
    "attachments",
    "events",
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
