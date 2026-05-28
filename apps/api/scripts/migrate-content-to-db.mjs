import "dotenv/config";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveFromApiRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
}

const databasePath = resolveFromApiRoot(process.env.DATABASE_PATH ?? "./data/taskmanager.sqlite");
const contentRoot = resolveFromApiRoot(process.env.CONTENT_DIR ?? "./content");

const targets = [
  { tableName: "features", subdir: "features" },
  { tableName: "use_cases", subdir: "usecases" },
  { tableName: "wiki_pages", subdir: "wiki" }
];

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function resolveStoredContentPath(contentPath) {
  const normalizedPath = contentPath.replace(/\\/g, "/").replace(/^content\//, "");
  const [subdir, ...filenameParts] = normalizedPath.split("/");
  if (!targets.some((target) => target.subdir === subdir)) {
    throw new Error(`Stored content path '${contentPath}' uses an unknown content subdirectory`);
  }
  const absolutePath = path.resolve(contentRoot, subdir, filenameParts.join("/"));
  const allowedRoot = path.resolve(contentRoot, subdir);
  const relativePath = path.relative(allowedRoot, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Stored content path '${contentPath}' points outside the content directory`);
  }
  return absolutePath;
}

function migrateTable(database, target) {
  const rows = database
    .prepare(
      `SELECT id, content_path FROM ${quoteIdentifier(target.tableName)} WHERE content IS NULL AND content_path IS NOT NULL ORDER BY id`
    )
    .all();
  const update = database.prepare(`UPDATE ${quoteIdentifier(target.tableName)} SET content = ? WHERE id = ?`);
  let migrated = 0;
  let missing = 0;

  for (const row of rows) {
    const contentPath = String(row.content_path);
    const absolutePath = resolveStoredContentPath(contentPath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`[${target.tableName}] id=${row.id} missing content file: ${contentPath}`);
      missing += 1;
      continue;
    }
    const content = fs.readFileSync(absolutePath, "utf8");
    update.run(content, row.id);
    migrated += 1;
  }

  console.log(`[${target.tableName}] migrated=${migrated} missing=${missing}`);
  return missing;
}

const database = new Database(databasePath);
try {
  let missingTotal = 0;
  database.transaction(() => {
    for (const target of targets) {
      missingTotal += migrateTable(database, target);
    }
  })();
  if (missingTotal > 0) {
    process.exitCode = 1;
  }
} finally {
  database.close();
}
