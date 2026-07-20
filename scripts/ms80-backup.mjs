import { ZipArchive } from "archiver";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import mysql from "mysql2/promise";

const require = createRequire(import.meta.url);
const unzipper = require("unzipper");

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(repoRoot, "apps", "api");
const statementMarker = "\n-- MS80_STATEMENT_END\n";

function loadEnvironment(filePath) {
  const parsed = loadDotenv({ path: filePath, processEnv: {} }).parsed ?? {};
  return { ...parsed, ...process.env };
}

function isEnabled(value) {
  return value === "true" || value === "1";
}

function databaseOptions(environment, databaseName) {
  const ssl = isEnabled(environment.DB_SSL);
  return {
    host: environment.DB_HOST?.trim() || "localhost",
    port: Number(environment.DB_PORT || 3306),
    user: environment.DB_USER?.trim() || "taskmanager",
    password: environment.DB_PASSWORD ?? "",
    database: databaseName ?? environment.DB_NAME?.trim() ?? "taskmanager",
    dateStrings: true,
    ...(ssl
      ? {
          ssl: {
            rejectUnauthorized: true,
            ca: awaitFile(path.join(repoRoot, "docs", "Zertifikate", "ca.pem")),
          },
        }
      : {}),
  };
}

function awaitFile(filePath) {
  return fs.readFile(filePath, "utf8");
}

async function resolvedDatabaseOptions(environment, databaseName) {
  const options = databaseOptions(environment, databaseName);
  if (options.ssl) {
    options.ssl.ca = await options.ssl.ca;
  }
  return options;
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

async function listFiles(rootDirectory) {
  const result = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are not supported in the backup source: ${absolutePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(absolutePath);
        result.push({
          path: path.relative(rootDirectory, absolutePath).split(path.sep).join("/"),
          size: stats.size,
          sha256: await sha256(absolutePath),
        });
      }
    }
  }
  await visit(rootDirectory);
  return result;
}

async function createZip(sourceDirectory, targetPath) {
  await new Promise((resolve, reject) => {
    const output = createWriteStream(targetPath, { flags: "wx" });
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDirectory, false);
    void archive.finalize();
  });
}

async function writeSqlStatement(handle, sql) {
  await handle.write(`${sql.trim()}${statementMarker}`);
}

async function dumpDatabase(environment, targetPath) {
  const options = await resolvedDatabaseOptions(environment);
  const connection = await mysql.createConnection(options);
  const handle = await fs.open(targetPath, "wx");
  const tableCounts = {};
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    const [tableRows] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableNames = tableRows
      .map((row) => String(Object.values(row)[0]))
      .sort((left, right) => left.localeCompare(right, "en"));

    await writeSqlStatement(handle, "SET NAMES utf8mb4");
    await writeSqlStatement(handle, "SET SQL_MODE = 'ANSI_QUOTES'");
    await writeSqlStatement(handle, "SET FOREIGN_KEY_CHECKS = 0");
    for (const tableName of tableNames) {
      const tableIdentifier = quoteIdentifier(tableName);
      const [createRows] = await connection.query(`SHOW CREATE TABLE ${tableIdentifier}`);
      const createSql = createRows[0]?.["Create Table"];
      if (typeof createSql !== "string") {
        throw new Error(`CREATE TABLE statement is unavailable for ${tableName}`);
      }
      await writeSqlStatement(handle, `DROP TABLE IF EXISTS ${tableIdentifier}`);
      await writeSqlStatement(handle, createSql);

      const [rows, fields] = await connection.query({ sql: `SELECT * FROM ${tableIdentifier}`, rowsAsArray: true });
      tableCounts[tableName] = rows.length;
      if (rows.length === 0) {
        continue;
      }
      const columns = fields.map((field) => quoteIdentifier(field.name)).join(", ");
      let batch = [];
      let batchLength = 0;
      for (const row of rows) {
        const serialized = `(${row.map((value) => connection.escape(value)).join(", ")})`;
        if (batch.length > 0 && (batch.length >= 250 || batchLength + serialized.length > 1_000_000)) {
          await writeSqlStatement(handle, `INSERT INTO ${tableIdentifier} (${columns}) VALUES\n${batch.join(",\n")}`);
          batch = [];
          batchLength = 0;
        }
        batch.push(serialized);
        batchLength += serialized.length;
      }
      if (batch.length > 0) {
        await writeSqlStatement(handle, `INSERT INTO ${tableIdentifier} (${columns}) VALUES\n${batch.join(",\n")}`);
      }
    }
    await writeSqlStatement(handle, "SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await handle.close();
    await connection.end();
  }
  return { databaseName: options.database, tableCounts };
}

async function createBackup() {
  const environment = loadEnvironment(path.join(apiRoot, ".env"));
  const uploadDirectory = path.isAbsolute(environment.UPLOAD_DIR ?? "")
    ? path.resolve(environment.UPLOAD_DIR)
    : path.resolve(apiRoot, environment.UPLOAD_DIR?.trim() || "./uploads");
  const uploadStats = await fs.stat(uploadDirectory);
  if (!uploadStats.isDirectory()) {
    throw new Error(`UPLOAD_DIR is not a directory: ${uploadDirectory}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(repoRoot, "backups");
  const backupDirectory = path.join(backupRoot, `ms80-${timestamp}`);
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.mkdir(backupDirectory, { recursive: false });
  const sqlPath = path.join(backupDirectory, "database.sql");
  const uploadsPath = path.join(backupDirectory, "uploads.zip");
  const database = await dumpDatabase(environment, sqlPath);
  const uploadFiles = await listFiles(uploadDirectory);
  await createZip(uploadDirectory, uploadsPath);

  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    purpose: "MS-80 pre-category-cleanup backup",
    database,
    uploads: {
      fileCount: uploadFiles.length,
      totalBytes: uploadFiles.reduce((sum, file) => sum + file.size, 0),
      files: uploadFiles,
    },
    artifacts: {
      databaseSql: { file: "database.sql", sha256: await sha256(sqlPath) },
      uploadsZip: { file: "uploads.zip", sha256: await sha256(uploadsPath) },
    },
  };
  await fs.writeFile(path.join(backupDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${backupDirectory}\n`);
}

function assertLocalRestoreHost(host) {
  if (!["127.0.0.1", "localhost", "::1"].includes(host.toLowerCase())) {
    throw new Error(`Restore verification is restricted to a local test database, received host '${host}'.`);
  }
}

async function extractZip(zipPath, targetDirectory) {
  await fs.mkdir(targetDirectory, { recursive: true });
  await new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetDirectory }))
      .on("close", resolve)
      .on("error", reject);
  });
}

async function verifyBackup(backupArgument) {
  if (!backupArgument) {
    throw new Error("Usage: node scripts/ms80-backup.mjs verify <backup-directory>");
  }
  const backupDirectory = path.resolve(repoRoot, backupArgument);
  const manifest = JSON.parse(await fs.readFile(path.join(backupDirectory, "manifest.json"), "utf8"));
  const sqlPath = path.join(backupDirectory, manifest.artifacts.databaseSql.file);
  const uploadsPath = path.join(backupDirectory, manifest.artifacts.uploadsZip.file);
  if (await sha256(sqlPath) !== manifest.artifacts.databaseSql.sha256) {
    throw new Error("database.sql checksum mismatch");
  }
  if (await sha256(uploadsPath) !== manifest.artifacts.uploadsZip.sha256) {
    throw new Error("uploads.zip checksum mismatch");
  }

  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-ms80-restore-"));
  const extractedUploads = path.join(temporaryRoot, "uploads");
  const testEnvironment = loadEnvironment(path.join(repoRoot, ".env.test"));
  const restoreHost = testEnvironment.TEST_DB_HOST ?? "127.0.0.1";
  assertLocalRestoreHost(restoreHost);
  const restoreEnvironment = {
    DB_HOST: restoreHost,
    DB_PORT: testEnvironment.TEST_DB_PORT ?? "3306",
    DB_USER: testEnvironment.TEST_DB_USER ?? "root",
    DB_PASSWORD: testEnvironment.TEST_DB_PASSWORD ?? "",
    DB_SSL: "false",
  };
  const databaseName = `taskmanager_test_ms80_restore_${randomUUID().replaceAll("-", "")}`;
  const adminOptions = await resolvedDatabaseOptions(restoreEnvironment, undefined);
  delete adminOptions.database;
  let adminConnection;
  let restoreConnection;
  try {
    await extractZip(uploadsPath, extractedUploads);
    const restoredFiles = await listFiles(extractedUploads);
    if (JSON.stringify(restoredFiles) !== JSON.stringify(manifest.uploads.files)) {
      throw new Error("Restored upload files do not match the manifest");
    }

    adminConnection = await mysql.createConnection(adminOptions);
    await adminConnection.query(`CREATE DATABASE ${quoteIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    restoreConnection = await mysql.createConnection({ ...adminOptions, database: databaseName, dateStrings: true });
    const sql = await fs.readFile(sqlPath, "utf8");
    const statements = sql.split(statementMarker).map((statement) => statement.trim()).filter(Boolean);
    for (const [index, statement] of statements.entries()) {
      try {
        await restoreConnection.query(statement);
      } catch (error) {
        throw new Error(`Restore statement ${index + 1} failed: ${statement.slice(0, 160)}`, { cause: error });
      }
    }
    for (const [tableName, expectedCount] of Object.entries(manifest.database.tableCounts)) {
      const [rows] = await restoreConnection.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
      if (Number(rows[0]?.count ?? -1) !== Number(expectedCount)) {
        throw new Error(`Restored row count mismatch for ${tableName}`);
      }
    }
  } finally {
    await restoreConnection?.end();
    if (adminConnection) {
      await adminConnection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
      await adminConnection.end();
    }
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
  process.stdout.write(`Backup verified: ${backupDirectory}\n`);
}

const [command, backupArgument] = process.argv.slice(2);
if (command === "create") {
  await createBackup();
} else if (command === "verify") {
  await verifyBackup(backupArgument);
} else {
  throw new Error("Usage: node scripts/ms80-backup.mjs <create|verify> [backup-directory]");
}
