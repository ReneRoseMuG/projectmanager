import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as schema from "../../../apps/api/src/db/schema.js";
import { assertSafeTestDatabaseTarget } from "../../../apps/api/src/runtime-safety.js";

export type TestDb = {
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: mysql.Pool;
  dbName: string;
  close: () => Promise<void>;
};

const defaultCatalogEntries = [
  ["workStatus", "active", "Aktiv", 100, 0, "var(--color-fern)"],
  ["workStatus", "on_hold", "Pausiert", 200, 0, "var(--color-steel-500)"],
  ["workStatus", "completed", "Abgeschlossen", 300, 1, "var(--color-steel-500)"],
  ["workStatus", "archived", "Archiviert", 400, 1, "var(--color-steel-500)"],
  ["workStatus", "todo", "Offen", 500, 0, "var(--color-fern)"],
  ["workStatus", "open", "Offen", 600, 0, "var(--color-fern)"],
  ["workStatus", "in_progress", "In Arbeit", 700, 0, "var(--color-tangerine)"],
  ["workStatus", "in_review", "In Prüfung", 800, 0, "var(--color-mustard)"],
  ["workStatus", "done", "Erledigt", 900, 1, "var(--color-steel-500)"],
  ["workStatus", "resolved", "Gelöst", 1000, 1, "var(--color-steel-500)"],
  ["workStatus", "closed", "Geschlossen", 1100, 1, "var(--color-steel-500)"],
  ["workStatus", "rejected", "Verworfen", 1200, 1, "var(--color-steel-500)"],
  ["featureStatus", "draft", "Entwurf", 100, 0, "var(--color-violet)"],
  ["featureStatus", "active", "Aktiv", 200, 0, "var(--color-tangerine)"],
  ["featureStatus", "done", "Erledigt", 300, 1, "var(--color-steel-500)"],
  ["featureStatus", "archived", "Archiviert", 400, 1, "var(--color-steel-500)"],
  ["priority", "low", "Niedrig", 100, 0, "var(--color-steel-400)"],
  ["priority", "medium", "Mittel", 200, 0, "var(--color-mustard)"],
  ["priority", "high", "Hoch", 300, 0, "var(--color-tangerine)"],
  ["priority", "urgent", "Dringend", 400, 0, "var(--color-crimson)"],
  ["ticketType", "bug", "Bug", 100, 0, "var(--color-crimson)"],
  ["ticketType", "improvement", "Verbesserung", 200, 0, "var(--color-teal)"],
  ["ticketType", "question", "Frage", 300, 0, "var(--color-violet)"],
  ["ticketType", "task", "Aufgabe", 400, 0, "var(--color-steel-500)"]
] as const;

export function baseConnectionConfig() {
  // TEST_DB_* vars take precedence so tests can use a local MySQL
  // independent of the production DB configured in apps/api/.env
  return {
    host: process.env.TEST_DB_HOST ?? process.env.DB_HOST ?? "localhost",
    port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? 3306),
    user: process.env.TEST_DB_USER ?? process.env.DB_USER ?? "root",
    password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
  };
}

export async function seedDefaultCatalogEntries(pool: mysql.Pool): Promise<void> {
  for (const [kind, key, label, sort_order, is_closed, color] of defaultCatalogEntries) {
    await pool.execute(
      "INSERT INTO catalog_entries (kind, `key`, label, sort_order, is_closed, color, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())",
      [kind, key, label, sort_order, is_closed, color]
    );
  }
}

export async function seedDefaultAuth(pool: mysql.Pool): Promise<void> {
  // Use explicit IDs so that role_id=1 (admin), role_id=2 (editor), role_id=3 (reader)
  // and user id=1 (admin) are always stable across truncate cycles.
  await pool.execute(
    "INSERT INTO roles (id, `key`, label, is_system, version, created_at, updated_at) VALUES (1, 'admin', 'Administrator', 1, 1, NOW(), NOW())"
  );
  await pool.execute(
    "INSERT INTO roles (id, `key`, label, is_system, version, created_at, updated_at) VALUES (2, 'editor', 'Editor', 1, 1, NOW(), NOW())"
  );
  await pool.execute(
    "INSERT INTO roles (id, `key`, label, is_system, version, created_at, updated_at) VALUES (3, 'reader', 'Leser', 1, 1, NOW(), NOW())"
  );
  await pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (1, '*', '*')");
  await pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (2, '*', 'read')");
  await pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (2, '*', 'write')");
  await pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (3, '*', 'read')");
  await pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (3, 'notifications', 'write')");
  await pool.execute(
    "INSERT INTO users (id, name, full_name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES (1, '', 'Admin, Test', 'Test', 'Admin', 'admin@local', '$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q', 1, 1, 1, NOW(), NOW())"
  );
  await pool.execute(
    "INSERT INTO app_settings (`key`, value, updated_at) VALUES ('admin_setup_done', 'true', NOW())"
  );
}

export async function createTestDb(): Promise<TestDb> {
  const dbName = `taskmanager_test_${process.pid}_${crypto.randomUUID().replace(/-/g, "")}`;
  const connConfig = baseConnectionConfig();

  // Refuse to create/drop anything but an approved temporary test database.
  assertSafeTestDatabaseTarget(connConfig.host, dbName);

  const adminConn = await mysql.createConnection(connConfig);
  await adminConn.execute(
    `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await adminConn.end();

  const pool = mysql.createPool({ ...connConfig, database: dbName, connectionLimit: 5 });
  const db = drizzle({ client: pool, schema });

  const migrationsFolder = fileURLToPath(
    new URL("../../../apps/api/src/db/migrations", import.meta.url)
  );
  await migrate(db, {
    migrationsFolder,
    migrationsTable: "__drizzle_migrations_taskmanager"
  });

  await seedDefaultAuth(pool);
  await seedDefaultCatalogEntries(pool);

  return {
    db,
    pool,
    dbName,
    close: async () => {
      await pool.end();
      const dropConn = await mysql.createConnection(connConfig);
      await dropConn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await dropConn.end();
    }
  };
}

const truncateTables = [
  "app_settings",
  "settings_values",
  "dashboard_defaults",
  "dashboard_widgets",
  "dashboards",
  "push_subscriptions",
  "journal_entry_contexts",
  "journal_entry_changes",
  "journal_entries",
  "users",
  "permissions",
  "roles",
  "catalog_entries",
  "use_case_tasks",
  "wiki_page_tasks",
  "feature_tasks",
  "day_plan_tasks",
  "day_plan_notes",
  "wiki_page_notes",
  "milestone_tasks",
  "project_tasks",
  "day_plan_comments",
  "ticket_comments",
  "wiki_page_comments",
  "backlog_item_comments",
  "use_case_comments",
  "feature_comments",
  "milestone_comments",
  "task_comments",
  "project_comments",
  "ticket_attachments",
  "wiki_page_attachments",
  "feature_attachments",
  "milestone_attachments",
  "task_attachments",
  "project_attachments",
  "use_case_tickets",
  "wiki_page_tickets",
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
  "diary_entries",
  "wiki_page_relations",
  "feature_relations",
  "features",
  "comments",
  "content_images",
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
  "sent_notifications",
  "day_plan_events",
  "task_events",
  "project_events",
  "events",
  "tickets",
  "tasks",
  "notes",
  "day_plans",
  "tags",
  "milestones",
  "projects"
] as const;

export async function truncateAll(pool: mysql.Pool): Promise<void> {
  // Use a single connection with FK checks disabled so self-referential tables
  // (wiki_pages.parent_id) and other FK constraints don't block deletion.
  // DELETE FROM (unlike TRUNCATE) does not cause implicit commits, so this is safe.
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of truncateTables) {
      await conn.query(`DELETE FROM \`${table}\``);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    conn.release();
  }
  await seedDefaultAuth(pool);
  await seedDefaultCatalogEntries(pool);
}
