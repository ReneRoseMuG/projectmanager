import type {
  DumpDriveApplyResult,
  DumpDriveFile,
  DumpDrivePreviewResult,
  DumpDriveSaveResult,
  DumpFileRootSummary,
  DumpTableSummary
} from "@taskmanager/shared-types";
import * as archiverPackage from "archiver";
import type { Archiver } from "archiver";
import type Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import unzipper from "unzipper";
import { config } from "../config.js";
import { assertSafeTestDatabasePath, assertSafeTestDirectoryPath } from "../runtime-safety.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { getContentBaseDir } from "./content.service.js";
import type { GoogleDriveBackupClient } from "./google-drive.service.js";

const APP_ID = "taskmanager";
const DUMP_FORMAT_VERSION = 6;
const DUMP_FILENAME_PREFIX = "taskmanager_dump_";
const ZipArchive = (archiverPackage as unknown as {
  ZipArchive: new (options: { zlib: { level: number } }) => Archiver;
}).ZipArchive;

function createArchive(): Archiver {
  return new ZipArchive({ zlib: { level: 6 } });
}

const DUMP_TABLES = [
  { key: "appSettings", tableName: "app_settings" },
  { key: "users", tableName: "users" },
  { key: "projects", tableName: "projects" },
  { key: "tags", tableName: "tags" },
  { key: "notes", tableName: "notes" },
  { key: "features", tableName: "features" },
  { key: "tasks", tableName: "tasks" },
  { key: "tickets", tableName: "tickets" },
  { key: "useCases", tableName: "use_cases" },
  { key: "wikiPages", tableName: "wiki_pages" },
  { key: "comments", tableName: "comments" },
  { key: "attachments", tableName: "attachments" },
  { key: "events", tableName: "events" },
  { key: "projectEvents", tableName: "project_events" },
  { key: "taskEvents", tableName: "task_events" },
  { key: "backlogItems", tableName: "backlog_items" },
  { key: "featureRelations", tableName: "feature_relations" },
  { key: "projectTags", tableName: "project_tags" },
  { key: "taskTags", tableName: "task_tags" },
  { key: "ticketTags", tableName: "ticket_tags" },
  { key: "projectNotes", tableName: "project_notes" },
  { key: "taskNotes", tableName: "task_notes" },
  { key: "ticketNotes", tableName: "ticket_notes" },
  { key: "projectFeatures", tableName: "project_features" },
  { key: "projectTasks", tableName: "project_tasks" },
  { key: "featureTasks", tableName: "feature_tasks" },
  { key: "useCaseTasks", tableName: "use_case_tasks" },
  { key: "projectTickets", tableName: "project_tickets" },
  { key: "taskTickets", tableName: "task_tickets" },
  { key: "featureTickets", tableName: "feature_tickets" },
  { key: "useCaseTickets", tableName: "use_case_tickets" },
  { key: "ticketRelations", tableName: "ticket_relations" },
  { key: "projectComments", tableName: "project_comments" },
  { key: "taskComments", tableName: "task_comments" },
  { key: "featureComments", tableName: "feature_comments" },
  { key: "useCaseComments", tableName: "use_case_comments" },
  { key: "backlogItemComments", tableName: "backlog_item_comments" },
  { key: "wikiPageComments", tableName: "wiki_page_comments" },
  { key: "ticketComments", tableName: "ticket_comments" },
  { key: "projectAttachments", tableName: "project_attachments" },
  { key: "taskAttachments", tableName: "task_attachments" },
  { key: "featureAttachments", tableName: "feature_attachments" },
  { key: "ticketAttachments", tableName: "ticket_attachments" }
] as const;

export const DUMP_TABLE_KEYS = DUMP_TABLES.map((entry) => entry.key);

type DumpTableKey = (typeof DUMP_TABLE_KEYS)[number];
type DumpTableRows = Record<DumpTableKey, Array<Record<string, unknown>>>;

interface DumpPayload {
  appId: typeof APP_ID;
  formatVersion: typeof DUMP_FORMAT_VERSION;
  dumpId: string;
  exportedAt: string;
  schemaRevision: string;
  tables: DumpTableRows;
}

interface DumpFileEntry {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

interface DumpFileRootManifest extends DumpFileRootSummary {
  files: DumpFileEntry[];
}

interface DumpManifest {
  appId: typeof APP_ID;
  formatVersion: typeof DUMP_FORMAT_VERSION;
  dumpId: string;
  exportedAt: string;
  schemaRevision: string;
  tables: Record<DumpTableKey, DumpTableSummary>;
  fileRoots: Record<"uploads" | "content", DumpFileRootManifest>;
}

interface InspectedDump extends DumpDrivePreviewResult {
  payload: DumpPayload;
  directory: unzipper.CentralDirectory;
}

interface StagedFileRoots {
  uploads: string;
  content: string;
}

interface FileRootBackup {
  key: "uploads" | "content";
  targetDir: string;
  backupDir: string;
  existed: boolean;
}

interface ApplyDumpOptions {
  afterFileSwap?: () => void;
}

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw badRequest(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function sha256Buffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value), "utf8"));
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildDumpId(exportedAt: string): string {
  return `${DUMP_FILENAME_PREFIX}${exportedAt.replace(/[:.]/g, "-")}`;
}

function buildDumpFilename(dumpId: string): string {
  return `${dumpId}.zip`;
}

function ensureWorkDir(): string {
  assertSafeTestDirectoryPath(config.backupWorkDir, "BACKUP_WORK_DIR");
  fs.mkdirSync(config.backupWorkDir, { recursive: true });
  return config.backupWorkDir;
}

function assertSafeDumpRuntimeTargets(): void {
  assertSafeTestDatabasePath(config.databasePath);
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  assertSafeTestDirectoryPath(getContentBaseDir(), "CONTENT_DIR");
  assertSafeTestDirectoryPath(config.backupWorkDir, "BACKUP_WORK_DIR");
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function getSchemaRevision(): string {
  const candidates = [
    path.resolve(process.cwd(), "src", "db", "migrations", "meta", "_journal.json"),
    path.resolve(process.cwd(), "apps", "api", "src", "db", "migrations", "meta", "_journal.json")
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as {
        entries?: Array<{ idx?: number; tag?: string }>;
      };
      const lastEntry = Array.isArray(parsed.entries)
        ? [...parsed.entries].sort((a, b) => Number(a.idx ?? 0) - Number(b.idx ?? 0)).at(-1)
        : null;
      if (typeof lastEntry?.tag === "string" && lastEntry.tag.length > 0) {
        return lastEntry.tag;
      }
    } catch {
      // Try the next runtime path candidate.
    }
  }

  return "unknown";
}

function selectTableRows(sqlite: Database.Database, tableName: string): Array<Record<string, unknown>> {
  return sqlite.prepare(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY rowid`).all() as Array<Record<string, unknown>>;
}

function collectDumpTableRows(sqlite: Database.Database): DumpTableRows {
  const result = {} as DumpTableRows;
  for (const entry of DUMP_TABLES) {
    result[entry.key] = selectTableRows(sqlite, entry.tableName);
  }
  return result;
}

function buildTableManifest(rows: DumpTableRows): Record<DumpTableKey, DumpTableSummary> {
  const result = {} as Record<DumpTableKey, DumpTableSummary>;
  for (const entry of DUMP_TABLES) {
    const tableRows = rows[entry.key];
    result[entry.key] = {
      key: entry.key,
      rowCount: tableRows.length,
      sha256: sha256Json(tableRows)
    };
  }
  return result;
}

function assertSafeRelativePath(relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.includes("../") ||
    normalized === ".." ||
    path.isAbsolute(normalized)
  ) {
    throw badRequest("Dump contains an unsafe file path");
  }
}

function listFilesRecursive(rootDir: string): DumpFileEntry[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: DumpFileEntry[] = [];
  const walk = (currentDir: string): void => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const targetPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(targetPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relativePath = path.relative(rootDir, targetPath).replace(/\\/g, "/");
      assertSafeRelativePath(relativePath);
      const buffer = fs.readFileSync(targetPath);
      results.push({
        relativePath,
        sizeBytes: buffer.byteLength,
        sha256: sha256Buffer(buffer)
      });
    }
  };

  walk(rootDir);
  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
}

function buildFileRootManifest(key: "uploads" | "content", rootDir: string): DumpFileRootManifest {
  const files = listFilesRecursive(rootDir);
  return {
    key,
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    sha256: sha256Json(files),
    files
  };
}

function buildFileRootSummaries(manifest: DumpManifest): DumpFileRootSummary[] {
  return [
    {
      key: "uploads",
      fileCount: manifest.fileRoots.uploads.fileCount,
      totalBytes: manifest.fileRoots.uploads.totalBytes,
      sha256: manifest.fileRoots.uploads.sha256
    },
    {
      key: "content",
      fileCount: manifest.fileRoots.content.fileCount,
      totalBytes: manifest.fileRoots.content.totalBytes,
      sha256: manifest.fileRoots.content.sha256
    }
  ];
}

function appendDirectoryIfExists(archive: Archiver, rootDir: string, archiveRoot: string): void {
  if (fs.existsSync(rootDir)) {
    archive.directory(rootDir, archiveRoot);
  }
}

function archiveToBuffer(archive: Archiver): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    void archive.finalize();
  });
}

export async function buildDumpArchive(sqlite: Database.Database): Promise<{
  buffer: Buffer;
  dumpId: string;
  filename: string;
  manifest: DumpManifest;
}> {
  assertSafeDumpRuntimeTargets();
  const exportedAt = nowIso();
  const dumpId = buildDumpId(exportedAt);
  const schemaRevision = getSchemaRevision();
  const tables = collectDumpTableRows(sqlite);
  const payload: DumpPayload = {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId,
    exportedAt,
    schemaRevision,
    tables
  };
  const manifest: DumpManifest = {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId,
    exportedAt,
    schemaRevision,
    tables: buildTableManifest(tables),
    fileRoots: {
      uploads: buildFileRootManifest("uploads", config.uploadDir),
      content: buildFileRootManifest("content", getContentBaseDir())
    }
  };

  const archive = createArchive();
  archive.append(`${JSON.stringify(payload, null, 2)}\n`, { name: "data.json" });
  archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: "manifest.json" });
  appendDirectoryIfExists(archive, config.uploadDir, "uploads");
  appendDirectoryIfExists(archive, getContentBaseDir(), "content");

  return {
    buffer: await archiveToBuffer(archive),
    dumpId,
    filename: buildDumpFilename(dumpId),
    manifest
  };
}

function parseObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest(`${label} has an invalid format`);
  }
  return value as Record<string, unknown>;
}

function parsePayload(raw: unknown): DumpPayload {
  const candidate = parseObject(raw, "data.json");
  if (candidate.appId !== APP_ID) {
    throw badRequest("Dump belongs to another application");
  }
  if (candidate.formatVersion !== DUMP_FORMAT_VERSION) {
    throw badRequest("Unsupported dump format version");
  }
  if (typeof candidate.dumpId !== "string" || typeof candidate.exportedAt !== "string" || typeof candidate.schemaRevision !== "string") {
    throw badRequest("Dump metadata is incomplete");
  }

  const rawTables = parseObject(candidate.tables, "data.json tables");
  const unknownKeys = Object.keys(rawTables).filter((key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey));
  if (unknownKeys.length > 0) {
    // Unknown table keys are intentionally ignored by the parser and reported as warnings later.
  }

  const tables = {} as DumpTableRows;
  for (const key of DUMP_TABLE_KEYS) {
    const rows = rawTables[key];
    if (!Array.isArray(rows)) {
      throw badRequest(`Dump table '${key}' is missing or invalid`);
    }
    tables[key] = rows.map((row) => parseObject(row, `Dump row in '${key}'`));
  }

  return {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId: candidate.dumpId,
    exportedAt: candidate.exportedAt,
    schemaRevision: candidate.schemaRevision,
    tables
  };
}

function parseFileRootManifest(raw: unknown, key: "uploads" | "content"): DumpFileRootManifest {
  const candidate = parseObject(raw, `manifest ${key}`);
  const fileCount = Number(candidate.fileCount);
  const totalBytes = Number(candidate.totalBytes);
  const sha256 = candidate.sha256;
  if (!Number.isInteger(fileCount) || fileCount < 0 || !Number.isInteger(totalBytes) || totalBytes < 0 || typeof sha256 !== "string") {
    throw badRequest(`manifest ${key} summary is invalid`);
  }
  if (!Array.isArray(candidate.files)) {
    throw badRequest(`manifest ${key} file list is invalid`);
  }

  const files = candidate.files.map((entry) => {
    const file = parseObject(entry, `manifest ${key} file`);
    const relativePath = file.relativePath;
    const sizeBytes = Number(file.sizeBytes);
    const fileHash = file.sha256;
    if (typeof relativePath !== "string" || !Number.isInteger(sizeBytes) || sizeBytes < 0 || typeof fileHash !== "string") {
      throw badRequest(`manifest ${key} file entry is invalid`);
    }
    assertSafeRelativePath(relativePath);
    return {
      relativePath,
      sizeBytes,
      sha256: fileHash
    };
  });

  return {
    key,
    fileCount,
    totalBytes,
    sha256,
    files
  };
}

function parseManifest(raw: unknown): DumpManifest {
  const candidate = parseObject(raw, "manifest.json");
  if (candidate.appId !== APP_ID) {
    throw badRequest("manifest.json belongs to another application");
  }
  if (candidate.formatVersion !== DUMP_FORMAT_VERSION) {
    throw badRequest("manifest.json has an unsupported format version");
  }
  if (typeof candidate.dumpId !== "string" || typeof candidate.exportedAt !== "string" || typeof candidate.schemaRevision !== "string") {
    throw badRequest("manifest.json metadata is incomplete");
  }

  const tableValues = parseObject(candidate.tables, "manifest tables");
  const tables = {} as Record<DumpTableKey, DumpTableSummary>;
  for (const key of DUMP_TABLE_KEYS) {
    const table = parseObject(tableValues[key], `manifest table '${key}'`);
    const rowCount = Number(table.rowCount);
    const tableHash = table.sha256;
    if (!Number.isInteger(rowCount) || rowCount < 0 || typeof tableHash !== "string") {
      throw badRequest(`manifest table '${key}' is invalid`);
    }
    tables[key] = {
      key,
      rowCount,
      sha256: tableHash
    };
  }

  const fileRoots = parseObject(candidate.fileRoots, "manifest fileRoots");
  return {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId: candidate.dumpId,
    exportedAt: candidate.exportedAt,
    schemaRevision: candidate.schemaRevision,
    tables,
    fileRoots: {
      uploads: parseFileRootManifest(fileRoots.uploads, "uploads"),
      content: parseFileRootManifest(fileRoots.content, "content")
    }
  };
}

async function parseJsonFile(directory: unzipper.CentralDirectory, filename: string): Promise<unknown | null> {
  const file = directory.files.find((entry) => entry.path === filename);
  if (!file) {
    return null;
  }

  try {
    return JSON.parse((await file.buffer()).toString("utf8")) as unknown;
  } catch {
    throw badRequest(`${filename} is not valid JSON`);
  }
}

async function collectZipFiles(directory: unzipper.CentralDirectory, archiveRoot: "uploads" | "content"): Promise<DumpFileRootManifest> {
  const files: DumpFileEntry[] = [];
  const prefix = `${archiveRoot}/`;
  for (const file of directory.files.filter((entry) => entry.path.startsWith(prefix) && !entry.path.endsWith("/"))) {
    const relativePath = file.path.slice(prefix.length);
    assertSafeRelativePath(relativePath);
    const buffer = await file.buffer();
    files.push({
      relativePath,
      sizeBytes: buffer.byteLength,
      sha256: sha256Buffer(buffer)
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  return {
    key: archiveRoot,
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    sha256: sha256Json(files),
    files
  };
}

function buildConfirmationPhrase(dumpId: string, targetDatabasePath: string): string {
  return `AKTUALISIERE TASKMANAGER ${dumpId} NACH ${path.basename(targetDatabasePath)}`;
}

export async function inspectDumpArchive(buffer: Buffer, driveFile: DumpDriveFile): Promise<InspectedDump> {
  let directory: unzipper.CentralDirectory;
  try {
    directory = await unzipper.Open.buffer(buffer);
  } catch {
    throw badRequest("Dump ZIP is invalid or corrupted");
  }

  const rawPayload = await parseJsonFile(directory, "data.json");
  if (!rawPayload) {
    throw badRequest("Dump ZIP does not contain data.json");
  }
  const payload = parsePayload(rawPayload);
  const rawManifest = await parseJsonFile(directory, "manifest.json");
  const manifest = rawManifest ? parseManifest(rawManifest) : null;

  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const payloadTableKeys = new Set(Object.keys(parseObject((rawPayload as Record<string, unknown>).tables, "data.json tables")));
  const unknownTableKeys = [...payloadTableKeys].filter((key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey));
  for (const key of unknownTableKeys) {
    warnings.push(`Unknown dump table '${key}' was ignored.`);
  }

  const actualUploads = await collectZipFiles(directory, "uploads");
  const actualContent = await collectZipFiles(directory, "content");
  const expectedTables = manifest ? Object.values(manifest.tables) : Object.values(buildTableManifest(payload.tables));
  const expectedFileRoots = manifest
    ? buildFileRootSummaries(manifest)
    : [
        { key: "uploads" as const, fileCount: actualUploads.fileCount, totalBytes: actualUploads.totalBytes, sha256: actualUploads.sha256 },
        { key: "content" as const, fileCount: actualContent.fileCount, totalBytes: actualContent.totalBytes, sha256: actualContent.sha256 }
      ];

  if (!manifest) {
    blockingIssues.push("Dump ZIP does not contain manifest.json.");
  } else {
    if (manifest.dumpId !== payload.dumpId) {
      blockingIssues.push("manifest.json dumpId does not match data.json.");
    }
    if (manifest.schemaRevision !== getSchemaRevision()) {
      blockingIssues.push(`Schema revision differs: dump=${manifest.schemaRevision}, target=${getSchemaRevision()}.`);
    }
    for (const key of DUMP_TABLE_KEYS) {
      const actualRows = payload.tables[key];
      const expected = manifest.tables[key];
      if (actualRows.length !== expected.rowCount) {
        blockingIssues.push(`Manifest row count does not match table '${key}'.`);
      }
      if (sha256Json(actualRows) !== expected.sha256) {
        blockingIssues.push(`Manifest hash does not match table '${key}'.`);
      }
    }
    if (
      manifest.fileRoots.uploads.fileCount !== actualUploads.fileCount ||
      manifest.fileRoots.uploads.totalBytes !== actualUploads.totalBytes ||
      manifest.fileRoots.uploads.sha256 !== actualUploads.sha256
    ) {
      blockingIssues.push("Manifest upload summary does not match ZIP content.");
    }
    if (
      manifest.fileRoots.content.fileCount !== actualContent.fileCount ||
      manifest.fileRoots.content.totalBytes !== actualContent.totalBytes ||
      manifest.fileRoots.content.sha256 !== actualContent.sha256
    ) {
      blockingIssues.push("Manifest content summary does not match ZIP content.");
    }
  }

  const knownZipRoots = new Set(["data.json", "manifest.json", "uploads", "content"]);
  for (const file of directory.files) {
    const root = file.path.split("/")[0] ?? "";
    if (!knownZipRoots.has(root)) {
      warnings.push(`Unknown ZIP entry '${file.path}' was ignored.`);
    }
  }

  return {
    payload,
    directory,
    fileHash: sha256Buffer(buffer),
    dumpId: payload.dumpId,
    driveFile,
    targetDatabasePath: config.databasePath,
    transferReadiness: blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockingIssues,
    warnings,
    confirmationPhrase: buildConfirmationPhrase(payload.dumpId, config.databasePath),
    manifestPresent: manifest !== null,
    schemaRevision: manifest?.schemaRevision ?? null,
    expectedTables,
    expectedFileRoots
  };
}

async function stageZipRoot(directory: unzipper.CentralDirectory, archiveRoot: "uploads" | "content"): Promise<string> {
  const stageDir = makeTempDir(`taskmanager-dump-${archiveRoot}-`);
  const prefix = `${archiveRoot}/`;
  try {
    for (const file of directory.files.filter((entry) => entry.path.startsWith(prefix) && !entry.path.endsWith("/"))) {
      const relativePath = file.path.slice(prefix.length);
      assertSafeRelativePath(relativePath);
      const targetPath = path.resolve(stageDir, relativePath);
      const stageRoot = stageDir.endsWith(path.sep) ? stageDir : `${stageDir}${path.sep}`;
      if (!targetPath.startsWith(stageRoot)) {
        throw badRequest("Dump contains an unsafe file path");
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, await file.buffer());
    }
    return stageDir;
  } catch (error) {
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
}

async function stageFileRoots(directory: unzipper.CentralDirectory): Promise<StagedFileRoots> {
  return {
    uploads: await stageZipRoot(directory, "uploads"),
    content: await stageZipRoot(directory, "content")
  };
}

function createFileRootBackups(backupRoot: string): FileRootBackup[] {
  const roots: Array<{ key: "uploads" | "content"; targetDir: string }> = [
    { key: "uploads", targetDir: config.uploadDir },
    { key: "content", targetDir: getContentBaseDir() }
  ];

  return roots.map((root) => {
    const backupDir = path.join(backupRoot, root.key);
    const existed = fs.existsSync(root.targetDir);
    if (existed) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true });
      fs.cpSync(root.targetDir, backupDir, { recursive: true, force: true });
    }
    return { ...root, backupDir, existed };
  });
}

function replaceFileRoots(stagedRoots: StagedFileRoots): void {
  const replacements: Array<{ targetDir: string; stageDir: string }> = [
    { targetDir: config.uploadDir, stageDir: stagedRoots.uploads },
    { targetDir: getContentBaseDir(), stageDir: stagedRoots.content }
  ];

  for (const replacement of replacements) {
    fs.rmSync(replacement.targetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(replacement.targetDir), { recursive: true });
    fs.cpSync(replacement.stageDir, replacement.targetDir, { recursive: true, force: true });
  }
}

function restoreFileRootBackups(backups: FileRootBackup[]): void {
  for (const backup of backups) {
    fs.rmSync(backup.targetDir, { recursive: true, force: true });
    if (backup.existed) {
      fs.mkdirSync(path.dirname(backup.targetDir), { recursive: true });
      fs.cpSync(backup.backupDir, backup.targetDir, { recursive: true, force: true });
    }
  }
}

function tableColumns(sqlite: Database.Database, tableName: string): string[] {
  const rows = sqlite.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

function insertRows(sqlite: Database.Database, tableName: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) {
    return;
  }

  const columns = tableColumns(sqlite, tableName);
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const statement = sqlite.prepare(`INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES (${placeholders})`);
  for (const row of rows) {
    statement.run(columns.map((column) => row[column] ?? null));
  }
}

function restoreTables(sqlite: Database.Database, payload: DumpPayload): number {
  for (const entry of [...DUMP_TABLES].reverse()) {
    sqlite.prepare(`DELETE FROM ${quoteIdentifier(entry.tableName)}`).run();
    sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(entry.tableName);
  }

  let restored = 0;
  for (const entry of DUMP_TABLES) {
    const rows = payload.tables[entry.key];
    insertRows(sqlite, entry.tableName, rows);
    if (rows.length > 0) {
      restored += 1;
    }
  }
  return restored;
}

function assertForeignKeys(sqlite: Database.Database): void {
  const errors = sqlite.pragma("foreign_key_check") as unknown[];
  if (errors.length > 0) {
    throw badRequest(`Dump import produced foreign key errors: ${JSON.stringify(errors)}`);
  }
}

function beginImportTransaction(sqlite: Database.Database): void {
  sqlite.pragma("foreign_keys = OFF");
  sqlite.exec("BEGIN IMMEDIATE");
}

function finishImportTransaction(sqlite: Database.Database): void {
  sqlite.exec("COMMIT");
  sqlite.pragma("foreign_keys = ON");
}

function rollbackImportTransaction(sqlite: Database.Database): void {
  try {
    sqlite.exec("ROLLBACK");
  } catch {
    // The transaction may already be closed by SQLite after a hard error.
  }
  sqlite.pragma("foreign_keys = ON");
}

function currentFileRootSummaries(): DumpFileRootSummary[] {
  return [
    buildFileRootManifest("uploads", config.uploadDir),
    buildFileRootManifest("content", getContentBaseDir())
  ].map(({ key, fileCount, totalBytes, sha256 }) => ({ key, fileCount, totalBytes, sha256 }));
}

function verifyRestoredTables(sqlite: Database.Database, expectedTables: DumpTableSummary[]): string[] {
  const issues: string[] = [];
  const expectedByKey = new Map(expectedTables.map((entry) => [entry.key, entry]));
  for (const entry of DUMP_TABLES) {
    const rows = selectTableRows(sqlite, entry.tableName);
    const expected = expectedByKey.get(entry.key);
    if (!expected || expected.rowCount !== rows.length || expected.sha256 !== sha256Json(rows)) {
      issues.push(`Restored table '${entry.key}' does not match the dump manifest.`);
    }
  }
  return issues;
}

function verifyRestoredFileRoots(expectedFileRoots: DumpFileRootSummary[]): string[] {
  const issues: string[] = [];
  const actualByKey = new Map(currentFileRootSummaries().map((entry) => [entry.key, entry]));
  for (const expected of expectedFileRoots) {
    const actual = actualByKey.get(expected.key);
    if (!actual || actual.fileCount !== expected.fileCount || actual.totalBytes !== expected.totalBytes || actual.sha256 !== expected.sha256) {
      issues.push(`Restored file root '${expected.key}' does not match the dump manifest.`);
    }
  }
  return issues;
}

export async function saveDumpToDrive(sqlite: Database.Database, driveClient: GoogleDriveBackupClient): Promise<DumpDriveSaveResult> {
  const archive = await buildDumpArchive(sqlite);
  const driveFile = await driveClient.uploadDump(archive.filename, archive.buffer);
  return {
    dumpId: archive.dumpId,
    filename: archive.filename,
    sizeBytes: archive.buffer.byteLength,
    driveFile
  };
}

async function inspectDriveFile(driveClient: GoogleDriveBackupClient, driveFile: DumpDriveFile): Promise<InspectedDump> {
  const buffer = await driveClient.downloadFile(driveFile.id);
  return inspectDumpArchive(buffer, driveFile);
}

export async function previewLatestDriveDump(driveClient: GoogleDriveBackupClient): Promise<DumpDrivePreviewResult> {
  const files = await driveClient.listDumpFiles();
  if (files.length === 0) {
    throw notFound("No Google Drive dump file was found");
  }

  const warnings: string[] = [];
  for (const file of files) {
    try {
      const preview = await inspectDriveFile(driveClient, file);
      return {
        ...preview,
        warnings: [...warnings, ...preview.warnings]
      };
    } catch (error) {
      warnings.push(`Drive file '${file.name}' was skipped: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
  }

  throw badRequest("No valid Google Drive dump file was found");
}

export async function applyDriveDump(
  sqlite: Database.Database,
  driveClient: GoogleDriveBackupClient,
  params: { fileId: string; fileHash: string; confirmationPhrase: string },
  options: ApplyDumpOptions = {}
): Promise<DumpDriveApplyResult> {
  assertSafeDumpRuntimeTargets();
  const files = await driveClient.listDumpFiles();
  const driveFile = files.find((file) => file.id === params.fileId);
  if (!driveFile) {
    throw notFound("Google Drive dump file was not found");
  }

  const buffer = await driveClient.downloadFile(driveFile.id);
  const preview = await inspectDumpArchive(buffer, driveFile);
  if (preview.fileHash !== params.fileHash) {
    throw conflict("Dump file hash changed since preview");
  }
  if (preview.confirmationPhrase !== params.confirmationPhrase) {
    throw conflict("Dump confirmation phrase does not match");
  }
  if (preview.blockingIssues.length > 0) {
    throw badRequest(`Dump import is blocked: ${preview.blockingIssues.join(" | ")}`);
  }

  const workDir = ensureWorkDir();
  const transferDir = fs.mkdtempSync(path.join(workDir, "transfer-"));
  const backupRoot = path.join(transferDir, "file-root-backups");
  const targetBackupPath = path.join(transferDir, "target-before-import.zip");
  const targetBackup = await buildDumpArchive(sqlite);
  fs.writeFileSync(targetBackupPath, targetBackup.buffer);

  const stagedRoots = await stageFileRoots(preview.directory);
  const backups = createFileRootBackups(backupRoot);
  let tablesRestored = 0;
  let fileRootsTouched = false;
  let committed = false;

  try {
    beginImportTransaction(sqlite);
    tablesRestored = restoreTables(sqlite, preview.payload);
    assertForeignKeys(sqlite);
    replaceFileRoots(stagedRoots);
    fileRootsTouched = true;
    options.afterFileSwap?.();
    finishImportTransaction(sqlite);
    committed = true;
  } catch (error) {
    if (!committed) {
      rollbackImportTransaction(sqlite);
    }
    if (fileRootsTouched) {
      restoreFileRootBackups(backups);
    }
    throw error;
  } finally {
    fs.rmSync(stagedRoots.uploads, { recursive: true, force: true });
    fs.rmSync(stagedRoots.content, { recursive: true, force: true });
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }

  const blockingIssues = [
    ...verifyRestoredTables(sqlite, preview.expectedTables),
    ...verifyRestoredFileRoots(preview.expectedFileRoots)
  ];
  const verificationPassed = blockingIssues.length === 0;
  return {
    dumpId: preview.dumpId,
    driveFile,
    targetBackupPath,
    verificationPassed,
    importStatus: verificationPassed ? (preview.warnings.length > 0 ? "warning" : "success") : "error",
    tablesRestored,
    fileRootsRestored: currentFileRootSummaries(),
    warnings: preview.warnings,
    blockingIssues
  };
}

export function getRegisteredDumpTableKeys(): string[] {
  return [...DUMP_TABLE_KEYS];
}

export function getRegisteredDumpTables(): Array<{ key: string; tableName: string }> {
  return DUMP_TABLES.map((entry) => ({ key: entry.key, tableName: entry.tableName }));
}
