import SftpClient from "ssh2-sftp-client";
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
  put(input: Buffer, remoteFilePath: string): Promise<string>;
  end(): Promise<boolean>;
}

type BackupSftpClientFactory = () => BackupSftpClient;

let clientFactory: BackupSftpClientFactory = () => new SftpClient() as BackupSftpClient;

export function setBackupSftpClientFactoryForTests(factory: BackupSftpClientFactory | null): void {
  clientFactory = factory ?? (() => new SftpClient() as BackupSftpClient);
}

function remotePath(filename: string): string {
  return `${config.backupSftpRemoteDir.replace(/\/+$/, "")}/${filename}`;
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

async function withSftpClient<T>(operation: (client: BackupSftpClient) => Promise<T>): Promise<T> {
  assertBackupSftpReady();
  const client = clientFactory();
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

export async function uploadBackupSftpFile(filename: string, buffer: Buffer): Promise<RemoteBackupFileInfo> {
  return withSftpClient(async (client) => {
    const targetPath = remotePath(filename);
    await client.put(buffer, targetPath);
    return {
      name: filename,
      path: targetPath,
      sizeBytes: buffer.byteLength,
      modifiedTime: new Date().toISOString()
    };
  });
}

export async function downloadBackupSftpFile(filename: string): Promise<Buffer> {
  return withSftpClient(async (client) => {
    const result = await client.get(remotePath(filename));
    if (!Buffer.isBuffer(result)) {
      throw new Error("SFTP download did not return a buffer");
    }
    return result;
  });
}
