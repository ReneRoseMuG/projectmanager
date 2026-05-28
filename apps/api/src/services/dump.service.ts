import type {
  BackupProgressEvent,
  DumpBackupApplyResult,
  DumpBackupFile,
  DumpBackupPreviewResult,
  DumpBackupSaveResult,
  DumpBackupStatus,
  DumpFileRootSummary,
  DumpRemoteBackupFile,
  DumpRemoteBackupStatus,
  DumpRemoteUploadResult,
  DumpTableSummary,
} from "@taskmanager/shared-types";
import * as archiverPackage from "archiver";
import type { Archiver } from "archiver";
import type Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import unzipper from "unzipper";
import { config } from "../config.js";
import {
  assertSafeTestDatabasePath,
  assertSafeTestDirectoryPath,
} from "../runtime-safety.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import {
  downloadBackupSftpFile,
  getBackupSftpReadiness,
  listBackupSftpFiles,
  uploadBackupSftpFile,
} from "./backup-sftp.service.js";
import { getContentBaseDir } from "./content.service.js";

const APP_ID = "taskmanager";
const DUMP_FORMAT_VERSION = 14;
const SUPPORTED_DUMP_FORMAT_VERSIONS = [8, 9, 10, 11, 12, 13, DUMP_FORMAT_VERSION] as const;
const DUMP_FILENAME_PREFIX = "taskmanager_dump_";
const REMOTE_IMPORT_HISTORY_SETTING_KEY = "remote_dump_import_history";
const ZipArchive = (
  archiverPackage as unknown as {
    ZipArchive: new (options: { zlib: { level: number } }) => Archiver;
  }
).ZipArchive;

function createArchive(): Archiver {
  return new ZipArchive({ zlib: { level: 1 } });
}

const DUMP_TABLES = [
  { key: "appSettings", tableName: "app_settings" },
  { key: "roles", tableName: "roles" },
  { key: "permissions", tableName: "permissions" },
  { key: "users", tableName: "users" },
  { key: "pushSubscriptions", tableName: "push_subscriptions" },
  { key: "dayPlans", tableName: "day_plans" },
  { key: "journalEntries", tableName: "journal_entries" },
  { key: "journalEntryChanges", tableName: "journal_entry_changes" },
  { key: "journalEntryContexts", tableName: "journal_entry_contexts" },
  { key: "settingsValues", tableName: "settings_values" },
  { key: "dashboards", tableName: "dashboards" },
  { key: "dashboardWidgets", tableName: "dashboard_widgets" },
  { key: "dashboardDefaults", tableName: "dashboard_defaults" },
  { key: "catalogEntries", tableName: "catalog_entries" },
  { key: "projects", tableName: "projects" },
  { key: "milestones", tableName: "milestones" },
  { key: "tags", tableName: "tags" },
  { key: "notes", tableName: "notes" },
  { key: "features", tableName: "features" },
  { key: "tasks", tableName: "tasks" },
  { key: "tickets", tableName: "tickets" },
  { key: "useCases", tableName: "use_cases" },
  { key: "wikiPages", tableName: "wiki_pages" },
  { key: "comments", tableName: "comments" },
  { key: "attachments", tableName: "attachments" },
  { key: "contentImages", tableName: "content_images" },
  { key: "events", tableName: "events" },
  { key: "sentNotifications", tableName: "sent_notifications" },
  { key: "projectEvents", tableName: "project_events" },
  { key: "taskEvents", tableName: "task_events" },
  { key: "milestoneEvents", tableName: "milestone_events" },
  { key: "dayPlanEvents", tableName: "day_plan_events" },
  { key: "backlogItems", tableName: "backlog_items" },
  { key: "featureRelations", tableName: "feature_relations" },
  { key: "wikiPageRelations", tableName: "wiki_page_relations" },
  { key: "projectTags", tableName: "project_tags" },
  { key: "taskTags", tableName: "task_tags" },
  { key: "ticketTags", tableName: "ticket_tags" },
  { key: "milestoneTags", tableName: "milestone_tags" },
  { key: "projectNotes", tableName: "project_notes" },
  { key: "taskNotes", tableName: "task_notes" },
  { key: "ticketNotes", tableName: "ticket_notes" },
  { key: "milestoneNotes", tableName: "milestone_notes" },
  { key: "dayPlanNotes", tableName: "day_plan_notes" },
  { key: "projectFeatures", tableName: "project_features" },
  { key: "milestoneFeatures", tableName: "milestone_features" },
  { key: "projectTasks", tableName: "project_tasks" },
  { key: "milestoneTasks", tableName: "milestone_tasks" },
  { key: "dayPlanTasks", tableName: "day_plan_tasks" },
  { key: "featureTasks", tableName: "feature_tasks" },
  { key: "useCaseTasks", tableName: "use_case_tasks" },
  { key: "wikiPageTasks", tableName: "wiki_page_tasks" },
  { key: "projectTickets", tableName: "project_tickets" },
  { key: "milestoneTickets", tableName: "milestone_tickets" },
  { key: "taskTickets", tableName: "task_tickets" },
  { key: "featureTickets", tableName: "feature_tickets" },
  { key: "useCaseTickets", tableName: "use_case_tickets" },
  { key: "wikiPageTickets", tableName: "wiki_page_tickets" },
  { key: "ticketRelations", tableName: "ticket_relations" },
  { key: "projectComments", tableName: "project_comments" },
  { key: "milestoneComments", tableName: "milestone_comments" },
  { key: "taskComments", tableName: "task_comments" },
  { key: "featureComments", tableName: "feature_comments" },
  { key: "useCaseComments", tableName: "use_case_comments" },
  { key: "backlogItemComments", tableName: "backlog_item_comments" },
  { key: "wikiPageComments", tableName: "wiki_page_comments" },
  { key: "ticketComments", tableName: "ticket_comments" },
  { key: "dayPlanComments", tableName: "day_plan_comments" },
  { key: "projectAttachments", tableName: "project_attachments" },
  { key: "milestoneAttachments", tableName: "milestone_attachments" },
  { key: "taskAttachments", tableName: "task_attachments" },
  { key: "featureAttachments", tableName: "feature_attachments" },
  { key: "ticketAttachments", tableName: "ticket_attachments" },
  { key: "wikiPageAttachments", tableName: "wiki_page_attachments" },
] as const;

export const DUMP_TABLE_KEYS = DUMP_TABLES.map((entry) => entry.key);

type DumpTableKey = (typeof DUMP_TABLE_KEYS)[number];
type DumpTableRows = Record<DumpTableKey, Array<Record<string, unknown>>>;

interface DumpPayload {
  appId: typeof APP_ID;
  formatVersion: number;
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

interface DumpFileSourceEntry {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
}

interface DumpFileRootManifest extends DumpFileRootSummary {
  files: DumpFileEntry[];
  partial?: boolean;
}

interface DumpManifest {
  appId: typeof APP_ID;
  formatVersion: number;
  dumpId: string;
  exportedAt: string;
  schemaRevision: string;
  tables: Record<DumpTableKey, DumpTableSummary>;
  fileRoots: Record<"uploads" | "content", DumpFileRootManifest>;
}

interface DumpSnapshot {
  dumpId: string;
  filename: string;
  payload: DumpPayload;
  manifest: DumpManifest;
}

interface BuildDumpSnapshotOptions {
  deferFileRoots?: boolean;
}

interface ArchiveProgressState {
  currentBytes: number;
  totalBytes: number;
  progressCallback?: BackupProgressCallback;
}

interface InspectedDump extends DumpBackupPreviewResult {
  payload: DumpPayload;
  directory: unzipper.CentralDirectory;
  zipFileBuffers: ZipFileBufferCache;
  manifest: DumpManifest | null;
}

type ZipFileBufferCache = Map<string, Buffer>;

interface StagedFileRoots {
  uploads: string;
  content: string;
}

interface FileRootSwap {
  key: "uploads" | "content";
  targetDir: string;
  previousDir: string;
  stagedDir: string;
  targetExisted: boolean;
  swapped: boolean;
}

interface LegacyStandardAdminFallback {
  id: number;
  row: Record<string, unknown>;
}

interface ForeignKeyViolation {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

interface ForeignKeyDefinition {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
}

interface MissingUserReference {
  table: string;
  rowid: number;
  column: string;
  userId: number;
}

interface RestoreTablesResult {
  restored: number;
  refreshedTableKeys: Set<DumpTableKey>;
}

interface ApplyDumpOptions {
  afterFileSwap?: () => void;
  afterTablesRestore?: (
    sqlite: Database.Database,
    preview: InspectedDump,
  ) => void;
  progressCallback?: BackupProgressCallback;
}

interface DumpProgressOptions {
  progressCallback?: BackupProgressCallback;
}

type BackupProgressCallback = (event: BackupProgressEvent) => void;

interface RemoteDumpImportHistoryEntry {
  fileId: string;
  fileHash: string;
  dumpId: string;
  importedAt: string;
}

const activeRemoteImports = new Set<string>();
const remotePreviewSessionTtlMs = 10 * 60 * 1000;

interface RemotePreviewSession {
  fileId: string;
  fileHash: string;
  preview: InspectedDump;
  expiresAt: number;
}

const remotePreviewSessions = new Map<string, RemotePreviewSession>();

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

function localBackupManifestPath(): string {
  const dataDir = path.dirname(config.databasePath);
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "last-backup-manifest.json");
}

function readLastLocalBackupManifest(): DumpManifest | null {
  try {
    return parseManifest(JSON.parse(fs.readFileSync(localBackupManifestPath(), "utf8")) as unknown);
  } catch {
    return null;
  }
}

function writeLastLocalBackupManifest(manifest: DumpManifest): void {
  const manifestPath = localBackupManifestPath();
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function isDumpBackupFilename(filename: string): boolean {
  return filename.startsWith(DUMP_FILENAME_PREFIX) && filename.endsWith(".zip");
}

function validateBackupFileId(fileId: string): string {
  const normalized = fileId.trim();
  if (
    !isDumpBackupFilename(normalized) ||
    normalized !== path.basename(normalized) ||
    normalized.includes("/") ||
    normalized.includes("\\")
  ) {
    throw badRequest("Backup file id is invalid");
  }
  return normalized;
}

function mapBackupFile(filePath: string): DumpBackupFile {
  const stats = fs.statSync(filePath);
  return {
    id: path.basename(filePath),
    name: path.basename(filePath),
    path: filePath,
    createdTime: stats.birthtime.toISOString(),
    modifiedTime: stats.mtime.toISOString(),
    sizeBytes: stats.size,
  };
}

function listLocalBackupFiles(): DumpBackupFile[] {
  const workDir = ensureWorkDir();
  return fs
    .readdirSync(workDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isDumpBackupFilename(entry.name))
    .map((entry) => mapBackupFile(path.join(workDir, entry.name)))
    .sort((a, b) => {
      const timeCompare =
        Date.parse(b.modifiedTime ?? b.createdTime) -
        Date.parse(a.modifiedTime ?? a.createdTime);
      return timeCompare !== 0
        ? timeCompare
        : b.name.localeCompare(a.name, "en");
    });
}

function readLocalBackupFile(fileId: string): {
  backupFile: DumpBackupFile;
  buffer: Buffer;
} {
  const safeFileId = validateBackupFileId(fileId);
  const workDir = ensureWorkDir();
  const filePath = path.resolve(workDir, safeFileId);
  const workRoot = workDir.endsWith(path.sep)
    ? workDir
    : `${workDir}${path.sep}`;
  if (!filePath.startsWith(workRoot)) {
    throw badRequest("Backup file id is invalid");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw notFound("Backup file was not found");
  }
  return {
    backupFile: mapBackupFile(filePath),
    buffer: fs.readFileSync(filePath),
  };
}

function mapRemoteBackupFile(
  file: { name: string; path: string; sizeBytes: number; modifiedTime: string },
  importedByFileId: Map<string, RemoteDumpImportHistoryEntry>,
): DumpRemoteBackupFile {
  const imported = importedByFileId.get(file.name) ?? null;
  return {
    id: file.name,
    name: file.name,
    path: file.path,
    createdTime: file.modifiedTime,
    modifiedTime: file.modifiedTime,
    sizeBytes: file.sizeBytes,
    imported: imported !== null,
    importedAt: imported?.importedAt ?? null,
  };
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

function emitBackupProgress(
  callback: BackupProgressCallback | undefined,
  event: Omit<BackupProgressEvent, "type">,
): void {
  if (!callback) {
    return;
  }
  try {
    callback({ type: "backup_progress", ...event });
  } catch {
    // Progress events are advisory and must never abort a backup or import.
  }
}

function createProgressReadStream(
  filePath: string,
  totalBytes: number,
  onProgress: (current: number) => void,
): NodeJS.ReadableStream {
  let transferred = 0;
  const counter = new Transform({
    transform(
      chunk: Buffer,
      _encoding: BufferEncoding,
      callback: (error?: Error | null, data?: Buffer) => void,
    ) {
      transferred += chunk.byteLength;
      onProgress(transferred);
      callback(null, chunk);
    },
  });
  return fs.createReadStream(filePath).pipe(counter);
}

function getSchemaRevision(): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "src",
      "db",
      "migrations",
      "meta",
      "_journal.json",
    ),
    path.resolve(
      process.cwd(),
      "apps",
      "api",
      "src",
      "db",
      "migrations",
      "meta",
      "_journal.json",
    ),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as {
        entries?: Array<{ idx?: number; tag?: string }>;
      };
      const lastEntry = Array.isArray(parsed.entries)
        ? [...parsed.entries]
            .sort((a, b) => Number(a.idx ?? 0) - Number(b.idx ?? 0))
            .at(-1)
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

function isSupportedDumpFormatVersion(
  value: unknown,
): value is (typeof SUPPORTED_DUMP_FORMAT_VERSIONS)[number] {
  return SUPPORTED_DUMP_FORMAT_VERSIONS.includes(
    value as (typeof SUPPORTED_DUMP_FORMAT_VERSIONS)[number],
  );
}

function standardAdminEmail(): string {
  return config.adminEmail.toLowerCase();
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numericValue(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

function isSerializedBlob(value: unknown): value is { __blobBase64: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as { __blobBase64?: unknown }).__blobBase64 === "string",
  );
}

function isBlobColumn(tableName: string, column: string): boolean {
  return tableName === "content_images" && column === "data";
}

function serializeTableRow(
  tableName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...row };
  for (const [column, value] of Object.entries(result)) {
    if (isBlobColumn(tableName, column) && Buffer.isBuffer(value)) {
      result[column] = { __blobBase64: value.toString("base64") };
    }
  }
  return result;
}

function deserializeTableRow(
  tableName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...row };
  for (const [column, value] of Object.entries(result)) {
    if (!isBlobColumn(tableName, column)) {
      continue;
    }
    if (Buffer.isBuffer(value) || value === null || value === undefined) {
      continue;
    }
    if (!isSerializedBlob(value)) {
      throw badRequest(`Dump table '${tableName}' column '${column}' has an invalid blob value`);
    }
    result[column] = Buffer.from(value.__blobBase64, "base64");
  }
  return result;
}

function selectTableRows(
  sqlite: Database.Database,
  tableName: string,
): Array<Record<string, unknown>> {
  return sqlite
    .prepare(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY rowid`)
    .all()
    .map((row) => serializeTableRow(tableName, row as Record<string, unknown>));
}

function buildRoleCodeById(
  rows: Array<Record<string, unknown>>,
): Map<number, string> {
  const result = new Map<number, string>();
  for (const row of rows) {
    const id = numericValue(row.id);
    const key = stringValue(row.key);
    if (id !== null && key) {
      result.set(id, key);
    }
  }
  return result;
}

function normalizeUserRows(
  rows: Array<Record<string, unknown>>,
  roleCodeById: Map<number, string>,
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const result = { ...row };
    const roleCode = stringValue(result.roleCode);
    if (!roleCode) {
      const roleId = numericValue(result.role_id);
      if (roleId === null) {
        throw badRequest("Dump user is missing a role reference");
      }
      const mappedRoleCode = roleCodeById.get(roleId);
      if (!mappedRoleCode) {
        throw badRequest("Dump user references an unknown role");
      }
      result.roleCode = mappedRoleCode;
    }
    delete result.role_id;
    return result;
  });
}

function normalizeDumpTables(tables: DumpTableRows): DumpTableRows {
  const result = {} as DumpTableRows;
  const roleCodeById = buildRoleCodeById(tables.roles);

  for (const entry of DUMP_TABLES) {
    if (entry.key === "users") {
      result.users = normalizeUserRows(tables.users, roleCodeById);
      continue;
    }
    result[entry.key] = (tables[entry.key] ?? []).map((row) => ({ ...row }));
  }

  return result;
}

function normalizeDumpPayload(payload: DumpPayload): DumpPayload {
  return {
    ...payload,
    formatVersion: DUMP_FORMAT_VERSION,
    tables: normalizeDumpTables(payload.tables),
  };
}

function collectDumpTableRows(sqlite: Database.Database): DumpTableRows {
  const result = {} as DumpTableRows;
  for (const entry of DUMP_TABLES) {
    result[entry.key] = selectTableRows(sqlite, entry.tableName);
  }
  return normalizeDumpTables(result);
}

function buildTableManifest(
  rows: DumpTableRows,
): Record<DumpTableKey, DumpTableSummary> {
  const result = {} as Record<DumpTableKey, DumpTableSummary>;
  for (const entry of DUMP_TABLES) {
    const tableRows = rows[entry.key];
    result[entry.key] = {
      key: entry.key,
      rowCount: tableRows.length,
      sha256: sha256Json(tableRows),
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

      const relativePath = path
        .relative(rootDir, targetPath)
        .replace(/\\/g, "/");
      assertSafeRelativePath(relativePath);
      const buffer = fs.readFileSync(targetPath);
      results.push({
        relativePath,
        sizeBytes: buffer.byteLength,
        sha256: sha256Buffer(buffer),
      });
    }
  };

  walk(rootDir);
  return results.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, "en"),
  );
}

function listFileSourcesRecursive(rootDir: string): DumpFileSourceEntry[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: DumpFileSourceEntry[] = [];
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

      const relativePath = path
        .relative(rootDir, targetPath)
        .replace(/\\/g, "/");
      assertSafeRelativePath(relativePath);
      results.push({
        relativePath,
        absolutePath: targetPath,
        sizeBytes: fs.statSync(targetPath).size,
      });
    }
  };

  walk(rootDir);
  return results.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, "en"),
  );
}

function buildFileRootManifestFromEntries(
  key: "uploads" | "content",
  files: DumpFileEntry[],
  partial = false,
): DumpFileRootManifest {
  return {
    key,
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    sha256: sha256Json(files),
    files,
    ...(partial ? { partial: true } : {}),
  };
}

function buildEmptyFileRootManifest(
  key: "uploads" | "content",
): DumpFileRootManifest {
  return buildFileRootManifestFromEntries(key, []);
}

function buildFileRootManifest(
  key: "uploads" | "content",
  rootDir: string,
): DumpFileRootManifest {
  const files = listFilesRecursive(rootDir);
  return buildFileRootManifestFromEntries(key, files);
}

function buildFileRootSummaries(manifest: DumpManifest): DumpFileRootSummary[] {
  return [
    {
      key: "uploads",
      fileCount: manifest.fileRoots.uploads.fileCount,
      totalBytes: manifest.fileRoots.uploads.totalBytes,
      sha256: manifest.fileRoots.uploads.sha256,
      ...(manifest.fileRoots.uploads.partial ? { partial: true } : {}),
    },
    {
      key: "content",
      fileCount: manifest.fileRoots.content.fileCount,
      totalBytes: manifest.fileRoots.content.totalBytes,
      sha256: manifest.fileRoots.content.sha256,
      ...(manifest.fileRoots.content.partial ? { partial: true } : {}),
    },
  ];
}

function buildDumpSnapshot(
  sqlite: Database.Database,
  options: BuildDumpSnapshotOptions = {},
): DumpSnapshot {
  assertSafeDumpRuntimeTargets();
  const exportedAt = nowIso();
  const dumpId = buildDumpId(exportedAt);
  const schemaRevision = getSchemaRevision();
  const tables = collectDumpTableRows(sqlite);
  const fileRoots = options.deferFileRoots
    ? {
        uploads: buildEmptyFileRootManifest("uploads"),
        content: buildEmptyFileRootManifest("content"),
      }
    : {
        uploads: buildFileRootManifest("uploads", config.uploadDir),
        content: buildEmptyFileRootManifest("content"),
      };
  const payload: DumpPayload = {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId,
    exportedAt,
    schemaRevision,
    tables,
  };
  const manifest: DumpManifest = {
    appId: APP_ID,
    formatVersion: DUMP_FORMAT_VERSION,
    dumpId,
    exportedAt,
    schemaRevision,
    tables: buildTableManifest(tables),
    fileRoots,
  };
  return {
    dumpId,
    filename: buildDumpFilename(dumpId),
    payload,
    manifest,
  };
}

function archiveToFile(archive: Archiver, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const output = fs.createWriteStream(targetPath);
    let settled = false;
    const fail = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      output.destroy();
      fs.rmSync(targetPath, { force: true });
      reject(error);
    };

    output.on("close", () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    output.on("error", fail);
    archive.on("error", fail);
    archive.pipe(output);
    try {
      void Promise.resolve(archive.finalize()).catch(fail);
    } catch (error) {
      fail(error);
    }
  });
}

function emitArchiveProgress(
  state: ArchiveProgressState | undefined,
  detail: string,
): void {
  if (!state) {
    return;
  }
  emitBackupProgress(state.progressCallback, {
    operation: "full_backup",
    phase: "archive",
    current: state.currentBytes,
    total: state.totalBytes,
    detail,
  });
}

function buildFileEntriesFromSources(
  sources: DumpFileSourceEntry[],
): DumpFileEntry[] {
  return sources.map((source) => {
    const buffer = fs.readFileSync(source.absolutePath);
    return {
      relativePath: source.relativePath,
      sizeBytes: buffer.byteLength,
      sha256: sha256Buffer(buffer),
    };
  });
}

function fileHashByRelativePath(
  manifest: DumpFileRootManifest | null | undefined,
): Map<string, string> {
  return new Map((manifest?.files ?? []).map((file) => [file.relativePath, file.sha256]));
}

function selectChangedFileSources(
  sources: DumpFileSourceEntry[],
  currentFiles: DumpFileEntry[],
  previousManifest: DumpFileRootManifest | null | undefined,
): DumpFileSourceEntry[] {
  const previousHashes = fileHashByRelativePath(previousManifest);
  const currentByPath = new Map(currentFiles.map((file) => [file.relativePath, file]));
  return sources.filter((source) => previousHashes.get(source.relativePath) !== currentByPath.get(source.relativePath)?.sha256);
}

function appendBufferedFileRoot(
  archive: Archiver,
  key: "uploads" | "content",
  sources: DumpFileSourceEntry[],
  progressState?: ArchiveProgressState,
): DumpFileEntry[] {
  const files: DumpFileEntry[] = [];
  for (const source of sources) {
    const buffer = fs.readFileSync(source.absolutePath);
    archive.append(buffer, { name: `${key}/${source.relativePath}` });
    files.push({
      relativePath: source.relativePath,
      sizeBytes: buffer.byteLength,
      sha256: sha256Buffer(buffer),
    });
    if (progressState) {
      progressState.currentBytes += buffer.byteLength;
      emitArchiveProgress(progressState, `${key}/${source.relativePath}`);
    }
  }
  return files;
}

function createArchiveFromSnapshot(
  snapshot: DumpSnapshot,
  progressCallback?: BackupProgressCallback,
): Archiver {
  const archive = createArchive();
  archive.append(`${JSON.stringify(snapshot.payload, null, 2)}\n`, {
    name: "data.json",
  });
  const uploadSources = listFileSourcesRecursive(config.uploadDir);
  const currentUploadFiles = buildFileEntriesFromSources(uploadSources);
  const previousManifest = readLastLocalBackupManifest();
  const uploadSourcesToArchive = selectChangedFileSources(
    uploadSources,
    currentUploadFiles,
    previousManifest?.fileRoots.uploads,
  );
  const totalBytes = uploadSourcesToArchive.reduce(
    (sum, entry) => sum + entry.sizeBytes,
    0,
  );
  const progressState = progressCallback
    ? { currentBytes: 0, totalBytes, progressCallback }
    : undefined;
  if (progressState) {
    emitArchiveProgress(progressState, snapshot.filename);
  }
  appendBufferedFileRoot(
    archive,
    "uploads",
    uploadSourcesToArchive,
    progressState,
  );
  snapshot.manifest.fileRoots = {
    uploads: buildFileRootManifestFromEntries(
      "uploads",
      currentUploadFiles,
      previousManifest !== null && uploadSourcesToArchive.length < uploadSources.length,
    ),
    content: buildEmptyFileRootManifest("content"),
  };
  archive.append(`${JSON.stringify(snapshot.manifest, null, 2)}\n`, {
    name: "manifest.json",
  });
  return archive;
}

async function writeDumpArchiveFile(
  snapshot: DumpSnapshot,
  targetPath: string,
  progressCallback?: BackupProgressCallback,
): Promise<{ filePath: string; sizeBytes: number }> {
  await archiveToFile(
    createArchiveFromSnapshot(snapshot, progressCallback),
    targetPath,
  );
  return {
    filePath: targetPath,
    sizeBytes: fs.statSync(targetPath).size,
  };
}

async function createDatabaseSnapshot(
  sqlite: Database.Database,
  targetPath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  await sqlite.backup(targetPath);
}

export async function buildDumpArchive(sqlite: Database.Database): Promise<{
  buffer: Buffer;
  dumpId: string;
  filename: string;
  manifest: DumpManifest;
}> {
  const snapshot = buildDumpSnapshot(sqlite, { deferFileRoots: true });
  const tempDir = makeTempDir("taskmanager-dump-archive-");
  const filePath = path.join(tempDir, snapshot.filename);
  try {
    await writeDumpArchiveFile(snapshot, filePath);
    return {
      buffer: fs.readFileSync(filePath),
      dumpId: snapshot.dumpId,
      filename: snapshot.filename,
      manifest: snapshot.manifest,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
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
  if (!isSupportedDumpFormatVersion(candidate.formatVersion)) {
    throw badRequest("Unsupported dump format version");
  }
  if (
    typeof candidate.dumpId !== "string" ||
    typeof candidate.exportedAt !== "string" ||
    typeof candidate.schemaRevision !== "string"
  ) {
    throw badRequest("Dump metadata is incomplete");
  }

  const rawTables = parseObject(candidate.tables, "data.json tables");
  const unknownKeys = Object.keys(rawTables).filter(
    (key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey),
  );
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
    formatVersion: Number(candidate.formatVersion),
    dumpId: candidate.dumpId,
    exportedAt: candidate.exportedAt,
    schemaRevision: candidate.schemaRevision,
    tables,
  };
}

function parseFileRootManifest(
  raw: unknown,
  key: "uploads" | "content",
): DumpFileRootManifest {
  const candidate = parseObject(raw, `manifest ${key}`);
  const fileCount = Number(candidate.fileCount);
  const totalBytes = Number(candidate.totalBytes);
  const sha256 = candidate.sha256;
  if (
    !Number.isInteger(fileCount) ||
    fileCount < 0 ||
    !Number.isInteger(totalBytes) ||
    totalBytes < 0 ||
    typeof sha256 !== "string"
  ) {
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
    if (
      typeof relativePath !== "string" ||
      !Number.isInteger(sizeBytes) ||
      sizeBytes < 0 ||
      typeof fileHash !== "string"
    ) {
      throw badRequest(`manifest ${key} file entry is invalid`);
    }
    assertSafeRelativePath(relativePath);
    return {
      relativePath,
      sizeBytes,
      sha256: fileHash,
    };
  });

  return {
    key,
    fileCount,
    totalBytes,
    sha256,
    files,
    ...(candidate.partial === true ? { partial: true } : {}),
  };
}

function parseManifest(raw: unknown): DumpManifest {
  const candidate = parseObject(raw, "manifest.json");
  if (candidate.appId !== APP_ID) {
    throw badRequest("manifest.json belongs to another application");
  }
  if (!isSupportedDumpFormatVersion(candidate.formatVersion)) {
    throw badRequest("manifest.json has an unsupported format version");
  }
  if (
    typeof candidate.dumpId !== "string" ||
    typeof candidate.exportedAt !== "string" ||
    typeof candidate.schemaRevision !== "string"
  ) {
    throw badRequest("manifest.json metadata is incomplete");
  }

  const tableValues = parseObject(candidate.tables, "manifest tables");
  const tables = {} as Record<DumpTableKey, DumpTableSummary>;
  for (const key of DUMP_TABLE_KEYS) {
    const table = parseObject(tableValues[key], `manifest table '${key}'`);
    const rowCount = Number(table.rowCount);
    const tableHash = table.sha256;
    if (
      !Number.isInteger(rowCount) ||
      rowCount < 0 ||
      typeof tableHash !== "string"
    ) {
      throw badRequest(`manifest table '${key}' is invalid`);
    }
    tables[key] = {
      key,
      rowCount,
      sha256: tableHash,
    };
  }

  const fileRoots = parseObject(candidate.fileRoots, "manifest fileRoots");
  return {
    appId: APP_ID,
    formatVersion: Number(candidate.formatVersion),
    dumpId: candidate.dumpId,
    exportedAt: candidate.exportedAt,
    schemaRevision: candidate.schemaRevision,
    tables,
    fileRoots: {
      uploads: parseFileRootManifest(fileRoots.uploads, "uploads"),
      content: parseFileRootManifest(fileRoots.content, "content"),
    },
  };
}

async function parseJsonFile(
  directory: unzipper.CentralDirectory,
  filename: string,
): Promise<unknown | null> {
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

async function collectZipFiles(
  directory: unzipper.CentralDirectory,
  archiveRoot: "uploads" | "content",
  zipFileBuffers: ZipFileBufferCache,
): Promise<DumpFileRootManifest> {
  const files: DumpFileEntry[] = [];
  const prefix = `${archiveRoot}/`;
  for (const file of directory.files.filter(
    (entry) => entry.path.startsWith(prefix) && !entry.path.endsWith("/"),
  )) {
    const relativePath = file.path.slice(prefix.length);
    assertSafeRelativePath(relativePath);
    const buffer = await file.buffer();
    zipFileBuffers.set(file.path, buffer);
    files.push({
      relativePath,
      sizeBytes: buffer.byteLength,
      sha256: sha256Buffer(buffer),
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "en"));
  return {
    key: archiveRoot,
    fileCount: files.length,
    totalBytes: files.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    sha256: sha256Json(files),
    files,
  };
}

function fileEntryKey(file: DumpFileEntry): string {
  return `${file.relativePath}:${file.sizeBytes}:${file.sha256}`;
}

function validateZipFilesAgainstManifest(
  root: "uploads" | "content",
  manifestRoot: DumpFileRootManifest,
  actualRoot: DumpFileRootManifest,
): string[] {
  const issues: string[] = [];
  const expectedByPath = new Map(manifestRoot.files.map((file) => [file.relativePath, file]));
  for (const actual of actualRoot.files) {
    const expected = expectedByPath.get(actual.relativePath);
    if (!expected) {
      issues.push(`ZIP file '${root}/${actual.relativePath}' is not listed in the manifest.`);
      continue;
    }
    if (fileEntryKey(actual) !== fileEntryKey(expected)) {
      issues.push(`ZIP file '${root}/${actual.relativePath}' does not match the manifest.`);
    }
  }

  if (!manifestRoot.partial) {
    for (const expected of manifestRoot.files) {
      if (!actualRoot.files.some((actual) => actual.relativePath === expected.relativePath)) {
        issues.push(`Manifest file '${root}/${expected.relativePath}' is missing in the ZIP.`);
      }
    }
  }
  return issues;
}

function localRootDir(root: "uploads" | "content"): string {
  return root === "uploads" ? config.uploadDir : getContentBaseDir();
}

function safeLocalFilePath(root: "uploads" | "content", relativePath: string): string {
  assertSafeRelativePath(relativePath);
  const rootDir = path.resolve(localRootDir(root));
  const targetPath = path.resolve(rootDir, relativePath);
  const safeRoot = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  if (!targetPath.startsWith(safeRoot)) {
    throw badRequest("Dump contains an unsafe file path");
  }
  return targetPath;
}

function verifyLocalBaseFile(root: "uploads" | "content", file: DumpFileEntry): string | null {
  const targetPath = safeLocalFilePath(root, file.relativePath);
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    return `Partial dump requires local base file '${root}/${file.relativePath}', but it is missing.`;
  }
  const buffer = fs.readFileSync(targetPath);
  if (buffer.byteLength !== file.sizeBytes || sha256Buffer(buffer) !== file.sha256) {
    return `Partial dump requires local base file '${root}/${file.relativePath}', but its hash does not match.`;
  }
  return null;
}

function validatePartialLocalBase(
  root: "uploads" | "content",
  manifestRoot: DumpFileRootManifest,
  actualRoot: DumpFileRootManifest,
): string[] {
  if (!manifestRoot.partial) {
    return [];
  }
  const zipPaths = new Set(actualRoot.files.map((file) => file.relativePath));
  return manifestRoot.files.flatMap((file) => {
    if (zipPaths.has(file.relativePath)) {
      return [];
    }
    const issue = verifyLocalBaseFile(root, file);
    return issue ? [issue] : [];
  });
}

function buildConfirmationPhrase(
  dumpId: string,
  targetDatabasePath: string,
): string {
  return `AKTUALISIERE TASKMANAGER ${dumpId} NACH ${path.basename(targetDatabasePath)}`;
}

export async function inspectDumpArchive(
  buffer: Buffer,
  backupFile: DumpBackupFile,
): Promise<InspectedDump> {
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
  const rawDumpPayload = parsePayload(rawPayload);
  const payload = normalizeDumpPayload(rawDumpPayload);
  const rawManifest = await parseJsonFile(directory, "manifest.json");
  const manifest = rawManifest ? parseManifest(rawManifest) : null;

  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const payloadTableKeys = new Set(
    Object.keys(
      parseObject(
        (rawPayload as Record<string, unknown>).tables,
        "data.json tables",
      ),
    ),
  );
  const unknownTableKeys = [...payloadTableKeys].filter(
    (key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey),
  );
  for (const key of unknownTableKeys) {
    warnings.push(`Unknown dump table '${key}' was ignored.`);
  }

  const zipFileBuffers: ZipFileBufferCache = new Map();
  const actualUploads = await collectZipFiles(
    directory,
    "uploads",
    zipFileBuffers,
  );
  const actualContent = await collectZipFiles(
    directory,
    "content",
    zipFileBuffers,
  );
  const expectedTables = Object.values(buildTableManifest(payload.tables));
  const expectedFileRoots = manifest
    ? buildFileRootSummaries(manifest)
    : [
        {
          key: "uploads" as const,
          fileCount: actualUploads.fileCount,
          totalBytes: actualUploads.totalBytes,
          sha256: actualUploads.sha256,
        },
        {
          key: "content" as const,
          fileCount: actualContent.fileCount,
          totalBytes: actualContent.totalBytes,
          sha256: actualContent.sha256,
        },
      ];

  if (!manifest) {
    blockingIssues.push("Dump ZIP does not contain manifest.json.");
  } else {
    if (manifest.dumpId !== payload.dumpId) {
      blockingIssues.push("manifest.json dumpId does not match data.json.");
    }
    if (manifest.formatVersion !== rawDumpPayload.formatVersion) {
      blockingIssues.push(
        "manifest.json formatVersion does not match data.json.",
      );
    }
    if (manifest.schemaRevision !== getSchemaRevision()) {
      blockingIssues.push(
        `Schema revision differs: dump=${manifest.schemaRevision}, target=${getSchemaRevision()}.`,
      );
    }
    for (const key of DUMP_TABLE_KEYS) {
      const actualRows = rawDumpPayload.tables[key];
      const expected = manifest.tables[key];
      if (actualRows.length !== expected.rowCount) {
        blockingIssues.push(
          `Manifest row count does not match table '${key}'.`,
        );
      }
      if (sha256Json(actualRows) !== expected.sha256) {
        blockingIssues.push(`Manifest hash does not match table '${key}'.`);
      }
    }
    blockingIssues.push(
      ...validateZipFilesAgainstManifest("uploads", manifest.fileRoots.uploads, actualUploads),
      ...validateZipFilesAgainstManifest("content", manifest.fileRoots.content, actualContent),
      ...validatePartialLocalBase("uploads", manifest.fileRoots.uploads, actualUploads),
      ...validatePartialLocalBase("content", manifest.fileRoots.content, actualContent),
    );
  }

  const roleCodes = new Set(
    payload.tables.roles
      .map((row) => stringValue(row.key))
      .filter((key): key is string => Boolean(key)),
  );
  for (const row of payload.tables.users) {
    const roleCode = stringValue(row.roleCode);
    if (!roleCode || !roleCodes.has(roleCode)) {
      blockingIssues.push(
        `Dump user '${stringValue(row.email) ?? "unknown"}' references an unknown role.`,
      );
    }
  }

  const knownZipRoots = new Set([
    "data.json",
    "manifest.json",
    "uploads",
    "content",
  ]);
  for (const file of directory.files) {
    const root = file.path.split("/")[0] ?? "";
    if (!knownZipRoots.has(root)) {
      warnings.push(`Unknown ZIP entry '${file.path}' was ignored.`);
    }
  }

  return {
    payload,
    directory,
    zipFileBuffers,
    manifest,
    fileHash: sha256Buffer(buffer),
    dumpId: payload.dumpId,
    backupFile,
    targetDatabasePath: config.databasePath,
    transferReadiness:
      blockingIssues.length > 0
        ? "blocked"
        : warnings.length > 0
          ? "warning"
          : "ready",
    blockingIssues,
    warnings,
    confirmationPhrase: buildConfirmationPhrase(
      payload.dumpId,
      config.databasePath,
    ),
    manifestPresent: manifest !== null,
    schemaRevision: manifest?.schemaRevision ?? null,
    expectedTables,
    expectedFileRoots,
  };
}

async function stageZipRootWithoutManifest(
  archiveRoot: "uploads" | "content",
  zipFileBuffers: ZipFileBufferCache,
): Promise<string> {
  const stageDir = makeTempDir(`taskmanager-dump-${archiveRoot}-`);
  const prefix = `${archiveRoot}/`;
  try {
    for (const [zipPath, buffer] of zipFileBuffers.entries()) {
      if (!zipPath.startsWith(prefix)) {
        continue;
      }
      const relativePath = zipPath.slice(prefix.length);
      assertSafeRelativePath(relativePath);
      const targetPath = path.resolve(stageDir, relativePath);
      const stageRoot = stageDir.endsWith(path.sep)
        ? stageDir
        : `${stageDir}${path.sep}`;
      if (!targetPath.startsWith(stageRoot)) {
        throw badRequest("Dump contains an unsafe file path");
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
    }
    return stageDir;
  } catch (error) {
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
}

async function stageFileRootFromManifest(
  archiveRoot: "uploads" | "content",
  zipFileBuffers: ZipFileBufferCache,
  manifestRoot: DumpFileRootManifest,
): Promise<string> {
  const stageDir = makeTempDir(`taskmanager-dump-${archiveRoot}-`);
  const prefix = `${archiveRoot}/`;
  try {
    for (const file of manifestRoot.files) {
      const zipPath = `${prefix}${file.relativePath}`;
      let buffer = zipFileBuffers.get(zipPath);
      if (buffer) {
        if (buffer.byteLength !== file.sizeBytes || sha256Buffer(buffer) !== file.sha256) {
          throw badRequest(`Dump ZIP file '${zipPath}' does not match the manifest`);
        }
      } else {
        if (!manifestRoot.partial) {
          throw badRequest(`Dump ZIP file '${zipPath}' is missing`);
        }
        const issue = verifyLocalBaseFile(archiveRoot, file);
        if (issue) {
          throw badRequest(issue);
        }
        buffer = fs.readFileSync(safeLocalFilePath(archiveRoot, file.relativePath));
      }
      const targetPath = path.resolve(stageDir, file.relativePath);
      const stageRoot = stageDir.endsWith(path.sep)
        ? stageDir
        : `${stageDir}${path.sep}`;
      if (!targetPath.startsWith(stageRoot)) {
        throw badRequest("Dump contains an unsafe file path");
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, buffer);
    }
    return stageDir;
  } catch (error) {
    fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
}

async function stageFileRoots(
  zipFileBuffers: ZipFileBufferCache,
  manifest: DumpManifest | null,
): Promise<StagedFileRoots> {
  if (!manifest) {
    return {
      uploads: await stageZipRootWithoutManifest("uploads", zipFileBuffers),
      content: await stageZipRootWithoutManifest("content", zipFileBuffers),
    };
  }
  return {
    uploads: await stageFileRootFromManifest("uploads", zipFileBuffers, manifest.fileRoots.uploads),
    content: await stageFileRootFromManifest("content", zipFileBuffers, manifest.fileRoots.content),
  };
}

function moveDirectoryWithCopyFallback(sourceDir: string, targetDir: string): void {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  try {
    fs.renameSync(sourceDir, targetDir);
  } catch {
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
}

function replaceFileRoots(stagedRoots: StagedFileRoots, transferDir: string): FileRootSwap[] {
  const swaps: FileRootSwap[] = [
    {
      key: "uploads",
      targetDir: config.uploadDir,
      previousDir: path.join(transferDir, "previous-uploads"),
      stagedDir: stagedRoots.uploads,
      targetExisted: fs.existsSync(config.uploadDir),
      swapped: false,
    },
    {
      key: "content",
      targetDir: getContentBaseDir(),
      previousDir: path.join(transferDir, "previous-content"),
      stagedDir: stagedRoots.content,
      targetExisted: fs.existsSync(getContentBaseDir()),
      swapped: false,
    },
  ];

  try {
    for (const swap of swaps) {
      fs.rmSync(swap.previousDir, { recursive: true, force: true });
      if (swap.targetExisted) {
        moveDirectoryWithCopyFallback(swap.targetDir, swap.previousDir);
      }
      moveDirectoryWithCopyFallback(swap.stagedDir, swap.targetDir);
      swap.swapped = true;
    }
    return swaps;
  } catch (error) {
    restoreSwappedFileRoots(swaps);
    throw error;
  }
}

function restoreSwappedFileRoots(swaps: FileRootSwap[]): void {
  for (const swap of [...swaps].reverse()) {
    if (!swap.swapped && !fs.existsSync(swap.previousDir)) {
      continue;
    }
    fs.rmSync(swap.targetDir, { recursive: true, force: true });
    if (swap.targetExisted && fs.existsSync(swap.previousDir)) {
      moveDirectoryWithCopyFallback(swap.previousDir, swap.targetDir);
    }
  }
}

function selectSingleRow(
  sqlite: Database.Database,
  tableName: string,
  whereSql: string,
  params: unknown[],
): Record<string, unknown> | null {
  return (
    (sqlite
      .prepare(`SELECT * FROM ${quoteIdentifier(tableName)} WHERE ${whereSql}`)
      .get(...params) as Record<string, unknown> | undefined) ?? null
  );
}

function parseRemoteImportHistory(
  value: unknown,
): RemoteDumpImportHistoryEntry[] {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry) => {
      if (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { fileId?: unknown }).fileId === "string" &&
        typeof (entry as { fileHash?: unknown }).fileHash === "string" &&
        typeof (entry as { dumpId?: unknown }).dumpId === "string" &&
        typeof (entry as { importedAt?: unknown }).importedAt === "string"
      ) {
        const typedEntry = entry as RemoteDumpImportHistoryEntry;
        return [typedEntry];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function readRemoteImportHistory(
  sqlite: Database.Database,
): RemoteDumpImportHistoryEntry[] {
  const row = selectSingleRow(
    sqlite,
    "app_settings",
    `${quoteIdentifier("key")} = ?`,
    [REMOTE_IMPORT_HISTORY_SETTING_KEY],
  );
  return parseRemoteImportHistory(row?.value);
}

function remoteImportHistoryByFileId(
  sqlite: Database.Database,
): Map<string, RemoteDumpImportHistoryEntry> {
  return new Map(
    readRemoteImportHistory(sqlite).map((entry) => [entry.fileId, entry]),
  );
}

function writeRemoteImportHistory(
  sqlite: Database.Database,
  entries: RemoteDumpImportHistoryEntry[],
): void {
  sqlite
    .prepare(
      `DELETE FROM ${quoteIdentifier("app_settings")} WHERE ${quoteIdentifier("key")} = ?`,
    )
    .run(REMOTE_IMPORT_HISTORY_SETTING_KEY);
  insertRows(sqlite, "app_settings", [
    {
      key: REMOTE_IMPORT_HISTORY_SETTING_KEY,
      value: JSON.stringify(entries),
      updated_at: nowIso(),
    },
  ]);
}

function recordRemoteDumpImport(
  sqlite: Database.Database,
  entry: RemoteDumpImportHistoryEntry,
): void {
  const byFileId = remoteImportHistoryByFileId(sqlite);
  byFileId.set(entry.fileId, entry);
  writeRemoteImportHistory(
    sqlite,
    [...byFileId.values()].sort(
      (a, b) => Date.parse(b.importedAt) - Date.parse(a.importedAt),
    ),
  );
}

function assertRemoteDumpWasNotImported(
  sqlite: Database.Database,
  fileId: string,
): void {
  if (remoteImportHistoryByFileId(sqlite).has(fileId)) {
    throw conflict("Remote backup file was already imported");
  }
}

function payloadHasAdminUser(payload: DumpPayload): boolean {
  return payload.tables.users.some((row) => {
    const email = stringValue(row.email)?.toLowerCase();
    return email === standardAdminEmail() || stringValue(row.roleCode) === "admin";
  });
}

function selectLocalAdminFallback(
  sqlite: Database.Database,
): Record<string, unknown> | null {
  const configuredAdmin = selectSingleRow(sqlite, "users", "lower(email) = ?", [
    standardAdminEmail(),
  ]);
  if (configuredAdmin) {
    return configuredAdmin;
  }

  return (
    (sqlite
      .prepare(
        `SELECT ${quoteIdentifier("users")}.* FROM ${quoteIdentifier("users")} ` +
          `INNER JOIN ${quoteIdentifier("roles")} ON ${quoteIdentifier("users")}.${quoteIdentifier("role_id")} = ${quoteIdentifier("roles")}.${quoteIdentifier("id")} ` +
          `WHERE ${quoteIdentifier("roles")}.${quoteIdentifier("key")} = 'admin' ` +
          `ORDER BY ${quoteIdentifier("users")}.${quoteIdentifier("id")} LIMIT 1`,
      )
      .get() as Record<string, unknown> | undefined) ?? null
  );
}

function createLegacyStandardAdminFallback(
  sqlite: Database.Database,
  payload: DumpPayload,
): LegacyStandardAdminFallback | null {
  if (payloadHasAdminUser(payload)) {
    return null;
  }

  const admin = selectLocalAdminFallback(sqlite);
  const adminId = admin ? numericValue(admin.id) : null;
  if (!admin || adminId === null) {
    return null;
  }

  return { id: adminId, row: admin };
}

function tableColumns(sqlite: Database.Database, tableName: string): string[] {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

function insertRows(
  sqlite: Database.Database,
  tableName: string,
  rows: Array<Record<string, unknown>>,
): void {
  if (rows.length === 0) {
    return;
  }

  const columns = tableColumns(sqlite, tableName);
  const columnSql = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const statement = sqlite.prepare(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES (${placeholders})`,
  );
  for (const row of rows) {
    const nextRow = deserializeTableRow(tableName, row);
    statement.run(columns.map((column) => nextRow[column] ?? null));
  }
}

function roleIdsByCode(sqlite: Database.Database): Map<string, number> {
  const rows = sqlite
    .prepare(`SELECT id, key FROM ${quoteIdentifier("roles")}`)
    .all() as Array<{ id: number; key: string }>;
  return new Map(rows.map((row) => [row.key, row.id]));
}

function prepareUserRowsForRestore(
  sqlite: Database.Database,
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const roleIds = roleIdsByCode(sqlite);
  return rows.map((row) => {
    const result = { ...row };
    const roleCode = stringValue(result.roleCode);
    if (roleCode) {
      const roleId = roleIds.get(roleCode);
      if (!roleId) {
        throw badRequest(
          `Dump user '${stringValue(result.email) ?? "unknown"}' references an unknown role`,
        );
      }
      result.role_id = roleId;
      delete result.roleCode;
      return result;
    }
    return result;
  });
}

function userIdExists(sqlite: Database.Database, id: number): boolean {
  const row = sqlite
    .prepare(
      `SELECT 1 AS existsRow FROM ${quoteIdentifier("users")} WHERE id = ?`,
    )
    .get(id) as { existsRow: number } | undefined;
  return Boolean(row);
}

function adminRoleId(sqlite: Database.Database): number {
  const row = sqlite
    .prepare(
      `SELECT id FROM ${quoteIdentifier("roles")} WHERE ${quoteIdentifier("key")} = 'admin'`,
    )
    .get() as { id: number } | undefined;
  if (!row) {
    throw badRequest("Dump import requires an admin role");
  }
  return row.id;
}

function restoreLegacyStandardAdminFallback(
  sqlite: Database.Database,
  fallback: LegacyStandardAdminFallback | null,
): Set<DumpTableKey> {
  const refreshedTableKeys = new Set<DumpTableKey>();
  if (!fallback) {
    return refreshedTableKeys;
  }

  if (!userIdExists(sqlite, fallback.id)) {
    const row = { ...fallback.row };
    row.id = fallback.id;
    row.role_id = adminRoleId(sqlite);
    insertRows(sqlite, "users", [row]);
    refreshedTableKeys.add("users");
  }

  const errors = sqlite.pragma("foreign_key_check") as ForeignKeyViolation[];
  for (const reference of missingUserReferences(sqlite, errors)) {
    sqlite
      .prepare(
        `UPDATE ${quoteIdentifier(reference.table)} SET ${quoteIdentifier(reference.column)} = ? WHERE rowid = ?`,
      )
      .run(fallback.id, reference.rowid);
    const tableKey = DUMP_TABLES.find(
      (entry) => entry.tableName === reference.table,
    )?.key;
    if (tableKey) {
      refreshedTableKeys.add(tableKey);
    }
  }

  return refreshedTableKeys;
}

function refreshExpectedTableSummary(
  expectedTables: DumpTableSummary[],
  key: DumpTableKey,
  rows: Array<Record<string, unknown>>,
): void {
  const index = expectedTables.findIndex((entry) => entry.key === key);
  const nextSummary: DumpTableSummary = {
    key,
    rowCount: rows.length,
    sha256: sha256Json(rows),
  };
  if (index >= 0) {
    expectedTables[index] = nextSummary;
    return;
  }
  expectedTables.push(nextSummary);
}

function restoreTables(
  sqlite: Database.Database,
  payload: DumpPayload,
): RestoreTablesResult {
  const legacyStandardAdminFallback = createLegacyStandardAdminFallback(
    sqlite,
    payload,
  );
  for (const entry of [...DUMP_TABLES].reverse()) {
    sqlite.prepare(`DELETE FROM ${quoteIdentifier(entry.tableName)}`).run();
    sqlite
      .prepare("DELETE FROM sqlite_sequence WHERE name = ?")
      .run(entry.tableName);
  }

  let restored = 0;
  for (const entry of DUMP_TABLES) {
    const rows =
      entry.key === "users"
        ? prepareUserRowsForRestore(sqlite, payload.tables.users)
        : payload.tables[entry.key];
    insertRows(sqlite, entry.tableName, rows);
    if (rows.length > 0) {
      restored += 1;
    }
  }
  const refreshedTableKeys = restoreLegacyStandardAdminFallback(
    sqlite,
    legacyStandardAdminFallback,
  );
  return { restored, refreshedTableKeys };
}

function foreignKeyDefinitions(
  sqlite: Database.Database,
  tableName: string,
): ForeignKeyDefinition[] {
  return sqlite
    .prepare(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)})`)
    .all() as ForeignKeyDefinition[];
}

function missingUserReferences(
  sqlite: Database.Database,
  errors: ForeignKeyViolation[],
): MissingUserReference[] {
  return errors.flatMap((error) => {
    if (error.parent !== "users") {
      return [];
    }
    const definition = foreignKeyDefinitions(sqlite, error.table).find(
      (entry) => entry.id === error.fkid && entry.seq === 0,
    );
    if (!definition) {
      return [];
    }
    const row = sqlite
      .prepare(
        `SELECT ${quoteIdentifier(definition.from)} AS value FROM ${quoteIdentifier(error.table)} WHERE rowid = ?`,
      )
      .get(error.rowid) as { value: unknown } | undefined;
    const userId = numericValue(row?.value);
    if (userId === null) {
      return [];
    }
    return [
      {
        table: error.table,
        rowid: error.rowid,
        column: definition.from,
        userId,
      },
    ];
  });
}

function foreignKeyErrorMessage(
  sqlite: Database.Database,
  errors: ForeignKeyViolation[],
): string {
  const missingUsers = missingUserReferences(sqlite, errors);
  if (missingUsers.length === 0) {
    return `Dump import produced foreign key errors: ${JSON.stringify(errors)}`;
  }

  const details = missingUsers
    .map(
      (reference) =>
        `${reference.table}.${reference.column}=${reference.userId} (rowid ${reference.rowid})`,
    )
    .join(", ");
  return `Dump import is missing referenced users.id values: ${details}`;
}

function assertForeignKeys(sqlite: Database.Database): void {
  const errors = sqlite.pragma("foreign_key_check") as ForeignKeyViolation[];
  if (errors.length > 0) {
    throw badRequest(foreignKeyErrorMessage(sqlite, errors));
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
    buildFileRootManifest("content", getContentBaseDir()),
  ].map(({ key, fileCount, totalBytes, sha256 }) => ({
    key,
    fileCount,
    totalBytes,
    sha256,
  }));
}

function verifyRestoredTables(
  sqlite: Database.Database,
  expectedTables: DumpTableSummary[],
): string[] {
  const issues: string[] = [];
  const expectedByKey = new Map(
    expectedTables.map((entry) => [entry.key, entry]),
  );
  const restoredTables = collectDumpTableRows(sqlite);
  for (const entry of DUMP_TABLES) {
    const rows = restoredTables[entry.key];
    const expected = expectedByKey.get(entry.key);
    if (
      !expected ||
      expected.rowCount !== rows.length ||
      expected.sha256 !== sha256Json(rows)
    ) {
      issues.push(
        `Restored table '${entry.key}' does not match the dump manifest.`,
      );
    }
  }
  return issues;
}

function verifyRestoredFileRoots(
  expectedFileRoots: DumpFileRootSummary[],
): string[] {
  const issues: string[] = [];
  const actualByKey = new Map(
    currentFileRootSummaries().map((entry) => [entry.key, entry]),
  );
  for (const expected of expectedFileRoots) {
    const actual = actualByKey.get(expected.key);
    if (
      !actual ||
      actual.fileCount !== expected.fileCount ||
      actual.totalBytes !== expected.totalBytes ||
      actual.sha256 !== expected.sha256
    ) {
      issues.push(
        `Restored file root '${expected.key}' does not match the dump manifest.`,
      );
    }
  }
  return issues;
}

export function getLocalBackupStatus(): DumpBackupStatus {
  const files = listLocalBackupFiles();
  return {
    backupDirectory: config.backupWorkDir,
    ready: true,
    fileCount: files.length,
    latestFile: files[0] ?? null,
  };
}

function remoteUploadNotAttempted(error: string): DumpRemoteUploadResult {
  return {
    attempted: false,
    success: false,
    remoteFile: null,
    error,
  };
}

async function uploadDumpArchiveToRemote(
  sqlite: Database.Database,
  filename: string,
  filePath: string,
  sizeBytes: number,
  progressCallback?: BackupProgressCallback,
): Promise<DumpRemoteUploadResult> {
  const readiness = getBackupSftpReadiness();
  if (!readiness.ready) {
    return remoteUploadNotAttempted(readiness.blockingIssues.join(" | "));
  }

  try {
    emitBackupProgress(progressCallback, {
      operation: "full_backup",
      phase: "sftp_upload",
      current: 0,
      total: sizeBytes,
      detail: filename,
    });
    const stream = createProgressReadStream(filePath, sizeBytes, (current) => {
      emitBackupProgress(progressCallback, {
        operation: "full_backup",
        phase: "sftp_upload",
        current,
        total: sizeBytes,
        detail: filename,
      });
    });
    const uploadedFile = await uploadBackupSftpFile(
      filename,
      stream,
      sizeBytes,
    );
    emitBackupProgress(progressCallback, {
      operation: "full_backup",
      phase: "sftp_upload",
      current: sizeBytes,
      total: sizeBytes,
      detail: filename,
    });
    return {
      attempted: true,
      success: true,
      remoteFile: mapRemoteBackupFile(
        uploadedFile,
        remoteImportHistoryByFileId(sqlite),
      ),
      error: null,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      remoteFile: null,
      error: error instanceof Error ? error.message : "SFTP upload failed",
    };
  }
}

export async function saveDumpToLocalBackup(
  sqlite: Database.Database,
  options: DumpProgressOptions = {},
): Promise<DumpBackupSaveResult> {
  const snapshot = buildDumpSnapshot(sqlite, { deferFileRoots: true });
  emitBackupProgress(options.progressCallback, {
    operation: "full_backup",
    phase: "db_export",
    current: DUMP_TABLE_KEYS.length,
    total: DUMP_TABLE_KEYS.length,
    detail: snapshot.dumpId,
  });
  const workDir = ensureWorkDir();
  const filePath = path.join(workDir, snapshot.filename);
  const archive = await writeDumpArchiveFile(
    snapshot,
    filePath,
    options.progressCallback,
  );
  emitBackupProgress(options.progressCallback, {
    operation: "full_backup",
    phase: "archive",
    current: archive.sizeBytes,
    total: archive.sizeBytes,
    detail: snapshot.filename,
  });
  const backupFile = mapBackupFile(filePath);
  writeLastLocalBackupManifest(snapshot.manifest);
  emitBackupProgress(options.progressCallback, {
    operation: "full_backup",
    phase: "local_save",
    current: archive.sizeBytes,
    total: archive.sizeBytes,
    detail: snapshot.filename,
  });
  const remoteUpload = await uploadDumpArchiveToRemote(
    sqlite,
    snapshot.filename,
    filePath,
    archive.sizeBytes,
    options.progressCallback,
  );
  emitBackupProgress(options.progressCallback, {
    operation: "full_backup",
    phase: "done",
    current: 1,
    total: 1,
    detail: snapshot.filename,
  });
  return {
    dumpId: snapshot.dumpId,
    filename: snapshot.filename,
    filePath,
    sizeBytes: archive.sizeBytes,
    backupFile,
    remoteUpload,
  };
}

export async function getRemoteBackupStatus(
  sqlite: Database.Database,
): Promise<DumpRemoteBackupStatus> {
  const readiness = getBackupSftpReadiness();
  if (!readiness.ready) {
    return {
      remoteDirectory: readiness.remoteDirectory,
      configured: readiness.configured,
      protectedConfirmed: readiness.protectedConfirmed,
      ready: false,
      fileCount: 0,
      latestFile: null,
      files: [],
      blockingIssues: readiness.blockingIssues,
    };
  }

  try {
    const importedByFileId = remoteImportHistoryByFileId(sqlite);
    const files = (await listBackupSftpFiles()).map((file) =>
      mapRemoteBackupFile(file, importedByFileId),
    );
    return {
      remoteDirectory: readiness.remoteDirectory,
      configured: readiness.configured,
      protectedConfirmed: readiness.protectedConfirmed,
      ready: true,
      fileCount: files.length,
      latestFile: files[0] ?? null,
      files,
      blockingIssues: [],
    };
  } catch (error) {
    return {
      remoteDirectory: readiness.remoteDirectory,
      configured: readiness.configured,
      protectedConfirmed: readiness.protectedConfirmed,
      ready: false,
      fileCount: 0,
      latestFile: null,
      files: [],
      blockingIssues: [
        error instanceof Error ? error.message : "SFTP remote status failed",
      ],
    };
  }
}

async function readRemoteBackupFile(
  sqlite: Database.Database,
  fileId?: string | null,
): Promise<{ backupFile: DumpRemoteBackupFile; buffer: Buffer }> {
  const safeFileId = fileId ? validateBackupFileId(fileId) : null;
  const remoteFiles = await listBackupSftpFiles();
  const selectedFile = safeFileId
    ? remoteFiles.find((file) => file.name === safeFileId)
    : remoteFiles[0];
  if (!selectedFile) {
    throw notFound(
      safeFileId
        ? "Remote backup file was not found"
        : "No remote backup dump file was found",
    );
  }

  return {
    backupFile: mapRemoteBackupFile(
      selectedFile,
      remoteImportHistoryByFileId(sqlite),
    ),
    buffer: await downloadBackupSftpFile(selectedFile.name),
  };
}

function disposeInspectedDump(preview: InspectedDump): void {
  preview.zipFileBuffers.clear();
}

function cleanupExpiredRemotePreviewSessions(now = Date.now()): void {
  for (const [token, session] of remotePreviewSessions.entries()) {
    if (session.expiresAt <= now) {
      disposeInspectedDump(session.preview);
      remotePreviewSessions.delete(token);
    }
  }
}

function registerRemotePreviewSession(fileId: string, preview: InspectedDump): string {
  cleanupExpiredRemotePreviewSessions();
  const token = crypto.randomUUID();
  remotePreviewSessions.set(token, {
    fileId,
    fileHash: preview.fileHash,
    preview,
    expiresAt: Date.now() + remotePreviewSessionTtlMs,
  });
  return token;
}

function takeRemotePreviewSession(
  token: string,
  fileId: string,
  fileHash: string,
): InspectedDump {
  cleanupExpiredRemotePreviewSessions();
  const session = remotePreviewSessions.get(token);
  if (!session) {
    throw conflict("Remote backup preview expired; preview the backup again");
  }
  remotePreviewSessions.delete(token);
  if (session.fileId !== fileId || session.fileHash !== fileHash) {
    disposeInspectedDump(session.preview);
    throw conflict("Remote backup preview does not match the requested file");
  }
  return session.preview;
}

export async function previewRemoteDump(
  sqlite: Database.Database,
  params: { fileId?: string | null } = {},
): Promise<DumpBackupPreviewResult> {
  const { backupFile, buffer } = await readRemoteBackupFile(
    sqlite,
    params.fileId,
  );
  const preview = await inspectDumpArchive(buffer, backupFile);
  const previewWithWarnings: InspectedDump = backupFile.imported
    ? {
        ...preview,
        warnings: [
          "Remote backup file was already imported.",
          ...preview.warnings,
        ],
      }
    : preview;
  if (previewWithWarnings.transferReadiness === "blocked" || backupFile.imported) {
    disposeInspectedDump(previewWithWarnings);
    return previewWithWarnings;
  }
  return {
    ...previewWithWarnings,
    previewToken: registerRemotePreviewSession(backupFile.id, previewWithWarnings),
  };
}

export async function previewLatestLocalDump(): Promise<DumpBackupPreviewResult> {
  const files = listLocalBackupFiles();
  if (files.length === 0) {
    throw notFound("No local backup dump file was found");
  }

  const warnings: string[] = [];
  for (const file of files) {
    try {
      const { backupFile, buffer } = readLocalBackupFile(file.id);
      const preview = await inspectDumpArchive(buffer, backupFile);
      return {
        ...preview,
        warnings: [...warnings, ...preview.warnings],
      };
    } catch (error) {
      warnings.push(
        `Backup file '${file.name}' was skipped: ${error instanceof Error ? error.message : "unknown error"}.`,
      );
    }
  }

  throw badRequest("No valid local backup dump file was found");
}

export async function applyLocalDump(
  sqlite: Database.Database,
  params: { fileId: string; fileHash: string; confirmationPhrase: string },
  options: ApplyDumpOptions = {},
): Promise<DumpBackupApplyResult> {
  assertSafeDumpRuntimeTargets();
  const { backupFile, buffer } = readLocalBackupFile(params.fileId);
  const preview = await inspectDumpArchive(buffer, backupFile);
  if (preview.fileHash !== params.fileHash) {
    throw conflict("Dump file hash changed since preview");
  }
  if (preview.confirmationPhrase !== params.confirmationPhrase) {
    throw conflict("Dump confirmation phrase does not match");
  }
  if (preview.blockingIssues.length > 0) {
    throw badRequest(
      `Dump import is blocked: ${preview.blockingIssues.join(" | ")}`,
    );
  }

  return applyInspectedDump(sqlite, preview, options);
}

async function applyInspectedDump(
  sqlite: Database.Database,
  preview: InspectedDump,
  options: ApplyDumpOptions = {},
): Promise<DumpBackupApplyResult> {
  let transferDir: string | null = null;
  let completed = false;
  try {
    const workDir = ensureWorkDir();
    transferDir = fs.mkdtempSync(path.join(workDir, "transfer-"));
    const targetBackupPath = path.join(transferDir, "target-before-import.sqlite");
    await createDatabaseSnapshot(sqlite, targetBackupPath);

    const stagedRoots = await stageFileRoots(
      preview.zipFileBuffers,
      preview.manifest,
    );
    emitBackupProgress(options.progressCallback, {
      operation: "import",
      phase: "staging",
      current: preview.expectedFileRoots.reduce(
        (sum, root) => sum + root.fileCount,
        0,
      ),
      total: preview.expectedFileRoots.reduce(
        (sum, root) => sum + root.fileCount,
        0,
      ),
      detail: preview.backupFile.name,
    });
    let swaps: FileRootSwap[] = [];
    let tablesRestored = 0;
    let fileRootsTouched = false;
    let committed = false;

    try {
      beginImportTransaction(sqlite);
      const restoreResult = restoreTables(sqlite, preview.payload);
      tablesRestored = restoreResult.restored;
      const restoredTables = collectDumpTableRows(sqlite);
      for (const key of restoreResult.refreshedTableKeys) {
        refreshExpectedTableSummary(
          preview.expectedTables,
          key,
          restoredTables[key],
        );
      }
      emitBackupProgress(options.progressCallback, {
        operation: "import",
        phase: "db_restore",
        current: tablesRestored,
        total: DUMP_TABLE_KEYS.length,
        detail: preview.dumpId,
      });
      options.afterTablesRestore?.(sqlite, preview);
      assertForeignKeys(sqlite);
      swaps = replaceFileRoots(stagedRoots, transferDir);
      fileRootsTouched = true;
      emitBackupProgress(options.progressCallback, {
        operation: "import",
        phase: "file_swap",
        current: 2,
        total: 2,
        detail: preview.dumpId,
      });
      options.afterFileSwap?.();
      finishImportTransaction(sqlite);
      committed = true;
    } catch (error) {
      if (!committed) {
        rollbackImportTransaction(sqlite);
      }
      if (fileRootsTouched) {
        restoreSwappedFileRoots(swaps);
      }
      throw error;
    } finally {
      fs.rmSync(stagedRoots.uploads, { recursive: true, force: true });
      fs.rmSync(stagedRoots.content, { recursive: true, force: true });
    }

    const blockingIssues = [
      ...verifyRestoredTables(sqlite, preview.expectedTables),
      ...verifyRestoredFileRoots(preview.expectedFileRoots),
    ];
    const verificationPassed = blockingIssues.length === 0;
    emitBackupProgress(options.progressCallback, {
      operation: "import",
      phase: "verify",
      current: verificationPassed ? 1 : 0,
      total: 1,
      detail: preview.dumpId,
    });
    emitBackupProgress(options.progressCallback, {
      operation: "import",
      phase: "done",
      current: verificationPassed ? 1 : 0,
      total: 1,
      detail: preview.dumpId,
    });
    completed = true;
    return {
      dumpId: preview.dumpId,
      backupFile: preview.backupFile,
      targetBackupPath,
      verificationPassed,
      importStatus: verificationPassed
        ? preview.warnings.length > 0
          ? "warning"
          : "success"
        : "error",
      tablesRestored,
      fileRootsRestored: currentFileRootSummaries(),
      warnings: preview.warnings,
      blockingIssues,
    };
  } finally {
    if (!completed && transferDir) {
      fs.rmSync(transferDir, { recursive: true, force: true });
    }
    preview.zipFileBuffers.clear();
  }
}

export async function applyRemoteDump(
  sqlite: Database.Database,
  params: { fileId: string; fileHash: string; previewToken: string; confirmed: boolean },
  options: DumpProgressOptions = {},
): Promise<DumpBackupApplyResult> {
  assertSafeDumpRuntimeTargets();
  const safeFileId = validateBackupFileId(params.fileId);
  if (!params.confirmed) {
    throw badRequest("Remote dump import must be confirmed");
  }
  if (activeRemoteImports.has(safeFileId)) {
    throw conflict("Remote backup file import is already running");
  }

  activeRemoteImports.add(safeFileId);
  let preview: InspectedDump | null = null;
  try {
    assertRemoteDumpWasNotImported(sqlite, safeFileId);
    preview = takeRemotePreviewSession(params.previewToken, safeFileId, params.fileHash);
    if (preview.fileHash !== params.fileHash) {
      throw conflict("Dump file hash changed since preview");
    }
    if (preview.blockingIssues.length > 0) {
      throw badRequest(
        `Dump import is blocked: ${preview.blockingIssues.join(" | ")}`,
      );
    }
    assertRemoteDumpWasNotImported(sqlite, safeFileId);
    return await applyInspectedDump(sqlite, preview, {
      progressCallback: options.progressCallback,
      afterTablesRestore: (database, inspectedPreview) => {
        recordRemoteDumpImport(database, {
          fileId: safeFileId,
          fileHash: inspectedPreview.fileHash,
          dumpId: inspectedPreview.dumpId,
          importedAt: nowIso(),
        });
        refreshExpectedTableSummary(
          inspectedPreview.expectedTables,
          "appSettings",
          selectTableRows(database, "app_settings"),
        );
      },
    });
  } finally {
    if (preview) {
      disposeInspectedDump(preview);
    }
    activeRemoteImports.delete(safeFileId);
  }
}

export function getRegisteredDumpTableKeys(): string[] {
  return [...DUMP_TABLE_KEYS];
}

export function getRegisteredDumpTables(): Array<{
  key: string;
  tableName: string;
}> {
  return DUMP_TABLES.map((entry) => ({
    key: entry.key,
    tableName: entry.tableName,
  }));
}
