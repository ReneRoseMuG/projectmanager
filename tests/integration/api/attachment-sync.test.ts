/**
 * Test Scope: Attachment-Sync Service + API
 *
 * Abgedeckte Regeln:
 * - Startup-Sync: neue Remote-Dateien werden gezogen, neue lokale Dateien gepusht,
 *   remote gelöschte werden lokal entfernt, lokal gelöschte werden remote entfernt.
 * - pushAttachmentToRemote aktualisiert Remote und Manifest.
 * - removeAttachmentFromRemote löscht Remote-Datei und bereinigt Manifest.
 * - Wenn Sync nicht konfiguriert ist, gibt syncAttachmentsOnStartup einen Fehler zurück
 *   ohne SFTP-Verbindungsversuch.
 * - GET /api/attachment-sync/status gibt Readiness und letzten Sync zurück.
 * - POST /api/attachment-sync/run löst einen Sync aus.
 *
 * Fehlerfälle:
 * - SFTP-Fehler bei Push/Pull werden als nicht-fatal behandelt (kein throw).
 * - Kein Remote-Manifest vorhanden → leeres Manifest wird angenommen.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  getAttachmentSyncReadiness,
  pushAttachmentToRemote,
  removeAttachmentFromRemote,
  setSftpClientFactoryForTests,
  syncAttachmentsOnStartup,
  type SftpClientLike,
} from "../../../apps/api/src/services/attachment-sync.service.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

// ─── SFTP Mock ───────────────────────────────────────────────────────────────

interface MockMetrics {
  connectCount: number;
  endCount: number;
  putPaths: string[];
  getPaths: string[];
  deletePaths: string[];
  mkdirPaths: string[];
}

interface MockRemoteFile {
  buffer: Buffer;
  modifyTime: number;
}

function createSftpMock(remoteFiles: Map<string, MockRemoteFile> = new Map()): {
  metrics: MockMetrics;
  factory: () => SftpClientLike;
} {
  const metrics: MockMetrics = {
    connectCount: 0,
    endCount: 0,
    putPaths: [],
    getPaths: [],
    deletePaths: [],
    mkdirPaths: [],
  };

  const factory = (): SftpClientLike => ({
    async connect() {
      metrics.connectCount++;
    },
    async list(remotePath) {
      return [...remoteFiles.entries()]
        .filter(([p]) => path.dirname(p) === remotePath || p.startsWith(remotePath + "/"))
        .map(([p, f]) => ({
          type: "-",
          name: path.basename(p),
          size: f.buffer.byteLength,
          modifyTime: f.modifyTime,
        }));
    },
    async get(remotePath) {
      metrics.getPaths.push(remotePath);
      const file = remoteFiles.get(remotePath);
      if (!file) throw new Error(`SFTP file not found: ${remotePath}`);
      return file.buffer;
    },
    async put(input, remotePath) {
      metrics.putPaths.push(remotePath);
      const buffer = Buffer.isBuffer(input) ? input : Buffer.from("");
      remoteFiles.set(remotePath, { buffer, modifyTime: Date.now() });
      return remotePath;
    },
    async delete(remotePath) {
      metrics.deletePaths.push(remotePath);
      remoteFiles.delete(remotePath);
    },
    async mkdir(remotePath) {
      metrics.mkdirPaths.push(remotePath);
    },
    async end() {
      metrics.endCount++;
      return true;
    },
  });

  return { metrics, factory };
}

// ─── Test helpers ────────────────────────────────────────────────────────────

let tempUploadDir: string;

function setUploadDir(dir: string) {
  Object.defineProperty(config, "uploadDir", { value: dir, writable: true, configurable: true });
}

function enableSync(remoteDir = "sync/attachments") {
  Object.defineProperty(config, "attachmentSyncEnabled", { value: true, writable: true, configurable: true });
  Object.defineProperty(config, "sftpHost", { value: "test-host", writable: true, configurable: true });
  Object.defineProperty(config, "sftpUser", { value: "test-user", writable: true, configurable: true });
  Object.defineProperty(config, "sftpPassword", { value: "test-pass", writable: true, configurable: true });
  Object.defineProperty(config, "attachmentSyncRemoteDir", { value: remoteDir, writable: true, configurable: true });
}

function disableSync() {
  Object.defineProperty(config, "attachmentSyncEnabled", { value: false, writable: true, configurable: true });
  Object.defineProperty(config, "sftpHost", { value: "", writable: true, configurable: true });
  Object.defineProperty(config, "sftpUser", { value: "", writable: true, configurable: true });
  Object.defineProperty(config, "sftpPassword", { value: "", writable: true, configurable: true });
  Object.defineProperty(config, "attachmentSyncRemoteDir", { value: "", writable: true, configurable: true });
}

async function writeLocalFile(name: string, content: string): Promise<void> {
  await fs.writeFile(path.join(tempUploadDir, name), content, "utf8");
}

async function localFileExists(name: string): Promise<boolean> {
  try {
    await fs.access(path.join(tempUploadDir, name));
    return true;
  } catch {
    return false;
  }
}

async function readLocalFile(name: string): Promise<string> {
  return fs.readFile(path.join(tempUploadDir, name), "utf8");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Attachment-Sync Service", () => {
  beforeAll(async () => {
    tempUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "attachment-sync-test-"));
    setUploadDir(tempUploadDir);
  });

  beforeEach(async () => {
    await fs.rm(tempUploadDir, { recursive: true, force: true });
    await fs.mkdir(tempUploadDir, { recursive: true });
    setSftpClientFactoryForTests(null);
    disableSync();
  });

  afterAll(async () => {
    setSftpClientFactoryForTests(null);
    disableSync();
    await fs.rm(tempUploadDir, { recursive: true, force: true });
  });

  describe("getAttachmentSyncReadiness", () => {
    it("meldet nicht konfiguriert wenn disabled", () => {
      const r = getAttachmentSyncReadiness();
      expect(r.ready).toBe(false);
      expect(r.configured).toBe(false);
    });

    it("meldet ready wenn alle Felder gesetzt", () => {
      enableSync();
      const r = getAttachmentSyncReadiness();
      expect(r.ready).toBe(true);
      expect(r.configured).toBe(true);
      expect(r.remoteDir).toBe("sync/attachments");
    });
  });

  describe("syncAttachmentsOnStartup", () => {
    it("gibt Fehler zurück wenn nicht konfiguriert, ohne SFTP-Verbindung", async () => {
      const { metrics, factory } = createSftpMock();
      setSftpClientFactoryForTests(factory);
      const stats = await syncAttachmentsOnStartup();
      expect(stats.errors.length).toBeGreaterThan(0);
      expect(metrics.connectCount).toBe(0);
    });

    it("pusht neue lokale Datei zu Remote", async () => {
      enableSync();
      await writeLocalFile("test.txt", "hello");
      const remoteFiles = new Map<string, MockRemoteFile>();
      const { metrics, factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      const stats = await syncAttachmentsOnStartup();

      expect(stats.pushed).toBe(1);
      expect(stats.errors).toEqual([]);
      expect(metrics.putPaths.some((p) => p.includes("test.txt"))).toBe(true);
    });

    it("zieht neue Remote-Datei lokal", async () => {
      enableSync();
      const remoteDir = "sync/attachments";
      const remoteFiles = new Map<string, MockRemoteFile>([
        [`${remoteDir}/remote.txt`, { buffer: Buffer.from("remote content"), modifyTime: Date.now() }],
      ]);
      // Manifest auf Remote
      const manifest = {
        version: 1,
        lastSync: new Date().toISOString(),
        lastDevice: "other-device",
        files: {
          "remote.txt": { size: 14, modifiedTime: new Date().toISOString() },
        },
      };
      remoteFiles.set(`${remoteDir}/.manifest.json`, {
        buffer: Buffer.from(JSON.stringify(manifest)),
        modifyTime: Date.now(),
      });
      const { metrics, factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      const stats = await syncAttachmentsOnStartup();

      expect(stats.pulled).toBe(1);
      expect(stats.errors).toEqual([]);
      expect(await localFileExists("remote.txt")).toBe(true);
      expect(await readLocalFile("remote.txt")).toBe("remote content");
      expect(metrics.getPaths.some((p) => p.includes("remote.txt"))).toBe(true);
    });

    it("löscht lokale Datei wenn Remote-Manifest sie nicht mehr enthält", async () => {
      enableSync();
      // Lokale Datei vorhanden
      await writeLocalFile("tobe-deleted.txt", "old");
      // Lokaler Sync-State kennt diese Datei
      const syncState = {
        version: 1,
        lastSync: new Date(Date.now() - 10000).toISOString(),
        lastDevice: "this-device",
        files: {
          "tobe-deleted.txt": { size: 3, modifiedTime: new Date(Date.now() - 10000).toISOString() },
        },
      };
      await fs.writeFile(path.join(tempUploadDir, ".sync-state.json"), JSON.stringify(syncState), "utf8");
      // Remote-Manifest: Datei fehlt (wurde remote gelöscht)
      const remoteManifest = {
        version: 1, lastSync: new Date().toISOString(), lastDevice: "other", files: {},
      };
      const remoteFiles = new Map<string, MockRemoteFile>([
        ["sync/attachments/.manifest.json", {
          buffer: Buffer.from(JSON.stringify(remoteManifest)),
          modifyTime: Date.now(),
        }],
      ]);
      const { factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      const stats = await syncAttachmentsOnStartup();

      expect(stats.deleted).toBe(1);
      expect(await localFileExists("tobe-deleted.txt")).toBe(false);
    });

    it("löscht Remote-Datei wenn lokal gelöscht und Sync-State sie kannte", async () => {
      enableSync();
      // Kein lokale Datei — wurde zwischen letztem Sync und jetzt gelöscht
      const syncState = {
        version: 1,
        lastSync: new Date(Date.now() - 10000).toISOString(),
        lastDevice: "this-device",
        files: {
          "deleted-locally.txt": { size: 5, modifiedTime: new Date(Date.now() - 10000).toISOString() },
        },
      };
      await fs.writeFile(path.join(tempUploadDir, ".sync-state.json"), JSON.stringify(syncState), "utf8");
      // Remote hat die Datei noch
      const remoteManifest = {
        version: 1, lastSync: syncState.lastSync, lastDevice: "this-device",
        files: { "deleted-locally.txt": { size: 5, modifiedTime: syncState.lastSync } },
      };
      const remoteFiles = new Map<string, MockRemoteFile>([
        ["sync/attachments/.manifest.json", {
          buffer: Buffer.from(JSON.stringify(remoteManifest)), modifyTime: Date.now(),
        }],
        ["sync/attachments/deleted-locally.txt", {
          buffer: Buffer.from("old"), modifyTime: Date.now() - 10000,
        }],
      ]);
      const { metrics, factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      const stats = await syncAttachmentsOnStartup();

      expect(stats.deleted).toBe(1);
      expect(metrics.deletePaths.some((p) => p.includes("deleted-locally.txt"))).toBe(true);
    });
  });

  describe("pushAttachmentToRemote", () => {
    it("lädt Datei zu Remote hoch und aktualisiert Manifest", async () => {
      enableSync();
      const remoteFiles = new Map<string, MockRemoteFile>();
      const { metrics, factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      await pushAttachmentToRemote("upload.pdf", Buffer.from("pdf content"));

      expect(metrics.putPaths.some((p) => p.includes("upload.pdf"))).toBe(true);
      expect(metrics.putPaths.some((p) => p.includes(".manifest.json"))).toBe(true);
    });

    it("tut nichts wenn Sync nicht konfiguriert", async () => {
      const { metrics, factory } = createSftpMock();
      setSftpClientFactoryForTests(factory);
      await pushAttachmentToRemote("file.txt", Buffer.from("x"));
      expect(metrics.connectCount).toBe(0);
    });
  });

  describe("removeAttachmentFromRemote", () => {
    it("löscht Datei remote und aktualisiert Manifest", async () => {
      enableSync();
      const remoteManifest = {
        version: 1, lastSync: new Date().toISOString(), lastDevice: "test",
        files: { "toremove.txt": { size: 3, modifiedTime: new Date().toISOString() } },
      };
      const remoteFiles = new Map<string, MockRemoteFile>([
        ["sync/attachments/.manifest.json", {
          buffer: Buffer.from(JSON.stringify(remoteManifest)), modifyTime: Date.now(),
        }],
        ["sync/attachments/toremove.txt", { buffer: Buffer.from("bye"), modifyTime: Date.now() }],
      ]);
      const { metrics, factory } = createSftpMock(remoteFiles);
      setSftpClientFactoryForTests(factory);

      await removeAttachmentFromRemote("toremove.txt");

      expect(metrics.deletePaths.some((p) => p.includes("toremove.txt"))).toBe(true);
      expect(metrics.putPaths.some((p) => p.includes(".manifest.json"))).toBe(true);
    });

    it("tut nichts wenn Sync nicht konfiguriert", async () => {
      const { metrics, factory } = createSftpMock();
      setSftpClientFactoryForTests(factory);
      await removeAttachmentFromRemote("file.txt");
      expect(metrics.connectCount).toBe(0);
    });
  });
});

describe("Attachment-Sync API", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    disableSync();
    setSftpClientFactoryForTests(null);
  });

  afterAll(async () => {
    await testDb?.close();
    disableSync();
    setSftpClientFactoryForTests(null);
  });

  it("GET /api/attachment-sync/status gibt Readiness und lastSync zurück", async () => {
    const app = await buildTestApp(testDb);
    try {
      const res = await supertest(app.server)
        .get("/api/attachment-sync/status")
        .expect(200);

      expect(res.body).toMatchObject({
        readiness: {
          configured: expect.any(Boolean),
          ready: expect.any(Boolean),
          blockingIssues: expect.any(Array),
        },
        inProgress: expect.any(Boolean),
      });
    } finally {
      await app.close();
    }
  });

  it("POST /api/attachment-sync/run gibt SyncStats zurück", async () => {
    const app = await buildTestApp(testDb);
    try {
      const res = await supertest(app.server)
        .post("/api/attachment-sync/run")
        .expect(200);

      expect(res.body).toMatchObject({
        pulled: expect.any(Number),
        pushed: expect.any(Number),
        deleted: expect.any(Number),
        errors: expect.any(Array),
        durationMs: expect.any(Number),
        syncedAt: expect.any(String),
      });
    } finally {
      await app.close();
    }
  });
});
