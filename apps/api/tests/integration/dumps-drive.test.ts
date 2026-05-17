/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Google-Drive-Sicherung erzeugt ein vollständiges Dump-ZIP mit DB, uploads/ und content/.
 * - Aktualisieren findet die neueste valide Drive-Sicherung und stellt DB + Dateisystem wieder her.
 * - Der Tabellenvertrag deckt alle Anwendungstabellen der aktuellen SQLite-Migration ab.
 * - Fehlerfälle blockieren den Import oder rollen ihn zurück, ohne beschädigte Teildaten zu hinterlassen.
 *
 * Fehlerfälle:
 * - Korrupte ZIPs, fehlende data.json, falsche Sicherheitsphrase, Hash-Mismatch, Manifest-Mismatch.
 * - Ungültige Fremdschlüssel im Dump, Drive-Downloadfehler, Fehler nach Dateisystem-Swap.
 *
 * Ziel:
 * Nachweis eines echten Roundtrips gegen temporäre SQLite-Datei und temporäre Datei-Verzeichnisse
 * sowie Absicherung der fehlertoleranten, aber konsistenzerhaltenden Importlogik.
 */
import type { DumpDriveApplyResult, DumpDriveConfig, DumpDriveFile, DumpDrivePreviewResult } from "@taskmanager/shared-types";
import * as archiverPackage from "archiver";
import type { Archiver } from "archiver";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import unzipper from "unzipper";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../src/config.js";
import {
  applyDriveDump,
  buildDumpArchive,
  DUMP_TABLE_KEYS,
  getRegisteredDumpTables,
  inspectDumpArchive,
  previewLatestDriveDump
} from "../../src/services/dump.service.js";
import { setContentBaseDir } from "../../src/services/content.service.js";
import type { GoogleDriveBackupClient } from "../../src/services/google-drive.service.js";
import { buildTestApp } from "../helpers/app.js";
import { createFileTestDb, type TestDb } from "../helpers/db.js";

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

class FakeDriveClient implements GoogleDriveBackupClient {
  private files: Array<{ meta: DumpDriveFile; buffer: Buffer }> = [];
  private counter = 0;
  public failDownloadFor = new Set<string>();

  addFile(name: string, buffer: Buffer, createdTime = new Date(Date.now() + this.counter * 1000).toISOString()): DumpDriveFile {
    this.counter += 1;
    const meta: DumpDriveFile = {
      id: `drive-file-${this.counter}`,
      name,
      createdTime,
      modifiedTime: createdTime,
      sizeBytes: buffer.byteLength
    };
    this.files.push({ meta, buffer });
    return meta;
  }

  replaceFile(id: string, buffer: Buffer): void {
    const item = this.files.find((file) => file.meta.id === id);
    if (!item) throw new Error(`Unknown fake file ${id}`);
    item.buffer = buffer;
    item.meta.sizeBytes = buffer.byteLength;
  }

  async listDumpFiles(): Promise<DumpDriveFile[]> {
    return this.files
      .map((file) => file.meta)
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  }

  async uploadDump(filename: string, content: Buffer): Promise<DumpDriveFile> {
    return this.addFile(filename, Buffer.from(content));
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    if (this.failDownloadFor.has(fileId)) {
      throw new Error("Fake Drive download failed");
    }
    const item = this.files.find((file) => file.meta.id === fileId);
    if (!item) throw new Error(`Unknown fake file ${fileId}`);
    return Buffer.from(item.buffer);
  }
}

let tempRoot: string;
let uploadDir: string;
let contentDir: string;
let backupDir: string;
let previewDir: string;
let testDb: TestDb;
let driveClient: FakeDriveClient;
const originalGoogleConfig = {
  googleDriveBackupFolderId: config.googleDriveBackupFolderId,
  googleDriveClientId: config.googleDriveClientId,
  googleDriveClientSecret: config.googleDriveClientSecret,
  googleDriveRefreshToken: config.googleDriveRefreshToken
};

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
  fs.writeFileSync(path.join(uploadDir, "docs", "task-file.pdf"), "Taskdatei", "utf8");
  fs.writeFileSync(path.join(contentDir, "features", "feature-1-alpha.md"), "# Feature Alpha", "utf8");
  fs.writeFileSync(path.join(contentDir, "usecases", "usecase-1-alpha.md"), "# Use Case Alpha", "utf8");
  fs.writeFileSync(path.join(contentDir, "wiki", "root.md"), "# Wiki Root", "utf8");

  testDb.sqlite.exec(`
    INSERT INTO app_settings (key, value, updated_at)
      VALUES ('googleDriveBackupFolderId', 'drive-folder-seeded', '2026-05-17T08:00:00');
    INSERT INTO projects (id, name, description, status, color, start_date, due_date, created_at, updated_at)
      VALUES (1, 'Projekt Alpha', 'Beschreibung', 'active', '#123456', '2026-05-01', '2026-05-31', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tags (id, name, color) VALUES (1, 'Wichtig', '#ff0000');
    INSERT INTO notes (id, title, content_json, created_at, updated_at)
      VALUES (1, 'Notiz', '{"type":"doc"}', '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO features (id, title, slug, status, description, content_path, sort_order, created_at, updated_at)
      VALUES (1, 'Feature Alpha', 'feature-alpha', 'active', 'Feature Beschreibung', 'content/features/feature-1-alpha.md', 10, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee, due_date, import_key, position, created_at, updated_at)
      VALUES (1, 1, NULL, 'Task Alpha', 'Task Beschreibung', 'todo', 'high', 'Ada', '2026-05-20', 'task-alpha', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, assignee, due_date, import_key, position, created_at, updated_at)
      VALUES (2, 1, 1, 'Subtask Alpha', NULL, 'in_progress', 'medium', NULL, NULL, 'subtask-alpha', 2, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO use_cases (id, feature_id, title, slug, status, description, content_path, sort_order, created_at, updated_at)
      VALUES (1, 1, 'Use Case Alpha', 'use-case-alpha', 'active', 'UC Beschreibung', 'content/usecases/usecase-1-alpha.md', 20, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO wiki_pages (id, parent_id, project_id, title, slug, content_path, sort_order, created_at, updated_at)
      VALUES (1, NULL, 1, 'Wiki Root', 'root', 'content/wiki/root.md', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO comments (id, task_id, entity_type, entity_id, body, created_at)
      VALUES (1, 1, 'task', 1, 'Task Kommentar', '2026-05-17T08:00:00');
    INSERT INTO comments (id, task_id, entity_type, entity_id, body, created_at)
      VALUES (2, NULL, 'feature', 1, 'Feature Kommentar', '2026-05-17T08:00:00');
    INSERT INTO project_tags (project_id, tag_id) VALUES (1, 1);
    INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1);
    INSERT INTO project_notes (project_id, note_id) VALUES (1, 1);
    INSERT INTO task_notes (task_id, note_id) VALUES (1, 1);
    INSERT INTO attachments (id, project_id, task_id, original_name, filename, mimetype, size, created_at)
      VALUES (1, 1, NULL, 'projekt.txt', 'project-file.txt', 'text/plain', 11, '2026-05-17T08:00:00');
    INSERT INTO attachments (id, project_id, task_id, original_name, filename, mimetype, size, created_at)
      VALUES (2, NULL, 1, 'task.pdf', 'docs/task-file.pdf', 'application/pdf', 9, '2026-05-17T08:00:00');
    INSERT INTO events (id, title, description, start_time, end_time, is_all_day, color, project_id, task_id, created_at, updated_at)
      VALUES (1, 'Termin', NULL, '2026-05-20T08:00:00', '2026-05-20T09:00:00', 0, '#123456', 1, 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO backlog_items (id, project_id, feature_id, use_case_id, title, description, status, priority, sort_order, created_at, updated_at)
      VALUES (1, 1, 1, 1, 'Backlog Alpha', 'Backlog Beschreibung', 'open', 'urgent', 1, '2026-05-17T08:00:00', '2026-05-17T08:00:00');
    INSERT INTO project_features (project_id, feature_id) VALUES (1, 1);
    INSERT INTO task_features (task_id, feature_id) VALUES (1, 1);
    INSERT INTO task_use_cases (task_id, use_case_id) VALUES (1, 1);
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
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-dump-drive-"));
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
  config.googleDriveBackupFolderId = null;
  config.googleDriveClientId = "test-client-id";
  config.googleDriveClientSecret = "test-client-secret";
  config.googleDriveRefreshToken = "test-refresh-token";
  setContentBaseDir(contentDir);
  testDb = createFileTestDb(config.databasePath);
  driveClient = new FakeDriveClient();
  seedCompleteDataset();
});

afterEach(() => {
  testDb.sqlite.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
  config.googleDriveBackupFolderId = originalGoogleConfig.googleDriveBackupFolderId;
  config.googleDriveClientId = originalGoogleConfig.googleDriveClientId;
  config.googleDriveClientSecret = originalGoogleConfig.googleDriveClientSecret;
  config.googleDriveRefreshToken = originalGoogleConfig.googleDriveRefreshToken;
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

describe("Google Drive backup config", () => {
  it("speichert eine kopierte Google-Drive-Ordner-URL als normalisierte Folder-ID", async () => {
    const app = await buildTestApp(testDb, { driveClient });

    const response = await supertest(app.server)
      .put("/api/dumps/drive/config")
      .send({ folderInput: "https://drive.google.com/drive/folders/drive-folder-123_ABC?usp=sharing" })
      .expect(200);
    const updated = response.body as DumpDriveConfig;

    expect(updated.folderId).toBe("drive-folder-123_ABC");
    expect(updated.folderUrl).toBe("https://drive.google.com/drive/folders/drive-folder-123_ABC");
    expect(updated.source).toBe("database");
    expect(updated.ready).toBe(true);
    expect(testDb.sqlite.prepare("SELECT value FROM app_settings WHERE key = ?").get("googleDriveBackupFolderId")).toEqual({
      value: "drive-folder-123_ABC"
    });

    const loaded = (await supertest(app.server).get("/api/dumps/drive/config").expect(200)).body as DumpDriveConfig;
    expect(loaded.folderId).toBe("drive-folder-123_ABC");
    await app.close();
  });

  it("weist ungültige Ordner-Eingaben zurück und lässt die gespeicherte ID unverändert", async () => {
    const app = await buildTestApp(testDb, { driveClient });
    const before = testDb.sqlite.prepare("SELECT value FROM app_settings WHERE key = ?").get("googleDriveBackupFolderId");

    await supertest(app.server).put("/api/dumps/drive/config").send({ folderInput: "C:\\Backup\\Google Drive" }).expect(400);

    expect(testDb.sqlite.prepare("SELECT value FROM app_settings WHERE key = ?").get("googleDriveBackupFolderId")).toEqual(before);
    await app.close();
  });
});

describe("Google Drive dump roundtrip", () => {
  it("sichert und aktualisiert DB, uploads und content als echten Roundtrip", async () => {
    const before = collectSnapshot();
    const app = await buildTestApp(testDb, { enableMultipart: true, driveClient });

    const saveResponse = await supertest(app.server).post("/api/dumps/drive/save").expect(200);
    expect(String((saveResponse.body as { filename: string }).filename)).toMatch(/^taskmanager_dump_/);
    mutateLocalState();
    expect(collectSnapshot()).not.toEqual(before);

    const previewResponse = await supertest(app.server).post("/api/dumps/drive/latest/preview").expect(200);
    const preview = previewResponse.body as DumpDrivePreviewResult;
    expect(preview.transferReadiness).toBe("ready");

    const applyResponse = await supertest(app.server)
      .post("/api/dumps/drive/latest/apply")
      .send({
        fileId: preview.driveFile.id,
        fileHash: preview.fileHash,
        confirmationPhrase: preview.confirmationPhrase
      })
      .expect(200);
    const applyResult = applyResponse.body as DumpDriveApplyResult;

    expect(applyResult.verificationPassed).toBe(true);
    expect(collectSnapshot()).toEqual(before);
    await app.close();
  });

  it("überspringt neuere defekte Drive-Dateien und nutzt die neueste valide Sicherung", async () => {
    const validArchive = await buildDumpArchive(testDb.sqlite);
    const validFile = driveClient.addFile("taskmanager_dump_valid.zip", validArchive.buffer, "2026-05-17T08:00:00.000Z");
    driveClient.addFile("taskmanager_dump_broken.zip", Buffer.from("broken"), "2026-05-17T09:00:00.000Z");

    const preview = await previewLatestDriveDump(driveClient);

    expect(preview.driveFile.id).toBe(validFile.id);
    expect(preview.warnings.some((warning) => warning.includes("broken"))).toBe(true);
  });
});

describe("Dump import failure safety", () => {
  it("blockiert Hash-Mismatch und falsche Sicherheitsphrase ohne lokale Änderung", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = driveClient.addFile(archive.filename, archive.buffer);
    const before = collectSnapshot();
    const preview = await inspectDumpArchive(archive.buffer, file);

    await expect(
      applyDriveDump(testDb.sqlite, driveClient, {
        fileId: file.id,
        fileHash: `${preview.fileHash}x`,
        confirmationPhrase: preview.confirmationPhrase
      })
    ).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    await expect(
      applyDriveDump(testDb.sqlite, driveClient, {
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
    const file = driveClient.addFile(archive.filename, badArchive);
    const before = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("blocked");
    await expect(
      applyDriveDump(testDb.sqlite, driveClient, {
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
    tables.tasks[0] = { ...tables.tasks[0], project_id: 9999 };
    const manifestTables = manifest.tables as Record<string, { rowCount: number; sha256: string }>;
    manifestTables.tasks = {
      ...manifestTables.tasks,
      sha256: sha256Json(tables.tasks)
    };
    const badArchive = await replaceDumpJson(archive.buffer, data, manifest);
    const file = driveClient.addFile(archive.filename, badArchive);
    const before = collectSnapshot();
    mutateLocalState();
    const mutated = collectSnapshot();

    const preview = await inspectDumpArchive(badArchive, file);
    expect(preview.transferReadiness).toBe("ready");
    await expect(
      applyDriveDump(testDb.sqlite, driveClient, {
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
    const file = driveClient.addFile(archive.filename, archive.buffer);
    const before = collectSnapshot();
    mutateLocalState();
    const mutated = collectSnapshot();
    const preview = await inspectDumpArchive(archive.buffer, file);

    await expect(
      applyDriveDump(
        testDb.sqlite,
        driveClient,
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

  it("verändert bei Drive-Downloadfehler und kaputten ZIPs keine lokalen Daten", async () => {
    const archive = await buildDumpArchive(testDb.sqlite);
    const file = driveClient.addFile(archive.filename, archive.buffer);
    const before = collectSnapshot();
    driveClient.failDownloadFor.add(file.id);

    await expect(previewLatestDriveDump(driveClient)).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);

    driveClient.failDownloadFor.clear();
    driveClient.replaceFile(file.id, await zipFromEntries([{ name: "readme.txt", content: "missing data" }]));
    await expect(previewLatestDriveDump(driveClient)).rejects.toThrow();
    expect(collectSnapshot()).toEqual(before);
  });
});
