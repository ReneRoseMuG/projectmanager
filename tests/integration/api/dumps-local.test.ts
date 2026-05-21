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
import type { DumpBackupApplyResult, DumpBackupFile, DumpBackupPreviewResult } from "@taskmanager/shared-types";
import * as archiverPackage from "archiver";
import type { Archiver } from "archiver";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import supertest from "supertest";
import unzipper from "unzipper";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vitestRuntimeRoot } from "../../../apps/api/src/runtime-safety.js";
import { config } from "../../../apps/api/src/config.js";
import {
  applyLocalDump,
  buildDumpArchive,
  DUMP_TABLE_KEYS,
  getRegisteredDumpTables,
  getLocalBackupStatus,
  inspectDumpArchive,
  previewLatestLocalDump
} from "../../../apps/api/src/services/dump.service.js";
import { setContentBaseDir } from "../../../apps/api/src/services/content.service.js";
import { buildTestApp } from "../../fixtures/api/app.js";
import { createFileTestDb, type TestDb } from "../../fixtures/api/db.js";

const ZipArchive = (archiverPackage as unknown as {
  ZipArchive: new (options: { zlib: { level: number } }) => Archiver;
}).ZipArchive;

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

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
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
        result[path.relative(rootDir, targetPath).replace(/\\/g, "/")] = sha256Buffer(fs.readFileSync(targetPath));
      }
    }
  };
  walk(rootDir);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")));
}

function writeBackupFile(filename: string, buffer: Buffer, modifiedAt = new Date()): DumpBackupFile {
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
    sizeBytes: buffer.byteLength
  };
}

function collectSnapshot(): Snapshot {
  const tables: Snapshot["tables"] = {};
  for (const entry of getRegisteredDumpTables()) {
    tables[entry.key] = testDb.sqlite.prepare(`SELECT * FROM ${quoteIdentifier(entry.tableName)} ORDER BY rowid`).all() as Array<Record<string, unknown>>;
  }
  return {
    tables,
    uploads: listFileHashes(uploadDir),
    content: listFileHashes(contentDir),
    foreignKeyErrors: testDb.sqlite.pragma("foreign_key_check") as unknown[]
  };
}

function seedCompleteDataset(): void {
  fs.mkdirSync(path.join(uploadDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "features"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "usecases"), { recursive: true });
  fs.mkdirSync(path.join(contentDir, "wiki"), { recursive: true });
  fs.writeFileSync(path.join(uploadDir, "project-file.txt"), "Projektdatei", "utf8");
  fs.writeFileSync(path.join(uploadDir, "milestone-file.txt"), "Meilensteindatei", "utf8");
  fs.writeFileSync(path.join(uploadDir, "docs", "task-file.pdf"), "Taskdatei", "utf8");
  fs.writeFileSync(path.join(uploadDir, "feature-file.txt"), "Featuredatei", "utf8");
  fs.writeFileSync(path.join(uploadDir, "ticket-file.txt"), "Ticketdatei", "utf8");
  fs.writeFileSync(path.join(contentDir, "features", "feature-1-alpha.md"), "# Feature Alpha", "utf8");
  fs.writeFileSync(path.join(contentDir, "usecases", "usecase-1-alpha.md"), "# Use Case Alpha", "utf8");
  fs.writeFileSync(path.join(contentDir, "wiki", "root.md"), "# Wiki Root", "utf8");

  testDb.sqlite.exec(`
    INSERT INTO users (id, name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at)
      VALUES (1, '', 'Ada', 'Lovelace', 'ada@example.test', NULL, 1, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO settings_values (id, setting_key, scope_type, scope_id, value_json, version, created_by, updated_by, created_at, updated_at)
      VALUES (1, 'taskBoard.viewMode', 'USER', '1', '"kanban"', 1, 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO projects (id, name, description, status, color, start_date, due_date, created_at, updated_at)
      VALUES (1, 'Projekt Alpha', 'Beschreibung', 'active', '#123456', '2026-05-01', '2026-05-31', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO milestones (id, project_id, name, description, status, color, start_date, due_date, created_at, updated_at)
      VALUES (1, 1, 'Meilenstein Alpha', 'Meilenstein Beschreibung', 'active', '#654321', '2026-05-10', '2026-05-15', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tags (id, name, color) VALUES (1, 'Wichtig', '#ff0000');
    INSERT INTO notes (id, title, content_json, created_at, updated_at)
      VALUES (1, 'Notiz', '{"type":"doc"}', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO notes (id, title, content_json, created_at, updated_at)
      VALUES (2, 'Meilenstein-Notiz', '{"type":"doc","content":[]}', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO features (id, title, slug, status, description, content_path, sort_order, created_at, updated_at)
      VALUES (1, 'Feature Alpha', 'feature-alpha', 'active', 'Feature Beschreibung', 'content/features/feature-1-alpha.md', 10, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, parent_id, title, description, status, priority, assignee, due_date, import_key, created_at, updated_at)
      VALUES (1, NULL, 'Task Alpha', 'Task Beschreibung', 'todo', 'high', 'Ada', '2026-05-20', 'task-alpha', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, parent_id, title, description, status, priority, assignee, due_date, import_key, created_at, updated_at)
      VALUES (2, 1, 'Subtask Alpha', NULL, 'in_progress', 'medium', NULL, NULL, 'subtask-alpha', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tickets (id, type, title, description, status, priority, position, created_at, updated_at)
      VALUES (1, 'bug', 'Ticket Alpha', 'Ticket Beschreibung', 'open', 'high', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO use_cases (id, feature_id, title, slug, status, description, content_path, sort_order, created_at, updated_at)
      VALUES (1, 1, 'Use Case Alpha', 'use-case-alpha', 'active', 'UC Beschreibung', 'content/usecases/usecase-1-alpha.md', 20, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO wiki_pages (id, parent_id, project_id, title, slug, content_path, sort_order, created_at, updated_at)
      VALUES (1, NULL, 1, 'Wiki Root', 'root', 'content/wiki/root.md', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
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
    INSERT INTO events (id, title, description, start_time, end_time, is_all_day, color, created_at, updated_at)
      VALUES (1, 'Termin', NULL, '2026-05-20T08:00:00', '2026-05-20T09:00:00', 0, '#123456', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO backlog_items (id, project_id, feature_id, use_case_id, title, description, status, sort_order, created_at, updated_at)
      VALUES (1, 1, 1, 1, 'Backlog Alpha', 'Backlog Beschreibung', 'open', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO project_features (project_id, feature_id) VALUES (1, 1);
    INSERT INTO milestone_features (milestone_id, feature_id) VALUES (1, 1);
    INSERT INTO project_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO milestone_tasks (owner_id, task_id, position) VALUES (1, 1, 2);
    INSERT INTO feature_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO use_case_tasks (owner_id, task_id, position) VALUES (1, 1, 1);
    INSERT INTO project_tickets (owner_id, ticket_id, position) VALUES (1, 1, 1);
    INSERT INTO milestone_tickets (owner_id, ticket_id, position) VALUES (1, 1, 2);
    INSERT INTO project_events (project_id, event_id) VALUES (1, 1);
    INSERT INTO milestone_events (milestone_id, event_id) VALUES (1, 1);
    INSERT INTO task_events (task_id, event_id) VALUES (1, 1);
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
  fs.writeFileSync(path.join(contentDir, "features", "feature-1-alpha.md"), "# Mutiert", "utf8");
}

async function zipFromEntries(entries: Array<{ name: string; content: Buffer | string }>): Promise<Buffer> {
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

async function parseZipJson(buffer: Buffer, filename: string): Promise<Record<string, unknown>> {
  const directory = await unzipper.Open.buffer(buffer);
  const file = directory.files.find((entry) => entry.path === filename);
  if (!file) throw new Error(`${filename} missing`);
  return JSON.parse((await file.buffer()).toString("utf8")) as Record<string, unknown>;
}

async function replaceDumpJson(original: Buffer, data: Record<string, unknown>, manifest: Record<string, unknown>): Promise<Buffer> {
  const directory = await unzipper.Open.buffer(original);
  const entries: Array<{ name: string; content: Buffer | string }> = [];
  for (const file of directory.files.filter((entry) => !entry.path.endsWith("/"))) {
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
  setContentBaseDir(contentDir);
  testDb = createFileTestDb(config.databasePath);
  seedCompleteDataset();
});

afterEach(() => {
  testDb.sqlite.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("Dump table contract", () => {
  it("registriert alle Anwendungstabellen der aktuellen SQLite-Datenbank genau einmal", () => {
    const databaseTables = (testDb.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations' ORDER BY name")
      .all() as Array<{ name: string }>).map((row) => row.name);
    const registeredTables = getRegisteredDumpTables().map((entry) => entry.tableName).sort();

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

    const response = await supertest(app.server).get("/api/dumps/local/status").expect(200);

    expect(response.body).toMatchObject({
      backupDirectory: backupDir,
      ready: true,
      fileCount: 0,
      latestFile: null
    });
    await app.close();
  });

  it("schützt lokale Dump-Routen über Auth und Dumps-Berechtigungen", async () => {
    const originalAdminInitialPassword = config.adminInitialPassword;
    config.adminInitialPassword = "password123";
    const app = await buildTestApp(testDb, { enableAuth: true });

    try {
      await supertest(app.server).get("/api/dumps/local/status").expect(401);

      const admin = supertest.agent(app.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      await admin.post("/api/dumps/local/save").expect(200);

      const roles = await admin.get("/api/admin/roles").expect(200);
      const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
      await admin
        .post("/api/admin/users")
        .send({ firstName: "Dump", lastName: "Reader", email: "dump-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
        .expect(201);

      const reader = supertest.agent(app.server);
      await reader.post("/api/auth/login").send({ email: "dump-reader@example.test", password: "password123" }).expect(200);
      await reader.get("/api/dumps/local/status").expect(200);
      await reader.get("/api/dumps/local/latest/preview").expect(200);
      await reader.post("/api/dumps/local/save").expect(403);
    } finally {
      config.adminInitialPassword = originalAdminInitialPassword;
      await app.close();
    }
  });
});

describe("Local dump roundtrip", () => {
  it("sichert und aktualisiert DB, uploads und content als echten Roundtrip", async () => {
    const before = collectSnapshot();
    const app = await buildTestApp(testDb, { enableMultipart: true });
    setContentBaseDir(contentDir);

    const saveResponse = await supertest(app.server).post("/api/dumps/local/save").expect(200);
    expect(String((saveResponse.body as { filename: string }).filename)).toMatch(/^taskmanager_dump_/);
    expect(fs.existsSync((saveResponse.body as { filePath: string }).filePath)).toBe(true);
    mutateLocalState();
    expect(collectSnapshot()).not.toEqual(before);

    const previewResponse = await supertest(app.server).get("/api/dumps/local/latest/preview").expect(200);
    const preview = previewResponse.body as DumpBackupPreviewResult;
    expect(preview.transferReadiness).toBe("ready");

    const applyResponse = await supertest(app.server)
      .post("/api/dumps/local/latest/apply")
      .send({
        fileId: preview.backupFile.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase
      })
      .expect(200);
    const applyResult = applyResponse.body as DumpBackupApplyResult;

    expect(applyResult.verificationPassed).toBe(true);
    expect(collectSnapshot()).toEqual(before);
    await app.close();
  });

  it("überspringt neuere defekte lokale Dateien und nutzt die neueste valide Sicherung", async () => {
    const validArchive = await buildDumpArchive(testDb.sqlite);
    const validFile = writeBackupFile("taskmanager_dump_valid.zip", validArchive.buffer, new Date("2026-05-17T08:00:00.000Z"));
    writeBackupFile("taskmanager_dump_broken.zip", Buffer.from("broken"), new Date("2026-05-17T09:00:00.000Z"));

    const preview = await previewLatestLocalDump();

    expect(preview.backupFile.id).toBe(validFile.id);
    expect(preview.warnings.some((warning) => warning.includes("broken"))).toBe(true);
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
        confirmationPhrase: preview.confirmationPhrase
      })
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: "falsch"
      })
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });

  it("blockiert Manifest-Mismatch ohne lokale Änderung", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const manifestTables = manifest.tables as Record<string, { rowCount: number; sha256: string }>;
    manifestTables.projects = { ...manifestTables.projects, rowCount: manifestTables.projects.rowCount + 1 };
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = writeBackupFile(archive.filename, badArchive);
    const before = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("blocked");
    await expect(
      applyLocalDump(testDb.sqlite, {
        fileId: file.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase
      })
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });

  it("rollt ungültige Fremdschlüssel vollständig zurück", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const data = await parseZipJson(archive.buffer, "data.json");
    const manifest = await parseZipJson(archive.buffer, "manifest.json");
    const tables = data.tables as Record<string, Array<Record<string, unknown>>>;
    tables.projectTasks[0] = { ...tables.projectTasks[0], owner_id: 9999 };
    const manifestTables = manifest.tables as Record<string, { rowCount: number; sha256: string }>;
    manifestTables.projectTasks = {
      ...manifestTables.projectTasks,
      sha256: sha256Json(tables.projectTasks)
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
        confirmationPhrase: preview.confirmationPhrase
      })
    ).rejects.toThrow();

    expect(collectSnapshot()).toEqual(mutated);
    expect(collectSnapshot()).not.toEqual(before);
    expect((testDb.sqlite.pragma("foreign_key_check") as unknown[])).toEqual([]);
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
          confirmationPhrase: preview.confirmationPhrase
        },
        {
          afterFileSwap: () => {
            throw new Error("Simulierter Dateitauschfehler");
          }
        }
      )
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
        confirmationPhrase: "irrelevant"
      })
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    fs.rmSync(path.join(backupDir, file.id), { force: true });
    writeBackupFile("taskmanager_dump_broken.zip", await zipFromEntries([{ name: "readme.txt", content: "missing data" }]));
    await expect(previewLatestLocalDump()).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });
});
