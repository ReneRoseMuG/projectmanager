import type { MigrationConfig, MigrationMeta } from "drizzle-orm/migrator";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./client.js";

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));
const migrationsTable = "__drizzle_migrations";

interface DrizzleJournalEntry {
  tag: string;
  when: number;
  breakpoints: boolean;
}

interface DrizzleJournal {
  entries: DrizzleJournalEntry[];
}

interface ForeignKeyViolation {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

interface AppliedMigrationRow {
  created_at: number | string;
}

function readLegacyMigrationFiles(config: MigrationConfig): MigrationMeta[] {
  const journalPath = path.join(config.migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as DrizzleJournal;

  return journal.entries.map((entry) => {
    const migrationPath = path.join(config.migrationsFolder, `${entry.tag}.sql`);
    const query = fs.readFileSync(migrationPath, "utf8");

    return {
      sql: entry.breakpoints ? query.split("--> statement-breakpoint") : [query],
      bps: entry.breakpoints,
      folderMillis: entry.when,
      hash: crypto.createHash("sha256").update(query).digest("hex"),
      name: entry.tag
    };
  });
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function readAppliedMigrations(tableName: string): Set<number> {
  const table = quoteIdentifier(tableName);

  sqlite
    .prepare(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)`)
    .run();

  const rows = sqlite.prepare(`SELECT created_at FROM ${table}`).all() as AppliedMigrationRow[];

  return new Set(rows.map((row) => Number(row.created_at)));
}

function migrateLegacy(config: MigrationConfig): void {
  const migrations = readLegacyMigrationFiles(config);
  const tableName = config.migrationsTable ?? migrationsTable;
  const table = quoteIdentifier(tableName);
  const appliedMigrations = readAppliedMigrations(tableName);

  const runMigration = sqlite.transaction((migration: MigrationMeta) => {
    for (const statement of migration.sql) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        sqlite.exec(trimmedStatement);
      }
    }

    sqlite.prepare(`INSERT INTO ${table} (hash, created_at) VALUES (?, ?)`).run(migration.hash, migration.folderMillis);
  });

  for (const migration of migrations) {
    if (appliedMigrations.has(migration.folderMillis)) {
      continue;
    }

    runMigration(migration);
  }
}

try {
  sqlite.pragma("foreign_keys = OFF");
  migrateLegacy({ migrationsFolder });
  sqlite.pragma("foreign_keys = ON");

  const violations = sqlite.pragma("foreign_key_check") as ForeignKeyViolation[];
  if (violations.length > 0) {
    throw new Error(`Foreign key check failed after migration: ${JSON.stringify(violations)}`);
  }
} finally {
  sqlite.close();
}
