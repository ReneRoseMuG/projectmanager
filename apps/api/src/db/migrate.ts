import { migrate } from "drizzle-orm/mysql2/migrator";
import { fileURLToPath } from "node:url";
import { closeDatabase, db } from "./client.js";

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

try {
  await migrate(db, { migrationsFolder, migrationsTable: "__drizzle_migrations_taskmanager" });
} finally {
  await closeDatabase();
}
