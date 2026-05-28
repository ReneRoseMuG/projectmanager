/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Lokale Sicherung erzeugt ein vollständiges Dump-ZIP mit DB, uploads/ und content/.
 * - Aktualisieren findet die neueste valide lokale Sicherung und stellt DB + Dateisystem wieder her.
 * - Der Tabellenvertrag deckt alle Anwendungstabellen der aktuellen SQLite-Migration ab.
 * - Fehlerfälle blockieren den Import oder rollen ihn zurück, ohne beschädigte Teildaten zu hinterlassen.
 *
 * Fehlerfälle:
 * - Korrupte ZIPs, fehlende data.json, falsche Sicherheitsphrase, Hash-Mismatch, Manifest-Mismatch.
 * - Ungültige Fremdschlüssel im Dump, unsichere Dateinamen, Fehler nach Dateisystem-Swap.
 *
 * Ziel:
 * Nachweis eines echten Roundtrips gegen temporäre SQLite-Datei und temporäre Datei-Verzeichnisse
 * sowie Absicherung der fehlertoleranten, aber konsistenzerhaltenden Importlogik.
 */
import type {
  BackupProgressEvent,
  DumpBackupApplyResult,
  DumpBackupFile,
  DumpBackupPreviewResult,
} from "@taskmanager/shared-types";
import * as archiverPackage from "archiver";
import type { Archiver } from "archiver";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import supertest from "supertest";
import unzipper from "unzipper";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vitestRuntimeRoot } from "../../../apps/api/src/runtime-safety.js";
import { config } from "../../../apps/api/src/config.js";
import {
  applyLocalDump,
  applyRemoteDump,
  buildDumpArchive,
  DUMP_TABLE_KEYS,
  getRegisteredDumpTables,
  getLocalBackupStatus,
  getRemoteBackupStatus,
  inspectDumpArchive,
  previewLatestLocalDump,
  previewRemoteDump,
  saveDumpToLocalBackup,
} from "../../../apps/api/src/services/dump.service.js";
import {
  setBackupSftpClientFactoryForTests,
  type BackupSftpClient,
} from "../../../apps/api/src/services/backup-sftp.service.js";
import { setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp } from "../../fixtures/api/app.js";
import { createFileTestDb, type TestDb } from "../../fixtures/api/db.js";

const ZipArchive = (
  archiverPackage as unknown as {
    ZipArchive: new (options: { zlib: { level: number } }) => Archiver;
  }
).ZipArchive;

function createArchive(): Archiver {
  return new ZipArchive({ zlib: { level: 6 } });
}

interface Snapshot {
  tables: Record<string, Array<Record<string, unknown>>>;
  uploads: Record<string, string>;
  content: Record<string, string>;
  foreignKeyErrors: unknown[];
}

let tempRoot: string;
let uploadDir: string;
let contentDir: string;
let backupDir: string;
let previewDir: string;
let testDb: TestDb;

interface RemoteMockFile {
  buffer: Buffer;
  modifiedAt: number;
}

interface SftpMockMetrics {
  clientFactoryCount: number;
  connectCount: number;
  endCount: number;
  getPaths: string[];
  putPaths: string[];
  deletePaths: string[];
  streamPutCount: number;
  failOnPutPath: string | null;
}

async function bufferFromSftpInput(
  input: Buffer | NodeJS.ReadableStream,
): Promise<Buffer> {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of input as AsyncIterable<Buffer | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function configureMockSftp(
  remoteFiles: Map<string, RemoteMockFile>,
): SftpMockMetrics {
  const metrics: SftpMockMetrics = {
    clientFactoryCount: 0,
    connectCount: 0,
    endCount: 0,
    getPaths: [],
    putPaths: [],
    deletePaths: [],
    streamPutCount: 0,
    failOnPutPath: null,
  };
  const remoteDir = "/remote/backups";
  const remotePrefix = `${remoteDir.replace(/\/+$/, "")}/`;
  const remoteKey = (remotePath: string): string => {
    const normalized = remotePath.replace(/\\/g, "/");
    return normalized.startsWith(remotePrefix)
      ? normalized.slice(remotePrefix.length)
      : path.basename(normalized);
  };
  config.backupSftpEnabled = true;
  config.backupSftpHost = "sftp.test";
  config.backupSftpPort = 22;
  config.backupSftpUser = "tester";
  config.backupSftpPassword = "secret";
  config.backupSftpRemoteDir = remoteDir;
  config.backupSftpProtectedConfirmed = true;

  setBackupSftpClientFactoryForTests((): BackupSftpClient => {
    metrics.clientFactoryCount += 1;
    return {
      async connect() {
        metrics.connectCount += 1;
        return undefined;
      },
      async list() {
        return [...remoteFiles.entries()].map(([name, file]) => ({
          type: "-",
          name,
          size: file.buffer.byteLength,
          modifyTime: file.modifiedAt,
        }));
      },
      async get(remotePath) {
        const name = remoteKey(remotePath);
        metrics.getPaths.push(name);
        const file = remoteFiles.get(name);
        if (!file) {
          throw new Error("Remote file missing");
        }
        return file.buffer;
      },
      async put(input, remotePath) {
        const key = remoteKey(remotePath);
        metrics.putPaths.push(key);
        if (!Buffer.isBuffer(input)) {
          metrics.streamPutCount += 1;
        }
        if (metrics.failOnPutPath === key) {
          throw new Error(`Configured SFTP put failure for ${key}`);
        }
        remoteFiles.set(remoteKey(remotePath), {
          buffer: await bufferFromSftpInput(input),
          modifiedAt: Date.now(),
        });
        return remotePath;
      },
      async delete(remotePath) {
        const key = remoteKey(remotePath);
        metrics.deletePaths.push(key);
        remoteFiles.delete(key);
      },
      async mkdir() {
        return remoteDir;
      },
      async stat(remotePath) {
        const file = remoteFiles.get(remoteKey(remotePath));
        if (!file) {
          throw new Error("Remote file missing");
        }
        return { size: file.buffer.byteLength };
      },
      async end() {
        metrics.endCount += 1;
        return true;
      },
    };
  });
  return metrics;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function sha256Buffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(value), "utf8"));
}

function listFileHashes(rootDir: string): Record<string, string> {
  if (!fs.existsSync(rootDir)) return {};
  const result: Record<string, string> = {};
  const walk = (currentDir: string): void => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const targetPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(targetPath);
        continue;
      }
      if (entry.isFile()) {
        result[path.relative(rootDir, targetPath).replace(/\\/g, "/")] =
          sha256Buffer(fs.readFileSync(targetPath));
      }
    }
  };
  walk(rootDir);
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")),
  );
}

function writeBackupFile(
  filename: string,
  buffer: Buffer,
  modifiedAt = new Date(),
): DumpBackupFile {
  fs.mkdirSync(backupDir, { recursive: true });
  const filePath = path.join(backupDir, filename);
  fs.writeFileSync(filePath, buffer);
  fs.utimesSync(filePath, modifiedAt, modifiedAt);
  return {
    id: filename,
    name: filename,
    path: filePath,
    createdTime: modifiedAt.toISOString(),
    modifiedTime: modifiedAt.toISOString(),
    sizeBytes: buffer.byteLength,
  };
}

function collectSnapshot(): Snapshot {
  const tables: Snapshot["tables"] = {};
  for (const entry of getRegisteredDumpTables()) {
    tables[entry.key] = testDb.sqlite
      .prepare(
        `SELECT * FROM ${quoteIdentifier(entry.tableName)} ORDER BY rowid`,
      )
      .all() as Array<Record<string, unknown>>;
  }
  return {
    tables,
    uploads: listFileHashes(uploadDir),
    content: listFileHashes(contentDir),
    foreignKeyErrors: testDb.sqlite.pragma("foreign_key_check") as unknown[],
  };
}

function withoutRemoteImportHistory(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    tables: {
      ...snapshot.tables,
      appSettings:
        snapshot.tables.appSettings?.filter(
          (row) => row.key !== "remote_dump_import_history",
        ) ?? [],
    },
  };
}

function withoutContentFiles(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    content: {},
  };
}

function seedCompleteDataset(): void {
  fs.mkdirSync(path.join(uploadDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "features"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "usecases"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "wiki"), { recursive: true });
  fs.writeFileSync(
    path.join(uploadDir, "project-file.txt"),
    "Projektdatei",
    "utf8",
  );
  fs.writeFileSync(
    path.join(uploadDir, "milestone-file.txt"),
    "Meilensteindatei",
    "utf8",
  );
  fs.writeFileSync(
    path.join(uploadDir, "docs", "task-file.pdf"),
    "Taskdatei",
    "utf8",
  );
  fs.writeFileSync(
    path.join(uploadDir, "feature-file.txt"),
    "Featuredatei",
    "utf8",
  );
  fs.writeFileSync(
    path.join(uploadDir, "ticket-file.txt"),
    "Ticketdatei",
    "utf8",
  );
  fs.writeFileSync(
    path.join(contentDir, "features", "feature-1-alpha.md"),
    "# Feature Alpha",
    "utf8",
  );
  fs.writeFileSync(
    path.join(contentDir, "usecases", "usecase-1-alpha.md"),
    "# Use Case Alpha",
    "utf8",
  );
  fs.writeFileSync(
    path.join(contentDir, "wiki", "root.md"),
    "# Wiki Root",
    "utf8",
  );

  testDb.sqlite.exec(`
    INSERT INTO users (id, name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at)
      VALUES (1, '', 'Test', 'Admin', 'admin@local', '$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q', 1, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO users (id, name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at)
      VALUES (2, '', 'Ada', 'Lovelace', 'ada@example.test', NULL, 2, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO app_settings (key, value, updated_at)
      VALUES ('admin_setup_done', 'true', '2026-05-17T08:00:00');
    INSERT INTO settings_values (id, setting_key, scope_type, scope_id, value_json, version, created_by, updated_by, created_at, updated_at)
      VALUES (1, 'taskBoard.viewMode', 'USER', '1', '"kanban"', 1, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at, updated_at)
      VALUES (1, 2, 'https://push.example.test/subscription/1', 'p256dh-key', 'auth-secret', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO day_plans (id, date, user_id, status, notes, version, created_by, updated_by, created_at, updated_at)
      VALUES (1, '2026-05-20', 2, 'open', 'Tagesfokus', 1, 2, 2, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO projects (id, name, description, status, color, start_date, due_date, created_at, updated_at)
      VALUES (1, 'Projekt Alpha', 'Beschreibung', 'active', '#123456', '2026-05-01', '2026-05-31', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO journal_entries (id, operation, object_type, object_id, object_label, summary, actor_user_id, actor_name, created_at)
      VALUES (1, 'update', 'project', 1, 'Projekt Alpha', 'Projekt "Projekt Alpha" hat ein neues Enddatum: 31.05.26 → 15.06.26.', 2, 'Lovelace, Ada', '2026-05-17T08:30:00');
    INSERT INTO journal_entry_changes (id, journal_entry_id, field_key, field_label, old_value_json, old_value_label, new_value_json, new_value_label, summary)
      VALUES (1, 1, 'dueDate', 'Enddatum', '"2026-05-31"', '31.05.26', '"2026-06-15"', '15.06.26', 'Enddatum: 31.05.26 → 15.06.26');
    INSERT INTO journal_entry_contexts (id, journal_entry_id, object_type, object_id, object_label, relation)
      VALUES (1, 1, 'project', 1, 'Projekt Alpha', 'self');
    INSERT INTO milestones (id, project_id, name, description, status, color, start_date, due_date, created_at, updated_at)
      VALUES (1, 1, 'Meilenstein Alpha', 'Meilenstein Beschreibung', 'active', '#654321', '2026-05-10', '2026-05-15', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tags (id, name, color) VALUES (1, 'Wichtig', '#ff0000');
    INSERT INTO notes (id, title, content_json, created_at, updated_at)
      VALUES (1, 'Notiz', '{"type":"doc"}', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO notes (id, title, content_json, created_at, updated_at)
      VALUES (2, 'Meilenstein-Notiz', '{"type":"doc","content":[]}', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO features (id, title, status, description, content, sort_order, created_at, updated_at)
      VALUES (1, 'Feature Alpha', 'active', 'Feature Beschreibung', '# Feature Alpha', 10, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, parent_id, title, description, status, priority, responsible_user_id, due_date, import_key, created_at, updated_at)
      VALUES (1, NULL, 'Task Alpha', 'Task Beschreibung', 'todo', 'high', 2, '2026-05-20', 'task-alpha', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, parent_id, title, description, status, priority, responsible_user_id, due_date, import_key, created_at, updated_at)
      VALUES (2, 1, 'Subtask Alpha', NULL, 'in_progress', 'medium', NULL, NULL, 'subtask-alpha', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tickets (id, type, title, description, status, priority, position, created_at, updated_at)
      VALUES (1, 'bug', 'Ticket Alpha', 'Ticket Beschreibung', 'open', 'high', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO use_cases (id, feature_id, title, status, description, content, sort_order, created_at, updated_at)
      VALUES (1, 1, 'Use Case Alpha', 'active', 'UC Beschreibung', '# Use Case Alpha', 20, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO wiki_pages (id, parent_id, title, content, sort_order, created_at, updated_at)
      VALUES (1, NULL, 'Wiki Root', '# Wiki Root', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO wiki_pages (id, parent_id, title, content, sort_order, created_at, updated_at)
      VALUES (2, NULL, 'Wiki Related', '# Wiki Related', 2, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    UPDATE projects SET wiki_page_id = 1 WHERE id = 1;
    INSERT INTO comments (id, body, created_at)
      VALUES (1, 'Task Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (2, 'Feature Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (3, 'Projekt Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (4, 'Use Case Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (5, 'Backlog Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (6, 'Wiki Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (7, 'Ticket Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, body, created_at)
      VALUES (8, 'Meilenstein Kommentar', '2026-05-17T08:00:00');
    INSERT INTO project_tags (project_id, tag_id) VALUES (1, 1);
    INSERT INTO milestone_tags (milestone_id, tag_id) VALUES (1, 1);
    INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1);
    INSERT INTO project_notes (project_id, note_id) VALUES (1, 1);
    INSERT INTO milestone_notes (milestone_id, note_id) VALUES (1, 2);
    INSERT INTO task_notes (task_id, note_id) VALUES (1, 1);
    INSERT INTO attachments (id, original_name, filename, mimetype, size, created_at)
      VALUES (1, 'projekt.txt', 'project-file.txt', 'text/plain', 11, '2026-05-17T08:00:00');
    INSERT INTO attachments (id, original_name, filename, mimetype, size, created_at)
      VALUES (2, 'task.pdf', 'docs/task-file.pdf', 'application/pdf', 9, '2026-05-17T08:00:00');
    INSERT INTO attachments (id, original_name, filename, mimetype, size, created_at)
      VALUES (3, 'feature.txt', 'feature-file.txt', 'text/plain', 12, '2026-05-17T08:00:00');
    INSERT INTO attachments (id, original_name, filename, mimetype, size, created_at)
      VALUES (4, 'ticket.txt', 'ticket-file.txt', 'text/plain', 11, '2026-05-17T08:00:00');
    INSERT INTO attachments (id, original_name, filename, mimetype, size, created_at)
      VALUES (5, 'milestone.txt', 'milestone-file.txt', 'text/plain', 16, '2026-05-17T08:00:00');
    INSERT INTO content_images (id, mime_type, data, size, version, created_by, updated_by, created_at, updated_at)
      VALUES ('content-image-1', 'image/png', X'89504E47', 4, 1, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO events (id, title, description, start_time, end_time, is_all_day, color, reminder_minutes, created_at, updated_at)
      VALUES (1, 'Termin', NULL, '2026-05-20T08:00:00', '2026-05-20T09:00:00', 0, '#123456', 30, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO sent_notifications (id, event_id, user_id, channel, reminder_minutes, sent_at)
      VALUES (1, 1, 2, 'email', 30, '2026-05-20T07:30:00');
    INSERT INTO backlog_items (id, project_id, feature_id, use_case_id, title, description, status, sort_order, created_at, updated_at)
      VALUES (1, 1, 1, 1, 'Backlog Alpha', 'Backlog Beschreibung', 'open', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO project_features (project_id, feature_id) VALUES (1, 1);
    INSERT INTO milestone_features (milestone_id, feature_id) VALUES (1, 1);
    INSERT INTO project_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO milestone_tasks (owner_id, task_id, position) VALUES (1, 1, 2);
    INSERT INTO feature_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO use_case_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO wiki_page_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO day_plan_tasks (owner_id, task_id, position) VALUES (1, 1, 3);
    INSERT INTO project_tickets (owner_id, ticket_id, position) VALUES (1, 1, 1);
    INSERT INTO milestone_tickets (owner_id, ticket_id, position) VALUES (1, 1, 2);
    INSERT INTO wiki_page_tickets (owner_id, ticket_id, position) VALUES (1, 1, 1);
    INSERT INTO wiki_page_relations (source_wiki_page_id, target_wiki_page_id) VALUES (1, 2);
    INSERT INTO project_events (project_id, event_id) VALUES (1, 1);
    INSERT INTO milestone_events (milestone_id, event_id) VALUES (1, 1);
    INSERT INTO task_events (task_id, event_id) VALUES (1, 1);
    INSERT INTO day_plan_events (owner_id, event_id, position) VALUES (1, 1, 1);
    INSERT INTO project_comments (project_id, comment_id) VALUES (1, 3);
    INSERT INTO milestone_comments (milestone_id, comment_id) VALUES (1, 8);
    INSERT INTO task_comments (task_id, comment_id) VALUES (1, 1);
    INSERT INTO feature_comments (feature_id, comment_id) VALUES (1, 2);
    INSERT INTO use_case_comments (use_case_id, comment_id) VALUES (1, 4);
    INSERT INTO backlog_item_comments (backlog_item_id, comment_id) VALUES (1, 5);
    INSERT INTO wiki_page_comments (wiki_page_id, comment_id) VALUES (1, 6);
    INSERT INTO ticket_comments (ticket_id, comment_id) VALUES (1, 7);
    INSERT INTO project_attachments (project_id, attachment_id) VALUES (1, 1);
    INSERT INTO milestone_attachments (milestone_id, attachment_id) VALUES (1, 5);
    INSERT INTO task_attachments (task_id, attachment_id) VALUES (1, 2);
    INSERT INTO feature_attachments (feature_id, attachment_id) VALUES (1, 3);
    INSERT INTO ticket_attachments (ticket_id, attachment_id) VALUES (1, 4);
    INSERT INTO wiki_page_attachments (wiki_page_id, attachment_id) VALUES (1, 3);
  `);
}

function mutateLocalState(): void {
  testDb.sqlite.exec(`
    INSERT INTO projects (id, name, status, created_at, updated_at)
      VALUES (99, 'Mutation', 'archived', '2026-05-17T09:00:00', '2026-05-17T09:00:00');
    DELETE FROM comments WHERE id = 2;
    UPDATE projects SET name = 'Mutiert' WHERE id = 1;
  `);
  fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "mutiert", "utf8");
  fs.writeFileSync(path.join(uploadDir, "extra.txt"), "extra", "utf8");
  fs.rmSync(path.join(contentDir, "wiki", "root.md"), { force: true });
  fs.writeFileSync(
    path.join(contentDir, "features", "feature-1-alpha.md"),
    "# Mutiert",
    "utf8",
  );
}

async function zipFromEntries(
  entries: Array<{ name: string; content: Buffer | string }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = createArchive();
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
    for (const entry of entries) {
      archive.append(entry.content, { name: entry.name });
    }
    void archive.finalize();
  });
}

async function parseZipJson(
  buffer: Buffer,
  filename: string,
): Promise<Record<string, unknown>> {
  const directory = await unzipper.Open.buffer(buffer);
  const file = directory.files.find((entry) => entry.path === filename);
  if (!file) throw new Error(`${filename} missing`);
  return JSON.parse((await file.buffer()).toString("utf8")) as Record<
    string,
    unknown
  >;
}

async function zipEntryNames(buffer: Buffer): Promise<string[]> {
  const directory = await unzipper.Open.buffer(buffer);
  return directory.files
    .filter((entry) => !entry.path.endsWith("/"))
    .map((entry) => entry.path)
    .sort((a, b) => a.localeCompare(b, "en"));
}

async function replaceDumpJson(
  original: Buffer,
  data: Record<string, unknown>,
  manifest: Record<string, unknown>,
): Promise<Buffer> {
  const directory = await unzipper.Open.buffer(original);
  const entries: Array<{ name: string; content: Buffer | string }> = [];
  for (const file of directory.files.filter(
    (entry) => !entry.path.endsWith("/"),
  )) {
    if (file.path === "data.json") {
      entries.push({ name: file.path, content: JSON.stringify(data) });
    } else if (file.path === "manifest.json") {
      entries.push({ name: file.path, content: JSON.stringify(manifest) });
    } else {
      entries.push({ name: file.path, content: await file.buffer() });
    }
  }
  return zipFromEntries(entries);
}

function updateManifestTable(
  manifest: Record<string, unknown>,
  key: string,
  rows: Array<Record<string, unknown>>,
): void {
  const tables = manifest.tables as Record<
    string,
    { rowCount: number; sha256: string }
  >;
  tables[key] = {
    ...tables[key],
    rowCount: rows.length,
    sha256: sha256Json(rows),
  };
}

beforeEach(() => {
  tempRoot = path.join(vitestRuntimeRoot, "dump-local", crypto.randomUUID());
  uploadDir = path.join(tempRoot, "uploads");
  contentDir = path.join(tempRoot, "content");
  backupDir = path.join(tempRoot, "backups");
  previewDir = path.join(tempRoot, "previews");
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  config.uploadDir = uploadDir;
  config.backupWorkDir = backupDir;
  config.previewCacheDir = previewDir;
  config.databasePath = path.join(tempRoot, "taskmanager.sqlite");
  config.backupSftpEnabled = false;
  config.backupSftpHost = "";
  config.backupSftpPort = 22;
  config.backupSftpUser = "";
  config.backupSftpPassword = "";
  config.backupSftpRemoteDir = "";
  config.backupSftpProtectedConfirmed = false;
  setBackupSftpClientFactoryForTests(null);
  setContentBaseDir(contentDir);
  testDb = createFileTestDb(config.databasePath);
  seedCompleteDataset();
});

afterEach(() => {
  setBackupSftpClientFactoryForTests(null);
  testDb.sqlite.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("Dump table contract", () => {
  it("registriert alle Anwendungstabellen der aktuellen SQLite-Datenbank genau einmal", () => {
    const databaseTables = (
      testDb.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
    const registeredTables = getRegisteredDumpTables()
      .map((entry) => entry.tableName)
      .sort();

    expect(registeredTables).toEqual(databaseTables);
    expect(new Set(DUMP_TABLE_KEYS).size).toBe(DUMP_TABLE_KEYS.length);
  });
});

describe("Local backup status", () => {
  it("legt den lokalen Backup-Ordner bei Bedarf an", async () => {
    fs.rmSync(backupDir, { recursive: true, force: true });
    expect(fs.existsSync(backupDir)).toBe(false);

    const status = getLocalBackupStatus();

    expect(status.backupDirectory).toBe(backupDir);
    expect(status.ready).toBe(true);
    expect(status.fileCount).toBe(0);
    expect(status.latestFile).toBeNull();
    expect(fs.existsSync(backupDir)).toBe(true);
  });

  it("liefert den Status auch über die API", async () => {
    const app = await buildTestApp(testDb);

    const response = await supertest(app.server)
      .get("/api/dumps/local/status")
      .expect(200);

    expect(response.body).toMatchObject({
      backupDirectory: backupDir,
      ready: true,
      fileCount: 0,
      latestFile: null,
    });
    await app.close();
  });

  it("stellt Partial-Backups aus ZIP-Dateien und verifizierten lokalen Basisdateien wieder her", async () => {
    await saveDumpToLocalBackup(testDb.sqlite);
    fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "Projektdatei neu", "utf8");
    await saveDumpToLocalBackup(testDb.sqlite);
    const expected = collectSnapshot();

    testDb.sqlite
      .prepare("UPDATE projects SET name = 'Partial Mutation' WHERE id = 1")
      .run();
    fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "kaputt", "utf8");
    fs.writeFileSync(path.join(uploadDir, "extra.txt"), "extra", "utf8");
    expect(collectSnapshot()).not.toEqual(expected);

    const preview = await previewLatestLocalDump();
    expect(preview.transferReadiness).toBe("ready");
    await applyLocalDump(testDb.sqlite, {
      fileId: preview.backupFile.id,
      fileHash: preview.fileHash,
      confirmationPhrase: preview.confirmationPhrase,
    });

    expect(collectSnapshot()).toEqual(withoutContentFiles(expected));
  });

  it("blockiert Partial-Backups, wenn eine unveränderte lokale Basisdatei fehlt", async () => {
    await saveDumpToLocalBackup(testDb.sqlite);
    fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "Projektdatei neu", "utf8");
    await saveDumpToLocalBackup(testDb.sqlite);
    fs.rmSync(path.join(uploadDir, "milestone-file.txt"), { force: true });

    const preview = await previewLatestLocalDump();

    expect(preview.transferReadiness).toBe("blocked");
    expect(preview.blockingIssues.join(" ")).toContain("milestone-file.txt");
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: preview.backupFile.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow("Dump import is blocked");
  });

  it("schützt lokale Dump-Routen über Auth und Dumps-Berechtigungen", async () => {
    const originalAdminInitialPassword = config.adminInitialPassword;
    config.adminInitialPassword = "password123";
    const app = await buildTestApp(testDb, { enableAuth: true });

    try {
      await supertest(app.server).get("/api/dumps/local/status").expect(401);

      const admin = supertest.agent(app.server);
      await admin
        .post("/api/auth/login")
        .send({ email: "admin@local", password: "password123" })
        .expect(200);
      await admin.post("/api/dumps/local/save").expect(200);
      await admin.post("/api/dumps/remote/sync").expect(404);
      await admin.get("/api/dumps/remote/sync/preview").expect(404);

      const roles = await admin.get("/api/admin/roles").expect(200);
      const readerRole = roles.body.find(
        (role: { key: string }) => role.key === "reader",
      ) as { id: number };
      await admin
        .post("/api/admin/users")
        .send({
          firstName: "Dump",
          lastName: "Reader",
          email: "dump-reader@example.test",
          roleId: readerRole.id,
          password: "password123",
          isActive: true,
        })
        .expect(201);

      const reader = supertest.agent(app.server);
      await reader
        .post("/api/auth/login")
        .send({ email: "dump-reader@example.test", password: "password123" })
        .expect(200);
      await reader.get("/api/dumps/local/status").expect(200);
      await reader.get("/api/dumps/local/latest/preview").expect(200);
      await reader.get("/api/dumps/remote/sync/preview").expect(404);
      await reader.post("/api/dumps/local/save").expect(403);
      await reader.post("/api/dumps/remote/sync").expect(403);
      await reader
        .post("/api/dumps/remote/sync/apply")
        .send({ manifestHash: "abc123", confirmed: true })
        .expect(403);
    } finally {
      config.adminInitialPassword = originalAdminInitialPassword;
      await app.close();
    }
  });
});

describe("Remote SFTP backup status", () => {
  it("lädt lokal erzeugte Dump-Dateien in den konfigurierten SFTP-Ordner hoch", async () => {
    const remoteFiles = new Map<string, RemoteMockFile>();
    const metrics = configureMockSftp(remoteFiles);
    const phases: string[] = [];
    const progressEvents: BackupProgressEvent[] = [];

    const saveResult = await saveDumpToLocalBackup(testDb.sqlite, {
      progressCallback: (event) => {
        phases.push(event.phase);
        progressEvents.push(event);
      },
    });

    expect(saveResult.remoteUpload?.success).toBe(true);
    expect(saveResult.remoteUpload?.remoteFile?.name).toBe(saveResult.filename);
    expect(remoteFiles.has(saveResult.filename)).toBe(true);
    expect(fs.existsSync(saveResult.filePath)).toBe(true);
    expect(metrics.streamPutCount).toBe(1);
    expect(phases).toEqual(
      expect.arrayContaining([
        "db_export",
        "archive",
        "local_save",
        "sftp_upload",
        "done",
      ]),
    );
    const archiveEvents = progressEvents.filter(
      (event) => event.phase === "archive",
    );
    const lastArchiveEvent = archiveEvents[archiveEvents.length - 1];
    expect(archiveEvents.length).toBeGreaterThan(1);
    expect(
      archiveEvents.some(
        (event) => event.detail === "uploads/project-file.txt",
      ),
    ).toBe(true);
    expect(lastArchiveEvent?.current).toBe(lastArchiveEvent?.total);

    const status = await getRemoteBackupStatus(testDb.sqlite);
    expect(status.ready).toBe(true);
    expect(status.latestFile?.name).toBe(saveResult.filename);
  });

  it("importiert die neueste Remote-Datei und blockiert denselben Dateinamen dauerhaft", async () => {
    const remoteFiles = new Map<string, RemoteMockFile>();
    const metrics = configureMockSftp(remoteFiles);
    const before = collectSnapshot();
    const archive = await buildDumpArchive(testDb.sqlite);
    remoteFiles.set(archive.filename, {
      buffer: archive.buffer,
      modifiedAt: Date.parse("2026-05-17T09:00:00.000Z"),
    });
    mutateLocalState();

    const preview = await previewRemoteDump(testDb.sqlite);
    const applyResult = await applyRemoteDump(testDb.sqlite, {
      fileId: preview.backupFile.id,
      fileHash: preview.fileHash,
      previewToken: preview.previewToken,
      confirmed: true,
    });

    expect(applyResult.verificationPassed).toBe(true);
    expect(withoutContentFiles(withoutRemoteImportHistory(collectSnapshot()))).toEqual(withoutContentFiles(before));
    expect(metrics.getPaths).toEqual([archive.filename]);
    await expect(
      applyRemoteDump(testDb.sqlite, {
        fileId: preview.backupFile.id,
        fileHash: preview.fileHash,
        previewToken: preview.previewToken,
        confirmed: true,
      }),
    ).rejects.toThrow("already imported");

    const status = await getRemoteBackupStatus(testDb.sqlite);
    expect(status.latestFile?.imported).toBe(true);
  });
});


describe("Local dump roundtrip", () => {
  it("exportiert Benutzer inklusive Standardadmin und mit roleCode", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;

    const exportedAdmin = tables.users.find(
      (user) => user.email === "admin@local",
    );
    const exportedUser = tables.users.find(
      (user) => user.email === "ada@example.test",
    );

    expect(exportedAdmin).toMatchObject({ roleCode: "admin" });
    expect(exportedAdmin).not.toHaveProperty("role_id");
    expect(exportedUser).toMatchObject({ roleCode: "editor" });
    expect(exportedUser).not.toHaveProperty("role_id");
    expect(
      tables.appSettings.some((setting) => setting.key === "admin_setup_done"),
    ).toBe(true);
    expect(
      tables.settingsValues.some(
        (setting) => setting.scope_type === "USER" && setting.scope_id === "1",
      ),
    ).toBe(true);
  });

  it("erhält Referenzen auf den Standardadmin im Export", async () => {
    testDb.sqlite
      .prepare(
        "UPDATE projects SET created_by = 1, updated_by = 1 WHERE id = 1",
      )
      .run();
    testDb.sqlite
      .prepare("UPDATE journal_entries SET actor_user_id = 1 WHERE id = 1")
      .run();

    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const project = tables.projects.find((row) => row.id === 1);
    const journalEntry = tables.journalEntries.find((row) => row.id === 1);

    expect(project).toMatchObject({ created_by: 1, updated_by: 1 });
    expect(journalEntry).toMatchObject({ actor_user_id: 1 });
  });

  it("serialisiert Content-Image-BLOBs im JSON-Dump base64", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    const image = tables.contentImages.find((row) => row.id === "content-image-1");

    expect(image).toMatchObject({
      id: "content-image-1",
      mime_type: "image/png",
      size: 4,
      data: { __blobBase64: "iVBORw==" },
    });
  });

  it("packt beim ersten lokalen Backup alle Uploads und keine neuen Content-Dateien", async () => {
    const result = await saveDumpToLocalBackup(testDb.sqlite);
    const buffer = fs.readFileSync(result.filePath);
    const entries = await zipEntryNames(buffer);
    const manifest = await parseZipJson(buffer, "manifest.json");
    const fileRoots = manifest.fileRoots as Record<
      "uploads" | "content",
      { fileCount: number; partial?: boolean; files: Array<{ relativePath: string }> }
    >;

    expect(entries).toEqual(
      expect.arrayContaining([
        "data.json",
        "manifest.json",
        "uploads/project-file.txt",
        "uploads/docs/task-file.pdf",
      ]),
    );
    expect(entries.some((entry) => entry.startsWith("content/"))).toBe(false);
    expect(fileRoots.uploads.fileCount).toBe(5);
    expect(fileRoots.uploads.partial).toBeUndefined();
    expect(fileRoots.content.fileCount).toBe(0);
  });

  it("packt beim Folgelauf nur geänderte Uploads und manifestiert weiter alle Uploads", async () => {
    await saveDumpToLocalBackup(testDb.sqlite);
    fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "Projektdatei neu", "utf8");

    const result = await saveDumpToLocalBackup(testDb.sqlite);
    const buffer = fs.readFileSync(result.filePath);
    const entries = await zipEntryNames(buffer);
    const manifest = await parseZipJson(buffer, "manifest.json");
    const fileRoots = manifest.fileRoots as Record<
      "uploads" | "content",
      { fileCount: number; partial?: boolean; files: Array<{ relativePath: string }> }
    >;

    expect(entries).toContain("uploads/project-file.txt");
    expect(entries).not.toContain("uploads/milestone-file.txt");
    expect(entries).not.toContain("uploads/docs/task-file.pdf");
    expect(entries.some((entry) => entry.startsWith("content/"))).toBe(false);
    expect(fileRoots.uploads.fileCount).toBe(5);
    expect(fileRoots.uploads.partial).toBe(true);
    expect(fileRoots.uploads.files.map((file) => file.relativePath)).toEqual([
      "docs/task-file.pdf",
      "feature-file.txt",
      "milestone-file.txt",
      "project-file.txt",
      "ticket-file.txt",
    ]);
  });

  it("sichert und aktualisiert DB und Uploads als echten Roundtrip", async () => {
    const before = collectSnapshot();
    const app = await buildTestApp(testDb, { enableMultipart: true });
    setContentBaseDir(contentDir);

    const saveResponse = await supertest(app.server)
      .post("/api/dumps/local/save")
      .expect(200);
    expect(
      String((saveResponse.body as { filename: string }).filename),
    ).toMatch(/^taskmanager_dump_/);
    expect(
      fs.existsSync((saveResponse.body as { filePath: string }).filePath),
    ).toBe(true);
    mutateLocalState();
    expect(collectSnapshot()).not.toEqual(before);

    const previewResponse = await supertest(app.server)
      .get("/api/dumps/local/latest/preview")
      .expect(200);
    const preview = previewResponse.body as DumpBackupPreviewResult;
    expect(preview.transferReadiness).toBe("ready");

    const applyResponse = await supertest(app.server)
      .post("/api/dumps/local/latest/apply")
      .send({
        fileId: preview.backupFile.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      })
      .expect(200);
    const applyResult = applyResponse.body as DumpBackupApplyResult;

    expect(applyResult.verificationPassed).toBe(true);
    expect(collectSnapshot()).toEqual(withoutContentFiles(before));
    await app.close();
  });

  it("liest ZIP-Dateien beim Import nur einmal für Hash und Staging", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = writeBackupFile(archive.filename, archive.buffer);
    const preview = await inspectDumpArchive(archive.buffer, file);
    const bufferCalls = new Map<string, number>();
    const phases: string[] = [];
    const originalOpenBuffer = unzipper.Open.buffer.bind(unzipper.Open);
    const openBufferSpy = vi
      .spyOn(unzipper.Open, "buffer")
      .mockImplementation(async (buffer: Buffer) => {
        const directory = await originalOpenBuffer(buffer);
        for (const entry of directory.files.filter(
          (item) =>
            (item.path.startsWith("uploads/") ||
              item.path.startsWith("content/")) &&
            !item.path.endsWith("/"),
        )) {
          const originalBuffer = entry.buffer.bind(entry);
          entry.buffer = async () => {
            bufferCalls.set(entry.path, (bufferCalls.get(entry.path) ?? 0) + 1);
            return originalBuffer();
          };
        }
        return directory;
      });

    try {
      const applyResult = await applyLocalDump(
        testDb.sqlite,
        {
          fileId: file.id,
          fileHash: preview.fileHash,
          confirmationPhrase: preview.confirmationPhrase,
        },
        {
          progressCallback: (event) => {
            phases.push(event.phase);
          },
        },
      );

      expect(applyResult.verificationPassed).toBe(true);
      expect(phases).toEqual(
        expect.arrayContaining([
          "staging",
          "db_restore",
          "file_swap",
          "verify",
          "done",
        ]),
      );
      expect(bufferCalls.size).toBeGreaterThan(0);
      expect([...bufferCalls.values()].every((count) => count === 1)).toBe(
        true,
      );
    } finally {
      openBufferSpy.mockRestore();
    }
  });

  it("stellt Standardadmin, Setup-Status und Admin-Einstellungen aus dem Dump wieder her", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = writeBackupFile(archive.filename, archive.buffer);
    const preview = await inspectDumpArchive(archive.buffer, file);
    testDb.sqlite
      .prepare(
        "UPDATE users SET first_name = 'Local', last_name = 'Owner', password_hash = 'target-only-hash', is_active = 0 WHERE email = 'admin@local'",
      )
      .run();
    testDb.sqlite
      .prepare(
        "UPDATE app_settings SET value = 'false' WHERE key = 'admin_setup_done'",
      )
      .run();
    testDb.sqlite
      .prepare(
        "UPDATE settings_values SET value_json = '\"local-kanban\"' WHERE scope_type = 'USER' AND scope_id = '1'",
      )
      .run();

    const applyResult = await applyLocalDump(testDb.sqlite, {
      fileId: file.id,
      fileHash: preview.fileHash,
      confirmationPhrase: preview.confirmationPhrase,
    });
    const admin = testDb.sqlite
      .prepare(
        "SELECT first_name, last_name, password_hash, is_active FROM users WHERE email = 'admin@local'",
      )
      .get() as {
      first_name: string;
      last_name: string;
      password_hash: string;
      is_active: number;
    };
    const setup = testDb.sqlite
      .prepare("SELECT value FROM app_settings WHERE key = 'admin_setup_done'")
      .get() as { value: string };
    const adminSetting = testDb.sqlite
      .prepare(
        "SELECT value_json FROM settings_values WHERE scope_type = 'USER' AND scope_id = '1'",
      )
      .get() as { value_json: string };

    expect(applyResult.verificationPassed).toBe(true);
    expect(admin).toEqual({
      first_name: "Test",
      last_name: "Admin",
      password_hash:
        "$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q",
      is_active: 1,
    });
    expect(setup.value).toBe("true");
    expect(adminSetting.value_json).toBe('"kanban"');
  });

  it("setzt bei alten Dumps ohne Standardadmin den lokalen Admin für fehlende Admin-Referenzen ein", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    data.formatVersion = 10;
    manifest.formatVersion = 10;
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    tables.users = [];
    tables.dayPlans = tables.dayPlans.map((dayPlan) =>
      dayPlan.id === 1
        ? { ...dayPlan, user_id: 2, created_by: 2, updated_by: 2 }
        : dayPlan,
    );
    updateManifestTable(manifest, "users", tables.users);
    updateManifestTable(manifest, "dayPlans", tables.dayPlans);
    const legacyArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, legacyArchive);
    const preview = await inspectDumpArchive(legacyArchive, file);
    testDb.sqlite
      .prepare(
        "UPDATE users SET first_name = 'Local', last_name = 'Fallback', password_hash = 'local-fallback-hash' WHERE id = 1",
      )
      .run();
    mutateLocalState();

    const applyResult = await applyLocalDump(testDb.sqlite, {
      fileId: file.id,
      fileHash: preview.fileHash,
      confirmationPhrase: preview.confirmationPhrase,
    });
    const admin = testDb.sqlite
      .prepare(
        "SELECT id, first_name, last_name, password_hash FROM users WHERE email = 'admin@local'",
      )
      .get() as {
      id: number;
      first_name: string;
      last_name: string;
      password_hash: string;
    };
    const dayPlan = testDb.sqlite
      .prepare("SELECT user_id, created_by, updated_by FROM day_plans WHERE id = 1")
      .get() as { user_id: number; created_by: number; updated_by: number };

    expect(applyResult.verificationPassed).toBe(true);
    expect(admin).toEqual({
      id: 1,
      first_name: "Local",
      last_name: "Fallback",
      password_hash: "local-fallback-hash",
    });
    expect(dayPlan).toEqual({ user_id: 1, created_by: 1, updated_by: 1 });
    expect(testDb.sqlite.pragma("foreign_key_check") as unknown[]).toEqual([]);
  });

  it("importiert bestehende rohe User-Dumps mit role_id weiterhin", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    data.formatVersion = 8;
    manifest.formatVersion = 8;
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    tables.users = tables.users.map((user) => {
      const nextUser = { ...user, role_id: 2 };
      delete nextUser.roleCode;
      return nextUser;
    });
    const manifestTables = manifest.tables as Record<
      string,
      { rowCount: number; sha256: string }
    >;
    manifestTables.users = {
      ...manifestTables.users,
      sha256: sha256Json(tables.users),
    };
    const legacyArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, legacyArchive);
    const preview = await inspectDumpArchive(legacyArchive, file);
    mutateLocalState();

    const applyResult = await applyLocalDump(testDb.sqlite, {
      fileId: file.id,
      fileHash: preview.fileHash,
      confirmationPhrase: preview.confirmationPhrase,
    });

    expect(preview.transferReadiness).toBe("ready");
    expect(applyResult.verificationPassed).toBe(true);
    expect(
      testDb.sqlite
        .prepare("SELECT role_id FROM users WHERE email = 'ada@example.test'")
        .get(),
    ).toEqual({ role_id: 2 });
  });

  it("überspringt neuere defekte lokale Dateien und nutzt die neueste valide Sicherung", async () => {
    const validArchive = await buildDumpArchive(testDb.sqlite);
    const validFile = writeBackupFile(
      "taskmanager_dump_valid.zip",
      validArchive.buffer,
      new Date("2026-05-17T08:00:00.000Z"),
    );
    writeBackupFile(
      "taskmanager_dump_broken.zip",
      Buffer.from("broken"),
      new Date("2026-05-17T09:00:00.000Z"),
    );

    const preview = await previewLatestLocalDump();

    expect(preview.backupFile.id).toBe(validFile.id);
    expect(preview.warnings.some((warning) => warning.includes("broken"))).toBe(
      true,
    );
  });
});

describe("Dump import failure safety", () => {
  it("blockiert Hash-Mismatch und falsche Sicherheitsphrase ohne lokale Änderung", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = writeBackupFile(archive.filename, archive.buffer);
    const before = collectSnapshot();
    const preview = await inspectDumpArchive(archive.buffer, file);

    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: `${preview.fileHash}x`,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: "falsch",
      }),
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });

  it("blockiert Manifest-Mismatch ohne lokale Änderung", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const manifestTables = manifest.tables as Record<
      string,
      { rowCount: number; sha256: string }
    >;
    manifestTables.projects = {
      ...manifestTables.projects,
      rowCount: manifestTables.projects.rowCount + 1,
    };
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, badArchive);
    const before = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("blocked");
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });

  it("blockiert User-Dumps mit unbekanntem roleCode ohne lokale Änderung", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    tables.users[0] = { ...tables.users[0], roleCode: "missing-role" };
    const manifestTables = manifest.tables as Record<
      string,
      { rowCount: number; sha256: string }
    >;
    manifestTables.users = {
      ...manifestTables.users,
      sha256: sha256Json(tables.users),
    };
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, badArchive);
    const before = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("blocked");
    expect(
      preview.blockingIssues.some((issue) => issue.includes("unknown role")),
    ).toBe(true);
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });

  it("blockiert fehlende Nicht-Admin-User-Referenzen und rollt vollständig zurück", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    tables.users = tables.users.filter(
      (user) => user.email !== "ada@example.test",
    );
    updateManifestTable(manifest, "users", tables.users);
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, badArchive);
    const before = collectSnapshot();
    mutateLocalState();
    const mutated = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("ready");
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow("Dump import is missing referenced users.id values");

    expect(collectSnapshot()).toEqual(mutated);
    expect(collectSnapshot()).not.toEqual(before);
    expect(testDb.sqlite.pragma("foreign_key_check") as unknown[]).toEqual([]);
  });

  it("rollt ungültige Fremdschlüssel vollständig zurück", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const tables = data.tables as Record<
      string,
      Array<Record<string, unknown>>
    >;
    tables.projectTasks[0] = { ...tables.projectTasks[0], owner_id: 9999 };
    const manifestTables = manifest.tables as Record<
      string,
      { rowCount: number; sha256: string }
    >;
    manifestTables.projectTasks = {
      ...manifestTables.projectTasks,
      sha256: sha256Json(tables.projectTasks),
    };
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, badArchive);
    const before = collectSnapshot();
    mutateLocalState();
    const mutated = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("ready");
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase,
      }),
    ).rejects.toThrow();

    expect(collectSnapshot()).toEqual(mutated);
    expect(collectSnapshot()).not.toEqual(before);
    expect(testDb.sqlite.pragma("foreign_key_check") as unknown[]).toEqual([]);
  });

  it("stellt Dateisystem und DB nach Fehler während des Dateitauschs wieder her", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = writeBackupFile(archive.filename, archive.buffer);
    const before = collectSnapshot();
    mutateLocalState();
    const mutated = collectSnapshot();
    const preview = await inspectDumpArchive(archive.buffer, file);

    await expect(
      applyLocalDump(
        testDb.sqlite,
        {
          fileId: file.id,
          fileHash: preview.fileHash,
          confirmationPhrase: preview.confirmationPhrase,
        },
        {
          afterFileSwap: () => {
            throw new Error("Simulierter Dateitauschfehler");
          },
        },
      ),
    ).rejects.toThrow("Simulierter Dateitauschfehler");

    expect(collectSnapshot()).toEqual(mutated);
    expect(collectSnapshot()).not.toEqual(before);
  });

  it("verändert bei unsicheren Dateinamen und kaputten ZIPs keine lokalen Daten", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = writeBackupFile(archive.filename, archive.buffer);
    const before = collectSnapshot();

    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: `../${file.id}`,
        fileHash: "irrelevant",
        confirmationPhrase: "irrelevant",
      }),
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    fs.rmSync(path.join(backupDir, file.id), { force: true });
    writeBackupFile(
      "taskmanager_dump_broken.zip",
      await zipFromEntries([{ name: "readme.txt", content: "missing data" }]),
    );
    await expect(previewLatestLocalDump()).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });
});
