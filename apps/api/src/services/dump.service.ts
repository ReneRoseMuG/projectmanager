import type {
  DumpBackupApplyResult,
  DumpBackupFile,
  DumpBackupPreviewResult,
  DumpBackupSaveResult,
  DumpBackupStatus,
  DumpFileRootSummary,
  DumpRemoteBackupFile,
  DumpRemoteBackupStatus,
  DumpRemoteUploadResult,
  DumpIncrementalSyncApplyRequest,
  DumpIncrementalSyncApplyResult,
  DumpIncrementalSyncPreviewResult,
  DumpIncrementalSyncResult,
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
import {
  deleteBackupSftpFile,
  downloadBackupSftpFile,
  downloadBackupSftpTextFile,
  getBackupSftpReadiness,
  listBackupSftpFiles,
  uploadBackupSftpFile,
  uploadBackupSftpFileAtPath
} from "./backup-sftp.service.js";
import { getContentBaseDir } from "./content.service.js";

const APP_ID = "taskmanager";
const DUMP_FORMAT_VERSION = 9;
const SUPPORTED_DUMP_FORMAT_VERSIONS = [8, DUMP_FORMAT_VERSION] as const;
const DUMP_FILENAME_PREFIX = "taskmanager_dump_";
const STANDARD_ADMIN_SETUP_SETTING_KEY = "admin_setup_done";
const REMOTE_IMPORT_HISTORY_SETTING_KEY = "remote_dump_import_history";
const ZipArchive = (archiverPackage as unknown as {
  ZipArchive: new (options: { zlib: { level: number } }) => Archiver;
}).ZipArchive;

function createArchive(): Archiver {
  return new ZipArchive({ zlib: { level: 6 } });
}

const DUMP_TABLES = [
  { key: "appSettings", tableName: "app_settings" },
  { key: "roles", tableName: "roles" },
  { key: "permissions", tableName: "permissions" },
  { key: "users", tableName: "users" },
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
  { key: "events", tableName: "events" },
  { key: "projectEvents", tableName: "project_events" },
  { key: "taskEvents", tableName: "task_events" },
  { key: "milestoneEvents", tableName: "milestone_events" },
  { key: "backlogItems", tableName: "backlog_items" },
  { key: "featureRelations", tableName: "feature_relations" },
  { key: "projectTags", tableName: "project_tags" },
  { key: "taskTags", tableName: "task_tags" },
  { key: "ticketTags", tableName: "ticket_tags" },
  { key: "milestoneTags", tableName: "milestone_tags" },
  { key: "projectNotes", tableName: "project_notes" },
  { key: "taskNotes", tableName: "task_notes" },
  { key: "ticketNotes", tableName: "ticket_notes" },
  { key: "milestoneNotes", tableName: "milestone_notes" },
  { key: "projectFeatures", tableName: "project_features" },
  { key: "milestoneFeatures", tableName: "milestone_features" },
  { key: "projectTasks", tableName: "project_tasks" },
  { key: "milestoneTasks", tableName: "milestone_tasks" },
  { key: "featureTasks", tableName: "feature_tasks" },
  { key: "useCaseTasks", tableName: "use_case_tasks" },
  { key: "projectTickets", tableName: "project_tickets" },
  { key: "milestoneTickets", tableName: "milestone_tickets" },
  { key: "taskTickets", tableName: "task_tickets" },
  { key: "featureTickets", tableName: "feature_tickets" },
  { key: "useCaseTickets", tableName: "use_case_tickets" },
  { key: "ticketRelations", tableName: "ticket_relations" },
  { key: "projectComments", tableName: "project_comments" },
  { key: "milestoneComments", tableName: "milestone_comments" },
  { key: "taskComments", tableName: "task_comments" },
  { key: "featureComments", tableName: "feature_comments" },
  { key: "useCaseComments", tableName: "use_case_comments" },
  { key: "backlogItemComments", tableName: "backlog_item_comments" },
  { key: "wikiPageComments", tableName: "wiki_page_comments" },
  { key: "ticketComments", tableName: "ticket_comments" },
  { key: "projectAttachments", tableName: "project_attachments" },
  { key: "milestoneAttachments", tableName: "milestone_attachments" },
  { key: "taskAttachments", tableName: "task_attachments" },
  { key: "featureAttachments", tableName: "feature_attachments" },
  { key: "ticketAttachments", tableName: "ticket_attachments" }
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

interface DumpFileRootManifest extends DumpFileRootSummary {
  files: DumpFileEntry[];
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

interface SyncFileEntry extends DumpFileEntry {
  root: "uploads" | "content";
  remotePath: string;
  localPath: string;
}

interface InspectedIncrementalSync {
  payload: DumpPayload;
  manifest: DumpManifest;
  manifestHash: string;
  preview: DumpIncrementalSyncPreviewResult;
}

interface InspectedDump extends DumpBackupPreviewResult {
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

interface PreservedLocalAuth {
  admin: Record<string, unknown> | null;
  adminSetup: Record<string, unknown> | null;
  remoteImportHistory: Record<string, unknown> | null;
  adminSettings: Array<Record<string, unknown>>;
}

interface ApplyDumpOptions {
  afterFileSwap?: () => void;
  afterTablesRestore?: (sqlite: Database.Database, preview: InspectedDump) => void;
}

interface RemoteDumpImportHistoryEntry {
  fileId: string;
  fileHash: string;
  dumpId: string;
  importedAt: string;
}

const activeRemoteImports = new Set<string>();
let activeIncrementalRemoteOperation = false;

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

function isDumpBackupFilename(filename: string): boolean {
  return filename.startsWith(DUMP_FILENAME_PREFIX) && filename.endsWith(".zip");
}

function validateBackupFileId(fileId: string): string {
  const normalized = fileId.trim();
  if (!isDumpBackupFilename(normalized) || normalized !== path.basename(normalized) || normalized.includes("/") || normalized.includes("\\")) {
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
    sizeBytes: stats.size
  };
}

function listLocalBackupFiles(): DumpBackupFile[] {
  const workDir = ensureWorkDir();
  return fs
    .readdirSync(workDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isDumpBackupFilename(entry.name))
    .map((entry) => mapBackupFile(path.join(workDir, entry.name)))
    .sort((a, b) => {
      const timeCompare = Date.parse(b.modifiedTime ?? b.createdTime) - Date.parse(a.modifiedTime ?? a.createdTime);
      return timeCompare !== 0 ? timeCompare : b.name.localeCompare(a.name, "en");
    });
}

function readLocalBackupFile(fileId: string): { backupFile: DumpBackupFile; buffer: Buffer } {
  const safeFileId = validateBackupFileId(fileId);
  const workDir = ensureWorkDir();
  const filePath = path.resolve(workDir, safeFileId);
  const workRoot = workDir.endsWith(path.sep) ? workDir : `${workDir}${path.sep}`;
  if (!filePath.startsWith(workRoot)) {
    throw badRequest("Backup file id is invalid");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw notFound("Backup file was not found");
  }
  return {
    backupFile: mapBackupFile(filePath),
    buffer: fs.readFileSync(filePath)
  };
}

function mapRemoteBackupFile(
  file: { name: string; path: string; sizeBytes: number; modifiedTime: string },
  importedByFileId: Map<string, RemoteDumpImportHistoryEntry>
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
    importedAt: imported?.importedAt ?? null
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

function isSupportedDumpFormatVersion(value: unknown): value is (typeof SUPPORTED_DUMP_FORMAT_VERSIONS)[number] {
  return SUPPORTED_DUMP_FORMAT_VERSIONS.includes(value as (typeof SUPPORTED_DUMP_FORMAT_VERSIONS)[number]);
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

function selectTableRows(sqlite: Database.Database, tableName: string): Array<Record<string, unknown>> {
  return sqlite.prepare(`SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY rowid`).all() as Array<Record<string, unknown>>;
}

function findStandardAdminId(rows: Array<Record<string, unknown>>): number | null {
  const admin = rows.find((row) => stringValue(row.email)?.toLowerCase() === standardAdminEmail());
  return admin ? numericValue(admin.id) : null;
}

function buildRoleCodeById(rows: Array<Record<string, unknown>>): Map<number, string> {
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

function clearStandardAdminReferences(row: Record<string, unknown>, standardAdminId: number | null): Record<string, unknown> {
  if (standardAdminId === null) {
    return { ...row };
  }

  const result = { ...row };
  for (const column of ["created_by", "updated_by", "actor_user_id"]) {
    if (numericValue(result[column]) === standardAdminId) {
      result[column] = null;
    }
  }
  return result;
}

function normalizeUserRows(rows: Array<Record<string, unknown>>, roleCodeById: Map<number, string>): Array<Record<string, unknown>> {
  return rows
    .filter((row) => stringValue(row.email)?.toLowerCase() !== standardAdminEmail())
    .map((row) => {
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
  const standardAdminId = findStandardAdminId(tables.users);
  const roleCodeById = buildRoleCodeById(tables.roles);

  for (const entry of DUMP_TABLES) {
    if (entry.key === "users") {
      result.users = normalizeUserRows(tables.users, roleCodeById);
      continue;
    }
    if (entry.key === "appSettings") {
      result.appSettings = tables.appSettings.filter((row) => row.key !== STANDARD_ADMIN_SETUP_SETTING_KEY && row.key !== REMOTE_IMPORT_HISTORY_SETTING_KEY);
      continue;
    }
    if (entry.key === "settingsValues") {
      result.settingsValues = tables.settingsValues
        .filter((row) => !(standardAdminId !== null && row.scope_type === "USER" && String(row.scope_id) === String(standardAdminId)))
        .map((row) => clearStandardAdminReferences(row, standardAdminId));
      continue;
    }
    result[entry.key] = tables[entry.key].map((row) => clearStandardAdminReferences(row, standardAdminId));
  }

  return result;
}

function normalizeDumpPayload(payload: DumpPayload): DumpPayload {
  return {
    ...payload,
    formatVersion: DUMP_FORMAT_VERSION,
    tables: normalizeDumpTables(payload.tables)
  };
}

function collectDumpTableRows(sqlite: Database.Database): DumpTableRows {
  const result = {} as DumpTableRows;
  for (const entry of DUMP_TABLES) {
    result[entry.key] = selectTableRows(sqlite, entry.tableName);
  }
  return normalizeDumpTables(result);
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

function buildDumpSnapshot(sqlite: Database.Database): DumpSnapshot {
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
  return {
    dumpId,
    filename: buildDumpFilename(dumpId),
    payload,
    manifest
  };
}

function fileRootEntries(root: "uploads" | "content", rootDir: string): SyncFileEntry[] {
  return listFilesRecursive(rootDir).map((entry) => ({
    ...entry,
    root,
    remotePath: `${root}/${entry.relativePath}`,
    localPath: path.join(rootDir, entry.relativePath)
  }));
}

function currentSyncFileEntries(): SyncFileEntry[] {
  return [...fileRootEntries("uploads", config.uploadDir), ...fileRootEntries("content", getContentBaseDir())].sort((a, b) =>
    a.remotePath.localeCompare(b.remotePath, "en")
  );
}

function manifestFileHashByRemotePath(manifest: DumpManifest | null): Map<string, string> {
  const result = new Map<string, string>();
  if (!manifest) {
    return result;
  }
  for (const root of ["uploads", "content"] as const) {
    for (const file of manifest.fileRoots[root].files) {
      result.set(`${root}/${file.relativePath}`, file.sha256);
    }
  }
  return result;
}

function readSyncFileBuffer(file: SyncFileEntry): Buffer {
  assertSafeRelativePath(file.relativePath);
  const rootDir = file.root === "uploads" ? config.uploadDir : getContentBaseDir();
  const resolvedRoot = path.resolve(rootDir);
  const targetPath = path.resolve(resolvedRoot, file.relativePath);
  const safeRoot = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  if (!targetPath.startsWith(safeRoot)) {
    throw badRequest("Sync contains an unsafe file path");
  }
  return fs.readFileSync(targetPath);
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
  const snapshot = buildDumpSnapshot(sqlite);

  const archive = createArchive();
  archive.append(`${JSON.stringify(snapshot.payload, null, 2)}\n`, { name: "data.json" });
  archive.append(`${JSON.stringify(snapshot.manifest, null, 2)}\n`, { name: "manifest.json" });
  appendDirectoryIfExists(archive, config.uploadDir, "uploads");
  appendDirectoryIfExists(archive, getContentBaseDir(), "content");

  return {
    buffer: await archiveToBuffer(archive),
    dumpId: snapshot.dumpId,
    filename: snapshot.filename,
    manifest: snapshot.manifest
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
  if (!isSupportedDumpFormatVersion(candidate.formatVersion)) {
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
    formatVersion: Number(candidate.formatVersion),
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
  if (!isSupportedDumpFormatVersion(candidate.formatVersion)) {
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
    formatVersion: Number(candidate.formatVersion),
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

export async function inspectDumpArchive(buffer: Buffer, backupFile: DumpBackupFile): Promise<InspectedDump> {
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
  const payloadTableKeys = new Set(Object.keys(parseObject((rawPayload as Record<string, unknown>).tables, "data.json tables")));
  const unknownTableKeys = [...payloadTableKeys].filter((key) => !DUMP_TABLE_KEYS.includes(key as DumpTableKey));
  for (const key of unknownTableKeys) {
    warnings.push(`Unknown dump table '${key}' was ignored.`);
  }

  const actualUploads = await collectZipFiles(directory, "uploads");
  const actualContent = await collectZipFiles(directory, "content");
  const expectedTables = Object.values(buildTableManifest(payload.tables));
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
    if (manifest.formatVersion !== rawDumpPayload.formatVersion) {
      blockingIssues.push("manifest.json formatVersion does not match data.json.");
    }
    if (manifest.schemaRevision !== getSchemaRevision()) {
      blockingIssues.push(`Schema revision differs: dump=${manifest.schemaRevision}, target=${getSchemaRevision()}.`);
    }
    for (const key of DUMP_TABLE_KEYS) {
      const actualRows = rawDumpPayload.tables[key];
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

  const roleCodes = new Set(payload.tables.roles.map((row) => stringValue(row.key)).filter((key): key is string => Boolean(key)));
  for (const row of payload.tables.users) {
    const roleCode = stringValue(row.roleCode);
    if (!roleCode || !roleCodes.has(roleCode)) {
      blockingIssues.push(`Dump user '${stringValue(row.email) ?? "unknown"}' references an unknown role.`);
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
    backupFile,
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

function selectSingleRow(sqlite: Database.Database, tableName: string, whereSql: string, params: unknown[]): Record<string, unknown> | null {
  return (sqlite.prepare(`SELECT * FROM ${quoteIdentifier(tableName)} WHERE ${whereSql}`).get(...params) as Record<string, unknown> | undefined) ?? null;
}

function parseRemoteImportHistory(value: unknown): RemoteDumpImportHistoryEntry[] {
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

function readRemoteImportHistory(sqlite: Database.Database): RemoteDumpImportHistoryEntry[] {
  const row = selectSingleRow(sqlite, "app_settings", `${quoteIdentifier("key")} = ?`, [REMOTE_IMPORT_HISTORY_SETTING_KEY]);
  return parseRemoteImportHistory(row?.value);
}

function remoteImportHistoryByFileId(sqlite: Database.Database): Map<string, RemoteDumpImportHistoryEntry> {
  return new Map(readRemoteImportHistory(sqlite).map((entry) => [entry.fileId, entry]));
}

function writeRemoteImportHistory(sqlite: Database.Database, entries: RemoteDumpImportHistoryEntry[]): void {
  sqlite.prepare(`DELETE FROM ${quoteIdentifier("app_settings")} WHERE ${quoteIdentifier("key")} = ?`).run(REMOTE_IMPORT_HISTORY_SETTING_KEY);
  insertRows(sqlite, "app_settings", [
    {
      key: REMOTE_IMPORT_HISTORY_SETTING_KEY,
      value: JSON.stringify(entries),
      updated_at: nowIso()
    }
  ]);
}

function recordRemoteDumpImport(sqlite: Database.Database, entry: RemoteDumpImportHistoryEntry): void {
  const byFileId = remoteImportHistoryByFileId(sqlite);
  byFileId.set(entry.fileId, entry);
  writeRemoteImportHistory(sqlite, [...byFileId.values()].sort((a, b) => Date.parse(b.importedAt) - Date.parse(a.importedAt)));
}

function assertRemoteDumpWasNotImported(sqlite: Database.Database, fileId: string): void {
  if (remoteImportHistoryByFileId(sqlite).has(fileId)) {
    throw conflict("Remote backup file was already imported");
  }
}

function preserveLocalAuth(sqlite: Database.Database): PreservedLocalAuth {
  const admin = selectSingleRow(sqlite, "users", "lower(email) = ?", [standardAdminEmail()]);
  const adminId = admin ? numericValue(admin.id) : null;
  return {
    admin,
    adminSetup: selectSingleRow(sqlite, "app_settings", `${quoteIdentifier("key")} = ?`, [STANDARD_ADMIN_SETUP_SETTING_KEY]),
    remoteImportHistory: selectSingleRow(sqlite, "app_settings", `${quoteIdentifier("key")} = ?`, [REMOTE_IMPORT_HISTORY_SETTING_KEY]),
    adminSettings:
      adminId === null
        ? []
        : (sqlite
            .prepare(`SELECT * FROM ${quoteIdentifier("settings_values")} WHERE ${quoteIdentifier("scope_type")} = 'USER' AND ${quoteIdentifier("scope_id")} = ? ORDER BY rowid`)
            .all(String(adminId)) as Array<Record<string, unknown>>)
  };
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

function roleIdsByCode(sqlite: Database.Database): Map<string, number> {
  const rows = sqlite.prepare(`SELECT id, key FROM ${quoteIdentifier("roles")}`).all() as Array<{ id: number; key: string }>;
  return new Map(rows.map((row) => [row.key, row.id]));
}

function prepareUserRowsForRestore(sqlite: Database.Database, rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const roleIds = roleIdsByCode(sqlite);
  return rows
    .filter((row) => stringValue(row.email)?.toLowerCase() !== standardAdminEmail())
    .map((row) => {
      const result = { ...row };
      const roleCode = stringValue(result.roleCode);
      if (roleCode) {
        const roleId = roleIds.get(roleCode);
        if (!roleId) {
          throw badRequest(`Dump user '${stringValue(result.email) ?? "unknown"}' references an unknown role`);
        }
        result.role_id = roleId;
        delete result.roleCode;
        return result;
      }
      return result;
    });
}

function nextFreeId(sqlite: Database.Database, tableName: string): number {
  const row = sqlite.prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM ${quoteIdentifier(tableName)}`).get() as { nextId: number };
  return row.nextId;
}

function userIdExists(sqlite: Database.Database, id: number): boolean {
  const row = sqlite.prepare(`SELECT 1 AS existsRow FROM ${quoteIdentifier("users")} WHERE id = ?`).get(id) as { existsRow: number } | undefined;
  return Boolean(row);
}

function adminRoleId(sqlite: Database.Database): number {
  const row = sqlite.prepare(`SELECT id FROM ${quoteIdentifier("roles")} WHERE ${quoteIdentifier("key")} = 'admin'`).get() as { id: number } | undefined;
  if (!row) {
    throw badRequest("Dump import requires an admin role");
  }
  return row.id;
}

function restorePreservedAdmin(sqlite: Database.Database, preserved: PreservedLocalAuth): number | null {
  if (!preserved.admin) {
    return null;
  }

  const row = { ...preserved.admin };
  const originalAdminId = numericValue(row.id);
  const restoredAdminId = originalAdminId !== null && !userIdExists(sqlite, originalAdminId) ? originalAdminId : nextFreeId(sqlite, "users");
  row.id = restoredAdminId;
  row.email = standardAdminEmail();
  row.role_id = adminRoleId(sqlite);
  insertRows(sqlite, "users", [row]);
  return restoredAdminId;
}

function insertPreservedAppSetting(sqlite: Database.Database, row: Record<string, unknown> | null): void {
  if (!row) {
    return;
  }
  const key = stringValue(row.key);
  if (!key) {
    return;
  }
  sqlite.prepare(`DELETE FROM ${quoteIdentifier("app_settings")} WHERE ${quoteIdentifier("key")} = ?`).run(key);
  insertRows(sqlite, "app_settings", [row]);
}

function restorePreservedAdminSettings(sqlite: Database.Database, rows: Array<Record<string, unknown>>, adminId: number | null): void {
  if (adminId === null) {
    return;
  }

  for (const row of rows) {
    const nextRow: Record<string, unknown> = { ...row, scope_id: String(adminId) };
    if (numericValue(nextRow.created_by) !== null) {
      nextRow.created_by = adminId;
    }
    if (numericValue(nextRow.updated_by) !== null) {
      nextRow.updated_by = adminId;
    }
    const rowId = numericValue(nextRow.id);
    if (rowId !== null) {
      const exists = sqlite.prepare(`SELECT 1 AS existsRow FROM ${quoteIdentifier("settings_values")} WHERE id = ?`).get(rowId);
      if (exists) {
        nextRow.id = nextFreeId(sqlite, "settings_values");
      }
    }
    sqlite
      .prepare(`DELETE FROM ${quoteIdentifier("settings_values")} WHERE ${quoteIdentifier("setting_key")} = ? AND ${quoteIdentifier("scope_type")} = 'USER' AND ${quoteIdentifier("scope_id")} = ?`)
      .run(nextRow.setting_key, String(adminId));
    insertRows(sqlite, "settings_values", [nextRow]);
  }
}

function restoreTables(sqlite: Database.Database, payload: DumpPayload): number {
  const preservedLocalAuth = preserveLocalAuth(sqlite);
  for (const entry of [...DUMP_TABLES].reverse()) {
    sqlite.prepare(`DELETE FROM ${quoteIdentifier(entry.tableName)}`).run();
    sqlite.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(entry.tableName);
  }

  let restored = 0;
  for (const entry of DUMP_TABLES) {
    const rows = entry.key === "users" ? prepareUserRowsForRestore(sqlite, payload.tables.users) : payload.tables[entry.key];
    insertRows(sqlite, entry.tableName, rows);
    if (rows.length > 0) {
      restored += 1;
    }
  }
  const adminId = restorePreservedAdmin(sqlite, preservedLocalAuth);
  insertPreservedAppSetting(sqlite, preservedLocalAuth.adminSetup);
  insertPreservedAppSetting(sqlite, preservedLocalAuth.remoteImportHistory);
  restorePreservedAdminSettings(sqlite, preservedLocalAuth.adminSettings, adminId);
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
  const restoredTables = collectDumpTableRows(sqlite);
  for (const entry of DUMP_TABLES) {
    const rows = restoredTables[entry.key];
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

export function getLocalBackupStatus(): DumpBackupStatus {
  const files = listLocalBackupFiles();
  return {
    backupDirectory: config.backupWorkDir,
    ready: true,
    fileCount: files.length,
    latestFile: files[0] ?? null
  };
}

function remoteUploadNotAttempted(error: string): DumpRemoteUploadResult {
  return {
    attempted: false,
    success: false,
    remoteFile: null,
    error
  };
}

async function uploadDumpArchiveToRemote(sqlite: Database.Database, filename: string, buffer: Buffer): Promise<DumpRemoteUploadResult> {
  const readiness = getBackupSftpReadiness();
  if (!readiness.ready) {
    return remoteUploadNotAttempted(readiness.blockingIssues.join(" | "));
  }

  try {
    const uploadedFile = await uploadBackupSftpFile(filename, buffer);
    return {
      attempted: true,
      success: true,
      remoteFile: mapRemoteBackupFile(uploadedFile, remoteImportHistoryByFileId(sqlite)),
      error: null
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      remoteFile: null,
      error: error instanceof Error ? error.message : "SFTP upload failed"
    };
  }
}

export async function saveDumpToLocalBackup(sqlite: Database.Database): Promise<DumpBackupSaveResult> {
  const archive = await buildDumpArchive(sqlite);
  const workDir = ensureWorkDir();
  const filePath = path.join(workDir, archive.filename);
  fs.writeFileSync(filePath, archive.buffer);
  const backupFile = mapBackupFile(filePath);
  const remoteUpload = await uploadDumpArchiveToRemote(sqlite, archive.filename, archive.buffer);
  return {
    dumpId: archive.dumpId,
    filename: archive.filename,
    filePath,
    sizeBytes: archive.buffer.byteLength,
    backupFile,
    remoteUpload
  };
}

function incrementalSyncUnavailableResult(error: string): DumpIncrementalSyncResult {
  return {
    success: false,
    error,
    tablesUpdated: false,
    filesUploaded: 0,
    filesDeleted: 0,
    filesDeleteFailed: 0,
    totalRemoteFiles: 0,
    syncedAt: nowIso(),
    warnings: []
  };
}

async function readRemoteSyncManifestOrNull(): Promise<DumpManifest | null> {
  try {
    const rawManifest = await downloadBackupSftpTextFile("manifest.json");
    return parseManifest(JSON.parse(rawManifest));
  } catch {
    return null;
  }
}

function hasTableChanges(currentManifest: DumpManifest, previousManifest: DumpManifest | null): boolean {
  if (!previousManifest) {
    return true;
  }
  return DUMP_TABLE_KEYS.some((key) => currentManifest.tables[key].sha256 !== previousManifest.tables[key].sha256);
}

export async function performIncrementalSftpSync(sqlite: Database.Database): Promise<DumpIncrementalSyncResult> {
  if (activeIncrementalRemoteOperation || activeRemoteImports.size > 0) {
    return incrementalSyncUnavailableResult("A remote backup operation is already running");
  }

  activeIncrementalRemoteOperation = true;
  try {
    assertSafeDumpRuntimeTargets();
    const readiness = getBackupSftpReadiness();
    if (!readiness.ready) {
      return incrementalSyncUnavailableResult(readiness.blockingIssues.join(" | "));
    }

    const snapshot = buildDumpSnapshot(sqlite);
    const previousManifest = await readRemoteSyncManifestOrNull();
    const currentFiles = currentSyncFileEntries();
    const currentFileHashByRemotePath = new Map(currentFiles.map((file) => [file.remotePath, file.sha256]));
    const previousFileHashByRemotePath = manifestFileHashByRemotePath(previousManifest);
    const tablesUpdated = hasTableChanges(snapshot.manifest, previousManifest);
    const filesToUpload = currentFiles.filter((file) => previousFileHashByRemotePath.get(file.remotePath) !== file.sha256);
    const filesToDelete = [...previousFileHashByRemotePath.keys()].filter((remotePath) => !currentFileHashByRemotePath.has(remotePath));
    const warnings: string[] = [];

    if (tablesUpdated) {
      await uploadBackupSftpFile("data.json", Buffer.from(`${JSON.stringify(snapshot.payload, null, 2)}\n`, "utf8"));
    }

    for (const file of filesToUpload) {
      await uploadBackupSftpFileAtPath(file.remotePath, readSyncFileBuffer(file));
    }

    let filesDeleted = 0;
    let filesDeleteFailed = 0;
    for (const remotePath of filesToDelete) {
      try {
        await deleteBackupSftpFile(remotePath);
        filesDeleted += 1;
      } catch (error) {
        filesDeleteFailed += 1;
        warnings.push(`Remote file '${remotePath}' could not be deleted: ${error instanceof Error ? error.message : "unknown error"}.`);
      }
    }

    if (tablesUpdated || filesToUpload.length > 0 || filesDeleted > 0 || filesDeleteFailed > 0) {
      await uploadBackupSftpFile("manifest.json", Buffer.from(`${JSON.stringify(snapshot.manifest, null, 2)}\n`, "utf8"));
    }

    return {
      success: true,
      error: null,
      tablesUpdated,
      filesUploaded: filesToUpload.length,
      filesDeleted,
      filesDeleteFailed,
      totalRemoteFiles: currentFiles.length + 2,
      syncedAt: nowIso(),
      warnings
    };
  } catch (error) {
    return incrementalSyncUnavailableResult(error instanceof Error ? error.message : "Incremental SFTP sync failed");
  } finally {
    activeIncrementalRemoteOperation = false;
  }
}

export async function getRemoteBackupStatus(sqlite: Database.Database): Promise<DumpRemoteBackupStatus> {
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
      blockingIssues: readiness.blockingIssues
    };
  }

  try {
    const importedByFileId = remoteImportHistoryByFileId(sqlite);
    const files = (await listBackupSftpFiles()).map((file) => mapRemoteBackupFile(file, importedByFileId));
    return {
      remoteDirectory: readiness.remoteDirectory,
      configured: readiness.configured,
      protectedConfirmed: readiness.protectedConfirmed,
      ready: true,
      fileCount: files.length,
      latestFile: files[0] ?? null,
      files,
      blockingIssues: []
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
      blockingIssues: [error instanceof Error ? error.message : "SFTP remote status failed"]
    };
  }
}

async function readRemoteBackupFile(sqlite: Database.Database, fileId?: string | null): Promise<{ backupFile: DumpRemoteBackupFile; buffer: Buffer }> {
  const safeFileId = fileId ? validateBackupFileId(fileId) : null;
  const remoteFiles = await listBackupSftpFiles();
  const selectedFile = safeFileId ? remoteFiles.find((file) => file.name === safeFileId) : remoteFiles[0];
  if (!selectedFile) {
    throw notFound(safeFileId ? "Remote backup file was not found" : "No remote backup dump file was found");
  }

  return {
    backupFile: mapRemoteBackupFile(selectedFile, remoteImportHistoryByFileId(sqlite)),
    buffer: await downloadBackupSftpFile(selectedFile.name)
  };
}

function parseRemoteSyncJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw badRequest(`${label} is invalid JSON`);
  }
}

function roleReferenceIssues(payload: DumpPayload): string[] {
  const roleCodes = new Set(payload.tables.roles.map((row) => stringValue(row.key)).filter((key): key is string => Boolean(key)));
  return payload.tables.users.flatMap((row) => {
    const roleCode = stringValue(row.roleCode);
    if (!roleCode || !roleCodes.has(roleCode)) {
      return [`Dump user '${stringValue(row.email) ?? "unknown"}' references an unknown role.`];
    }
    return [];
  });
}

async function inspectIncrementalRemoteSync(): Promise<InspectedIncrementalSync> {
  assertSafeDumpRuntimeTargets();
  const readiness = getBackupSftpReadiness();
  if (!readiness.ready) {
    throw badRequest(readiness.blockingIssues.join(" | "));
  }

  let rawManifest: string;
  try {
    rawManifest = await downloadBackupSftpTextFile("manifest.json");
  } catch {
    throw notFound("No incremental remote sync manifest was found");
  }

  let rawPayload: string;
  try {
    rawPayload = await downloadBackupSftpTextFile("data.json");
  } catch {
    throw badRequest("Incremental remote sync does not contain data.json");
  }

  const manifest = parseManifest(parseRemoteSyncJson(rawManifest, "manifest.json"));
  const payload = normalizeDumpPayload(parsePayload(parseRemoteSyncJson(rawPayload, "data.json")));
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  if (manifest.schemaRevision !== getSchemaRevision()) {
    blockingIssues.push(`Schema revision differs: dump=${manifest.schemaRevision}, target=${getSchemaRevision()}.`);
  }
  for (const key of DUMP_TABLE_KEYS) {
    const tableRows = payload.tables[key];
    const expected = manifest.tables[key];
    if (tableRows.length !== expected.rowCount) {
      blockingIssues.push(`Manifest row count does not match table '${key}'.`);
    }
    if (sha256Json(tableRows) !== expected.sha256) {
      blockingIssues.push(`Manifest hash does not match table '${key}'.`);
    }
  }
  blockingIssues.push(...roleReferenceIssues(payload));

  const manifestHash = sha256Buffer(Buffer.from(rawManifest, "utf8"));
  const expectedFileRoots = buildFileRootSummaries(manifest);
  const preview: DumpIncrementalSyncPreviewResult = {
    manifestHash,
    dumpId: manifest.dumpId,
    remoteDirectory: readiness.remoteDirectory,
    targetDatabasePath: config.databasePath,
    transferReadiness: blockingIssues.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockingIssues,
    warnings,
    manifestPresent: true,
    schemaRevision: manifest.schemaRevision,
    syncedAt: manifest.exportedAt,
    expectedTables: Object.values(manifest.tables),
    expectedFileRoots,
    totalFiles: expectedFileRoots.reduce((sum, root) => sum + root.fileCount, 0),
    totalBytes: expectedFileRoots.reduce((sum, root) => sum + root.totalBytes, 0)
  };

  return { payload, manifest, manifestHash, preview };
}

async function stageRemoteSyncRoot(manifest: DumpManifest, root: "uploads" | "content"): Promise<string> {
  const stageDir = makeTempDir(`taskmanager-sync-${root}-`);
  try {
    for (const file of manifest.fileRoots[root].files) {
      assertSafeRelativePath(file.relativePath);
      const buffer = await downloadBackupSftpFile(`${root}/${file.relativePath}`);
      if (buffer.byteLength !== file.sizeBytes || sha256Buffer(buffer) !== file.sha256) {
        throw badRequest(`Remote sync file '${root}/${file.relativePath}' does not match the manifest.`);
      }
      const targetPath = path.resolve(stageDir, file.relativePath);
      const stageRoot = stageDir.endsWith(path.sep) ? stageDir : `${stageDir}${path.sep}`;
      if (!targetPath.startsWith(stageRoot)) {
        throw badRequest("Remote sync contains an unsafe file path");
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

async function stageRemoteSyncFileRoots(manifest: DumpManifest): Promise<StagedFileRoots> {
  const uploads = await stageRemoteSyncRoot(manifest, "uploads");
  try {
    const content = await stageRemoteSyncRoot(manifest, "content");
    return { uploads, content };
  } catch (error) {
    fs.rmSync(uploads, { recursive: true, force: true });
    throw error;
  }
}

export async function previewIncrementalRemoteSync(): Promise<DumpIncrementalSyncPreviewResult> {
  return (await inspectIncrementalRemoteSync()).preview;
}

export async function previewRemoteDump(sqlite: Database.Database, params: { fileId?: string | null } = {}): Promise<DumpBackupPreviewResult> {
  const { backupFile, buffer } = await readRemoteBackupFile(sqlite, params.fileId);
  const preview = await inspectDumpArchive(buffer, backupFile);
  return backupFile.imported ? { ...preview, warnings: ["Remote backup file was already imported.", ...preview.warnings] } : preview;
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
        warnings: [...warnings, ...preview.warnings]
      };
    } catch (error) {
      warnings.push(`Backup file '${file.name}' was skipped: ${error instanceof Error ? error.message : "unknown error"}.`);
    }
  }

  throw badRequest("No valid local backup dump file was found");
}

export async function applyLocalDump(
  sqlite: Database.Database,
  params: { fileId: string; fileHash: string; confirmationPhrase: string },
  options: ApplyDumpOptions = {}
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
    throw badRequest(`Dump import is blocked: ${preview.blockingIssues.join(" | ")}`);
  }

  return applyInspectedDump(sqlite, preview, options);
}

async function applyInspectedDump(sqlite: Database.Database, preview: InspectedDump, options: ApplyDumpOptions = {}): Promise<DumpBackupApplyResult> {
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
    options.afterTablesRestore?.(sqlite, preview);
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
    backupFile: preview.backupFile,
    targetBackupPath,
    verificationPassed,
    importStatus: verificationPassed ? (preview.warnings.length > 0 ? "warning" : "success") : "error",
    tablesRestored,
    fileRootsRestored: currentFileRootSummaries(),
    warnings: preview.warnings,
    blockingIssues
  };
}

export async function applyRemoteDump(
  sqlite: Database.Database,
  params: { fileId: string; fileHash: string; confirmed: boolean }
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
  try {
    assertRemoteDumpWasNotImported(sqlite, safeFileId);
    const { backupFile, buffer } = await readRemoteBackupFile(sqlite, safeFileId);
    const preview = await inspectDumpArchive(buffer, backupFile);
    if (preview.fileHash !== params.fileHash) {
      throw conflict("Dump file hash changed since preview");
    }
    if (preview.blockingIssues.length > 0) {
      throw badRequest(`Dump import is blocked: ${preview.blockingIssues.join(" | ")}`);
    }
    assertRemoteDumpWasNotImported(sqlite, safeFileId);
    return await applyInspectedDump(sqlite, preview, {
      afterTablesRestore: (database, inspectedPreview) => {
        recordRemoteDumpImport(database, {
          fileId: safeFileId,
          fileHash: inspectedPreview.fileHash,
          dumpId: inspectedPreview.dumpId,
          importedAt: nowIso()
        });
      }
    });
  } finally {
    activeRemoteImports.delete(safeFileId);
  }
}

export async function applyIncrementalRemoteSync(
  sqlite: Database.Database,
  params: DumpIncrementalSyncApplyRequest
): Promise<DumpIncrementalSyncApplyResult> {
  assertSafeDumpRuntimeTargets();
  if (!params.confirmed) {
    throw badRequest("Incremental remote sync import must be confirmed");
  }
  if (activeIncrementalRemoteOperation || activeRemoteImports.size > 0) {
    throw conflict("Remote backup operation is already running");
  }

  activeIncrementalRemoteOperation = true;
  let stagedRoots: StagedFileRoots | null = null;
  try {
    const inspected = await inspectIncrementalRemoteSync();
    if (inspected.manifestHash !== params.manifestHash) {
      throw conflict("Remote sync manifest changed since preview");
    }
    if (inspected.preview.blockingIssues.length > 0) {
      throw badRequest(`Incremental remote sync import is blocked: ${inspected.preview.blockingIssues.join(" | ")}`);
    }

    stagedRoots = await stageRemoteSyncFileRoots(inspected.manifest);
    const workDir = ensureWorkDir();
    const transferDir = fs.mkdtempSync(path.join(workDir, "transfer-"));
    const backupRoot = path.join(transferDir, "file-root-backups");
    const targetBackupPath = path.join(transferDir, "target-before-import.zip");
    const targetBackup = await buildDumpArchive(sqlite);
    fs.writeFileSync(targetBackupPath, targetBackup.buffer);

    const backups = createFileRootBackups(backupRoot);
    let tablesRestored = 0;
    let fileRootsTouched = false;
    let committed = false;

    try {
      beginImportTransaction(sqlite);
      tablesRestored = restoreTables(sqlite, inspected.payload);
      assertForeignKeys(sqlite);
      replaceFileRoots(stagedRoots);
      fileRootsTouched = true;
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
      fs.rmSync(backupRoot, { recursive: true, force: true });
    }

    const blockingIssues = [
      ...verifyRestoredTables(sqlite, inspected.preview.expectedTables),
      ...verifyRestoredFileRoots(inspected.preview.expectedFileRoots)
    ];
    const verificationPassed = blockingIssues.length === 0;
    return {
      dumpId: inspected.manifest.dumpId,
      manifestHash: inspected.manifestHash,
      remoteDirectory: inspected.preview.remoteDirectory,
      targetBackupPath,
      verificationPassed,
      importStatus: verificationPassed ? (inspected.preview.warnings.length > 0 ? "warning" : "success") : "error",
      tablesRestored,
      fileRootsRestored: currentFileRootSummaries(),
      warnings: inspected.preview.warnings,
      blockingIssues
    };
  } finally {
    if (stagedRoots) {
      fs.rmSync(stagedRoots.uploads, { recursive: true, force: true });
      fs.rmSync(stagedRoots.content, { recursive: true, force: true });
    }
    activeIncrementalRemoteOperation = false;
  }
}

export function getRegisteredDumpTableKeys(): string[] {
  return [...DUMP_TABLE_KEYS];
}

export function getRegisteredDumpTables(): Array<{ key: string; tableName: string }> {
  return DUMP_TABLES.map((entry) => ({ key: entry.key, tableName: entry.tableName }));
}
