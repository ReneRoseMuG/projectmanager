import "dotenv/config";
import path from "node:path";
import { apiRoot } from "./runtime-safety.js";

export interface AppConfig {
  databasePath: string;
  port: number;
  corsOrigin: string;
  uploadDir: string;
  contentDir: string;
  backupWorkDir: string;
  googleDriveBackupFolderId: string | null;
  googleDriveClientId: string | null;
  googleDriveClientSecret: string | null;
  googleDriveRefreshToken: string | null;
}

function resolveFromApiRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
}

export const config: AppConfig = {
  databasePath: resolveFromApiRoot(process.env.DATABASE_PATH ?? "./data/taskmanager.sqlite"),
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: resolveFromApiRoot(process.env.UPLOAD_DIR ?? "./uploads"),
  contentDir: resolveFromApiRoot(process.env.CONTENT_DIR ?? "./content"),
  backupWorkDir: resolveFromApiRoot(process.env.BACKUP_WORK_DIR ?? "./backups"),
  googleDriveBackupFolderId: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ?? null,
  googleDriveClientId: process.env.GOOGLE_DRIVE_CLIENT_ID ?? null,
  googleDriveClientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? null,
  googleDriveRefreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? null
};
