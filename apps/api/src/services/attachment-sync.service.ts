import SftpClient from "ssh2-sftp-client";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { config } from "../config.js";
import { assertSafeTestDirectoryPath } from "../runtime-safety.js";

// ─── Manifest types ──────────────────────────────────────────────────────────

interface SyncFileEntry {
  size: number;
  modifiedTime: string;
}

interface SyncManifest {
  version: 1;
  lastSync: string;
  lastDevice: string;
  files: Record<string, SyncFileEntry>;
}

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttachmentSyncReadiness {
  configured: boolean;
  ready: boolean;
  remoteDir: string;
  blockingIssues: string[];
}

export interface AttachmentSyncStats {
  pulled: number;
  pushed: number;
  deleted: number;
  errors: string[];
  durationMs: number;
  syncedAt: string;
}

// ─── SFTP client abstraction (injectable for tests) ──────────────────────────

export interface SftpClientLike {
  connect(options: {
    host: string;
    port: number;
    username: string;
    password: string;
    readyTimeout: number;
    retries: number;
    retry_factor: number;
    retry_minTimeout: number;
  }): Promise<unknown>;
  list(remotePath: string): Promise<Array<{ type: string; name: string; size: number; modifyTime: number }>>;
  get(remotePath: string): Promise<string | NodeJS.WritableStream | Buffer>;
  put(input: Buffer | NodeJS.ReadableStream, remotePath: string): Promise<string>;
  delete(remotePath: string): Promise<unknown>;
  mkdir(remotePath: string, recursive?: boolean): Promise<unknown>;
  end(): Promise<boolean>;
}

type SftpClientFactory = () => SftpClientLike;

let clientFactory: SftpClientFactory = () => new SftpClient() as SftpClientLike;

export function setSftpClientFactoryForTests(factory: SftpClientFactory | null): void {
  clientFactory = factory ?? (() => new SftpClient() as SftpClientLike);
}

// ─── Readiness ───────────────────────────────────────────────────────────────

export function getAttachmentSyncReadiness(): AttachmentSyncReadiness {
  const issues: string[] = [];
  if (!config.attachmentSyncEnabled) issues.push("Attachment-Sync ist deaktiviert (ATTACHMENT_SYNC_ENABLED)");
  if (!config.sftpHost) issues.push("SFTP_HOST fehlt");
  if (!config.sftpUser) issues.push("SFTP_USER fehlt");
  if (!config.sftpPassword) issues.push("SFTP_PASSWORD fehlt");
  if (!config.attachmentSyncRemoteDir) issues.push("ATTACHMENT_SYNC_REMOTE_DIR fehlt");
  return {
    configured: Boolean(config.sftpHost && config.sftpUser && config.sftpPassword && config.attachmentSyncRemoteDir),
    ready: issues.length === 0,
    remoteDir: config.attachmentSyncRemoteDir,
    blockingIssues: issues,
  };
}

// ─── Remote path helpers ─────────────────────────────────────────────────────

function remoteRoot(): string {
  return config.attachmentSyncRemoteDir.replace(/\/+$/, "");
}

function remoteFilePath(filename: string): string {
  return `${remoteRoot()}/${filename}`;
}

const MANIFEST_FILENAME = ".manifest.json";
const STATE_FILENAME = ".sync-state.json";

// ─── SFTP session ────────────────────────────────────────────────────────────

async function withSftp<T>(operation: (client: SftpClientLike) => Promise<T>): Promise<T> {
  const readiness = getAttachmentSyncReadiness();
  if (!readiness.ready) {
    throw new Error(readiness.blockingIssues.join(" | "));
  }
  const client = clientFactory();
  try {
    await client.connect({
      host: config.sftpHost,
      port: config.sftpPort,
      username: config.sftpUser,
      password: config.sftpPassword,
      readyTimeout: 15000,
      retries: 1,
      retry_factor: 2,
      retry_minTimeout: 500,
    });
    return await operation(client);
  } finally {
    await client.end().catch(() => false);
  }
}

// ─── Manifest I/O ────────────────────────────────────────────────────────────

const EMPTY_MANIFEST: SyncManifest = {
  version: 1,
  lastSync: new Date(0).toISOString(),
  lastDevice: "",
  files: {},
};

async function readRemoteManifest(client: SftpClientLike): Promise<SyncManifest> {
  try {
    const result = await client.get(remoteFilePath(MANIFEST_FILENAME));
    const text = Buffer.isBuffer(result) ? result.toString("utf8") : String(result);
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && (parsed as { version?: unknown }).version === 1) {
      return parsed as SyncManifest;
    }
  } catch {
    // Missing or malformed manifest → start fresh
  }
  return { ...EMPTY_MANIFEST, files: {} };
}

async function writeRemoteManifest(client: SftpClientLike, manifest: SyncManifest): Promise<void> {
  await client.mkdir(remoteRoot(), true);
  const buffer = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  await client.put(buffer, remoteFilePath(MANIFEST_FILENAME));
}

function localStatePath(): string {
  return path.join(config.uploadDir, STATE_FILENAME);
}

async function readLocalState(): Promise<SyncManifest> {
  try {
    const text = await fs.readFile(localStatePath(), "utf8");
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && (parsed as { version?: unknown }).version === 1) {
      return parsed as SyncManifest;
    }
  } catch {
    // First run or corrupted state → start fresh
  }
  return { ...EMPTY_MANIFEST, files: {} };
}

async function writeLocalState(manifest: SyncManifest): Promise<void> {
  await fs.writeFile(localStatePath(), JSON.stringify(manifest, null, 2), "utf8");
}

// ─── Local file scan ─────────────────────────────────────────────────────────

async function scanLocalFiles(): Promise<Record<string, SyncFileEntry>> {
  const result: Record<string, SyncFileEntry> = {};
  try {
    const entries = await fs.readdir(config.uploadDir);
    await Promise.all(
      entries.map(async (name) => {
        if (name.startsWith(".")) return;
        const filePath = path.join(config.uploadDir, name);
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            result[name] = { size: stat.size, modifiedTime: stat.mtime.toISOString() };
          }
        } catch {
          // File may have been removed between readdir and stat
        }
      })
    );
  } catch {
    // uploadDir may not exist yet
  }
  return result;
}

// ─── Sync state ──────────────────────────────────────────────────────────────

let lastSyncStats: AttachmentSyncStats | null = null;
let syncInProgress = false;

export function getLastSyncStats(): AttachmentSyncStats | null {
  return lastSyncStats;
}

export function isSyncInProgress(): boolean {
  return syncInProgress;
}

// ─── Startup sync ─────────────────────────────────────────────────────────────

export async function syncAttachmentsOnStartup(): Promise<AttachmentSyncStats> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  const readiness = getAttachmentSyncReadiness();
  if (!readiness.ready) {
    const stats: AttachmentSyncStats = {
      pulled: 0, pushed: 0, deleted: 0,
      errors: [`Sync nicht konfiguriert: ${readiness.blockingIssues.join(", ")}`],
      durationMs: 0, syncedAt: new Date().toISOString(),
    };
    lastSyncStats = stats;
    return stats;
  }

  if (syncInProgress) {
    return lastSyncStats ?? {
      pulled: 0, pushed: 0, deleted: 0, errors: ["Sync läuft bereits"],
      durationMs: 0, syncedAt: new Date().toISOString(),
    };
  }

  syncInProgress = true;
  const startedAt = Date.now();
  const errors: string[] = [];
  let pulled = 0;
  let pushed = 0;
  let deleted = 0;

  try {
    await fs.mkdir(config.uploadDir, { recursive: true });

    await withSftp(async (client) => {
      const [mRemote, mLocal, fLocal] = await Promise.all([
        readRemoteManifest(client),
        readLocalState(),
        scanLocalFiles(),
      ]);

      const updatedRemoteFiles: Record<string, SyncFileEntry> = { ...mRemote.files };

      // Files known from last local sync
      for (const [filename, localKnown] of Object.entries(mLocal.files)) {
        const inLocal = fLocal[filename];
        const inRemote = mRemote.files[filename];

        if (inLocal && inRemote) {
          const localChangedSinceSync = inLocal.size !== localKnown.size || inLocal.modifiedTime !== localKnown.modifiedTime;
          const remoteChangedSinceSync = inRemote.modifiedTime !== localKnown.modifiedTime || inRemote.size !== localKnown.size;

          if (localChangedSinceSync && !remoteChangedSinceSync) {
            try {
              const buffer = await fs.readFile(path.join(config.uploadDir, filename));
              await client.mkdir(remoteRoot(), true);
              await client.put(buffer, remoteFilePath(filename));
              updatedRemoteFiles[filename] = inLocal;
              pushed++;
            } catch (err) {
              errors.push(`push ${filename}: ${String(err)}`);
            }
          } else if (remoteChangedSinceSync && !localChangedSinceSync) {
            try {
              const result = await client.get(remoteFilePath(filename));
              const buffer = Buffer.isBuffer(result) ? result : Buffer.from(String(result));
              await fs.writeFile(path.join(config.uploadDir, filename), buffer);
              fLocal[filename] = inRemote;
              updatedRemoteFiles[filename] = inRemote;
              pulled++;
            } catch (err) {
              errors.push(`pull ${filename}: ${String(err)}`);
            }
          } else if (localChangedSinceSync && remoteChangedSinceSync) {
            // Conflict: both changed — local wins (last-writer-wins by mtime)
            if (inLocal.modifiedTime >= inRemote.modifiedTime) {
              try {
                const buffer = await fs.readFile(path.join(config.uploadDir, filename));
                await client.mkdir(remoteRoot(), true);
                await client.put(buffer, remoteFilePath(filename));
                updatedRemoteFiles[filename] = inLocal;
                pushed++;
              } catch (err) {
                errors.push(`push-conflict ${filename}: ${String(err)}`);
              }
            } else {
              try {
                const result = await client.get(remoteFilePath(filename));
                const buffer = Buffer.isBuffer(result) ? result : Buffer.from(String(result));
                await fs.writeFile(path.join(config.uploadDir, filename), buffer);
                fLocal[filename] = inRemote;
                updatedRemoteFiles[filename] = inRemote;
                pulled++;
              } catch (err) {
                errors.push(`pull-conflict ${filename}: ${String(err)}`);
              }
            }
          }
        } else if (inLocal && !inRemote) {
          // Deleted on remote → delete locally
          try {
            await fs.rm(path.join(config.uploadDir, filename), { force: true });
            delete fLocal[filename];
            deleted++;
          } catch (err) {
            errors.push(`local-delete ${filename}: ${String(err)}`);
          }
        } else if (!inLocal && inRemote) {
          // Deleted locally → delete on remote
          try {
            await client.delete(remoteFilePath(filename));
            delete updatedRemoteFiles[filename];
            deleted++;
          } catch (err) {
            errors.push(`remote-delete ${filename}: ${String(err)}`);
          }
        }
      }

      // Files new on remote (not in last local sync state)
      for (const [filename, remoteEntry] of Object.entries(mRemote.files)) {
        if (mLocal.files[filename] !== undefined) continue;
        if (fLocal[filename] !== undefined) continue;
        try {
          const result = await client.get(remoteFilePath(filename));
          const buffer = Buffer.isBuffer(result) ? result : Buffer.from(String(result));
          await fs.writeFile(path.join(config.uploadDir, filename), buffer);
          fLocal[filename] = remoteEntry;
          pulled++;
        } catch (err) {
          errors.push(`pull-new ${filename}: ${String(err)}`);
        }
      }

      // Files physically on remote but missing from manifest (e.g. uploaded without sync)
      try {
        const remoteEntries = await client.list(remoteRoot());
        for (const entry of remoteEntries) {
          if (entry.type !== "-") continue;
          if (entry.name.startsWith(".")) continue;
          if (mRemote.files[entry.name] !== undefined) continue;
          if (fLocal[entry.name] !== undefined) continue;
          try {
            const result = await client.get(remoteFilePath(entry.name));
            const buffer = Buffer.isBuffer(result) ? result : Buffer.from(String(result));
            await fs.writeFile(path.join(config.uploadDir, entry.name), buffer);
            const remoteEntry: SyncFileEntry = {
              size: entry.size,
              modifiedTime: new Date(entry.modifyTime).toISOString(),
            };
            fLocal[entry.name] = remoteEntry;
            updatedRemoteFiles[entry.name] = remoteEntry;
            pulled++;
          } catch (err) {
            errors.push(`pull-unlisted ${entry.name}: ${String(err)}`);
          }
        }
      } catch (err) {
        errors.push(`remote-list: ${String(err)}`);
      }

      // Files new locally (never synced before)
      for (const [filename, localEntry] of Object.entries(fLocal)) {
        if (mLocal.files[filename] !== undefined) continue;
        if (mRemote.files[filename] !== undefined) continue;
        try {
          const buffer = await fs.readFile(path.join(config.uploadDir, filename));
          await client.mkdir(remoteRoot(), true);
          await client.put(buffer, remoteFilePath(filename));
          updatedRemoteFiles[filename] = localEntry;
          pushed++;
        } catch (err) {
          errors.push(`push-new ${filename}: ${String(err)}`);
        }
      }

      const now = new Date().toISOString();
      const updatedManifest: SyncManifest = {
        version: 1,
        lastSync: now,
        lastDevice: os.hostname(),
        files: updatedRemoteFiles,
      };

      await writeRemoteManifest(client, updatedManifest);
      await writeLocalState({ ...updatedManifest });
    });
  } catch (err) {
    errors.push(`sync-error: ${String(err)}`);
  }

  const stats: AttachmentSyncStats = {
    pulled, pushed, deleted, errors,
    durationMs: Date.now() - startedAt,
    syncedAt: new Date().toISOString(),
  };
  lastSyncStats = stats;
  syncInProgress = false;
  return stats;
}

// ─── Per-file operations ──────────────────────────────────────────────────────

export async function pushAttachmentToRemote(filename: string, buffer: Buffer): Promise<void> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  if (!getAttachmentSyncReadiness().ready) return;
  try {
    await withSftp(async (client) => {
      await client.mkdir(remoteRoot(), true);
      await client.put(buffer, remoteFilePath(filename));

      const entry: SyncFileEntry = { size: buffer.byteLength, modifiedTime: new Date().toISOString() };
      const [manifest, localState] = await Promise.all([readRemoteManifest(client), readLocalState()]);
      manifest.files[filename] = entry;
      manifest.lastSync = new Date().toISOString();
      manifest.lastDevice = os.hostname();
      localState.files[filename] = entry;
      await Promise.all([writeRemoteManifest(client, manifest), writeLocalState(localState)]);
    });
  } catch {
    // Non-fatal: startup sync will reconcile
  }
}

export async function removeAttachmentFromRemote(filename: string): Promise<void> {
  assertSafeTestDirectoryPath(config.uploadDir, "UPLOAD_DIR");
  if (!getAttachmentSyncReadiness().ready) return;
  try {
    await withSftp(async (client) => {
      try {
        await client.delete(remoteFilePath(filename));
      } catch {
        // File may not exist on remote
      }

      const [manifest, localState] = await Promise.all([readRemoteManifest(client), readLocalState()]);
      delete manifest.files[filename];
      manifest.lastSync = new Date().toISOString();
      manifest.lastDevice = os.hostname();
      delete localState.files[filename];
      await Promise.all([writeRemoteManifest(client, manifest), writeLocalState(localState)]);
    });
  } catch {
    // Non-fatal
  }
}
