import SftpClient from "ssh2-sftp-client";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

export interface RemoteBackupFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedTime: string;
}

export interface BackupSftpReadiness {
  configured: boolean;
  protectedConfirmed: boolean;
  ready: boolean;
  remoteDirectory: string;
  blockingIssues: string[];
}

export interface BackupSftpClient {
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
  list(remoteFilePath: string): Promise<Array<{ type: string; name: string; size: number; modifyTime: number }>>;
  get(remotePath: string): Promise<string | NodeJS.WritableStream | Buffer>;
  put(input: Buffer | NodeJS.ReadableStream, remoteFilePath: string): Promise<string>;
  delete(remotePath: string): Promise<unknown>;
  mkdir(remotePath: string, recursive?: boolean): Promise<unknown>;
  stat(remotePath: string): Promise<unknown>;
  end(): Promise<boolean>;
}

type BackupSftpClientFactory = () => BackupSftpClient;

let clientFactory: BackupSftpClientFactory = () => new SftpClient() as BackupSftpClient;

export function setBackupSftpClientFactoryForTests(factory: BackupSftpClientFactory | null): void {
  clientFactory = factory ?? (() => new SftpClient() as BackupSftpClient);
}

function remoteRootPath(): string {
  return config.backupSftpRemoteDir.replace(/\/+$/, "");
}

function normalizeRemoteRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.length === 0 || normalized.startsWith("/") || path.posix.isAbsolute(normalized)) {
    throw new Error("Remote backup path must be relative");
  }
  const parts = normalized.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) {
    throw new Error("Remote backup path contains unsafe segments");
  }
  return parts.join("/");
}

function remoteNestedPath(relativePath: string): string {
  return `${remoteRootPath()}/${normalizeRemoteRelativePath(relativePath)}`;
}

function remoteParentPath(remoteFilePath: string): string {
  const index = remoteFilePath.lastIndexOf("/");
  return index === -1 ? remoteRootPath() : remoteFilePath.slice(0, index);
}

function remotePath(filename: string): string {
  return remoteNestedPath(filename);
}

async function ensureRemoteDirectory(client: BackupSftpClient, remoteDirectory: string): Promise<void> {
  await client.mkdir(remoteDirectory, true);
}

export function getBackupSftpReadiness(): BackupSftpReadiness {
  const blockingIssues: string[] = [];
  if (!config.backupSftpEnabled) {
    blockingIssues.push("SFTP backup is disabled");
  }
  if (!config.backupSftpHost) {
    blockingIssues.push("BACKUP_SFTP_HOST is missing");
  }
  if (!config.backupSftpUser) {
    blockingIssues.push("BACKUP_SFTP_USER is missing");
  }
  if (!config.backupSftpPassword) {
    blockingIssues.push("BACKUP_SFTP_PASSWORD is missing");
  }
  if (!config.backupSftpRemoteDir) {
    blockingIssues.push("BACKUP_SFTP_REMOTE_DIR is missing");
  }
  if (!config.backupSftpProtectedConfirmed) {
    blockingIssues.push("Remote backup directory protection is not confirmed");
  }

  return {
    configured: config.backupSftpEnabled && Boolean(config.backupSftpHost && config.backupSftpUser && config.backupSftpPassword && config.backupSftpRemoteDir),
    protectedConfirmed: config.backupSftpProtectedConfirmed,
    ready: blockingIssues.length === 0,
    remoteDirectory: config.backupSftpRemoteDir,
    blockingIssues
  };
}

function assertBackupSftpReady(): void {
  const readiness = getBackupSftpReadiness();
  if (!readiness.ready) {
    throw new Error(readiness.blockingIssues.join(" | "));
  }
}

export async function withSftpSession<T>(client: BackupSftpClient, operation: (client: BackupSftpClient) => Promise<T>): Promise<T> {
  assertBackupSftpReady();
  try {
    await client.connect({
      host: config.backupSftpHost,
      port: config.backupSftpPort,
      username: config.backupSftpUser,
      password: config.backupSftpPassword,
      readyTimeout: 15000,
      retries: 1,
      retry_factor: 2,
      retry_minTimeout: 500
    });
    return await operation(client);
  } finally {
    await client.end().catch(() => false);
  }
}

async function withSftpClient<T>(operation: (client: BackupSftpClient) => Promise<T>): Promise<T> {
  return withSftpSession(clientFactory(), operation);
}

export async function batchSftpOperations<T>(operations: (client: BackupSftpClient) => Promise<T>): Promise<T> {
  return withSftpClient(operations);
}

export async function listBackupSftpFiles(): Promise<RemoteBackupFileInfo[]> {
  return withSftpClient(async (client) => {
    const files = await client.list(config.backupSftpRemoteDir);
    return files
      .filter((file) => file.type === "-" && file.name.startsWith("taskmanager_dump_") && file.name.endsWith(".zip"))
      .map((file) => ({
        name: file.name,
        path: remotePath(file.name),
        sizeBytes: file.size,
        modifiedTime: new Date(file.modifyTime).toISOString()
      }))
      .sort((a, b) => {
        const timeCompare = Date.parse(b.modifiedTime) - Date.parse(a.modifiedTime);
        return timeCompare !== 0 ? timeCompare : b.name.localeCompare(a.name, "en");
      });
  });
}

function inputSizeBytes(input: Buffer | NodeJS.ReadableStream, sizeBytes?: number): number {
  if (typeof sizeBytes === "number") {
    return sizeBytes;
  }
  return Buffer.isBuffer(input) ? input.byteLength : 0;
}

export async function uploadBackupSftpFileInSession(client: BackupSftpClient, filename: string, input: Buffer | NodeJS.ReadableStream, sizeBytes?: number): Promise<RemoteBackupFileInfo> {
  const targetPath = remotePath(filename);
  await ensureRemoteDirectory(client, remoteParentPath(targetPath));
  await client.put(input, targetPath);
  return {
    name: filename,
    path: targetPath,
    sizeBytes: inputSizeBytes(input, sizeBytes),
    modifiedTime: new Date().toISOString()
  };
}

export async function uploadBackupSftpFile(filename: string, input: Buffer | NodeJS.ReadableStream, sizeBytes?: number): Promise<RemoteBackupFileInfo> {
  return withSftpClient(async (client) => uploadBackupSftpFileInSession(client, filename, input, sizeBytes));
}

export async function downloadBackupSftpFileInSession(client: BackupSftpClient, filename: string): Promise<Buffer> {
  const result = await client.get(remotePath(filename));
  if (!Buffer.isBuffer(result)) {
    throw new Error("SFTP download did not return a buffer");
  }
  return result;
}

export async function downloadBackupSftpFile(filename: string): Promise<Buffer> {
  return withSftpClient(async (client) => downloadBackupSftpFileInSession(client, filename));
}

export async function downloadBackupSftpTextFile(filename: string): Promise<string> {
  return (await downloadBackupSftpFile(filename)).toString("utf8");
}

export async function downloadBackupSftpTextFileInSession(client: BackupSftpClient, filename: string): Promise<string> {
  return (await downloadBackupSftpFileInSession(client, filename)).toString("utf8");
}

export async function uploadBackupSftpFileAtPathInSession(client: BackupSftpClient, relativePath: string, input: Buffer | NodeJS.ReadableStream, sizeBytes?: number): Promise<RemoteBackupFileInfo> {
  const normalizedPath = normalizeRemoteRelativePath(relativePath);
  const targetPath = remoteNestedPath(normalizedPath);
  await ensureRemoteDirectory(client, remoteParentPath(targetPath));
  await client.put(input, targetPath);
  return {
    name: normalizedPath,
    path: targetPath,
    sizeBytes: inputSizeBytes(input, sizeBytes),
    modifiedTime: new Date().toISOString()
  };
}

export async function uploadBackupSftpFileAtPath(relativePath: string, input: Buffer | NodeJS.ReadableStream, sizeBytes?: number): Promise<RemoteBackupFileInfo> {
  return withSftpClient(async (client) => uploadBackupSftpFileAtPathInSession(client, relativePath, input, sizeBytes));
}

export async function uploadBackupSftpFileFromPath(filename: string, filePath: string, sizeBytes: number): Promise<RemoteBackupFileInfo> {
  return uploadBackupSftpFile(filename, fs.createReadStream(filePath), sizeBytes);
}

export async function deleteBackupSftpFileInSession(client: BackupSftpClient, relativePath: string): Promise<void> {
  await client.delete(remoteNestedPath(relativePath));
}

export async function deleteBackupSftpFile(relativePath: string): Promise<void> {
  return withSftpClient(async (client) => deleteBackupSftpFileInSession(client, relativePath));
}

export async function backupSftpFileExists(relativePath: string): Promise<boolean> {
  return withSftpClient(async (client) => {
    try {
      await client.stat(remoteNestedPath(relativePath));
      return true;
    } catch {
      return false;
    }
  });
}
