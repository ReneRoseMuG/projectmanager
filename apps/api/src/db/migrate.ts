import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { db, sqlite } from "./client.js";

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

interface ForeignKeyViolation {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

try {
  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder });
  sqlite.pragma("foreign_keys = ON");

  const violations = sqlite.pragma("foreign_key_check") as ForeignKeyViolation[];
  if (violations.length > 0) {
    throw new Error(`Foreign key check failed after migration: ${JSON.stringify(violations)}`);
  }
} finally {
  sqlite.close();
}
