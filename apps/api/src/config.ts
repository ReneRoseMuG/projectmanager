import "dotenv/config";
import path from "node:path";
import { apiRoot } from "./runtime-safety.js";

export interface AppConfig {
  databasePath: string;
  port: number;
  corsOrigin: string;
  uploadDir: string;
  previewCacheDir: string;
  previewTextMaxBytes: number;
  previewConversionMaxBytes: number;
  previewConversionTimeoutMs: number;
  libreOfficePath: string;
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

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config: AppConfig = {
  databasePath: resolveFromApiRoot(process.env.DATABASE_PATH ?? "./data/taskmanager.sqlite"),
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: resolveFromApiRoot(process.env.UPLOAD_DIR ?? "./uploads"),
  previewCacheDir: resolveFromApiRoot(process.env.PREVIEW_CACHE_DIR ?? "./previews"),
  previewTextMaxBytes: numberFromEnv(process.env.PREVIEW_TEXT_MAX_BYTES, 100 * 1024),
  previewConversionMaxBytes: numberFromEnv(process.env.PREVIEW_CONVERSION_MAX_BYTES, 25 * 1024 * 1024),
  previewConversionTimeoutMs: numberFromEnv(process.env.PREVIEW_CONVERSION_TIMEOUT_MS, 15000),
  libreOfficePath: process.env.LIBREOFFICE_PATH ?? "soffice",
  contentDir: resolveFromApiRoot(process.env.CONTENT_DIR ?? "./content"),
  backupWorkDir: resolveFromApiRoot(process.env.BACKUP_WORK_DIR ?? "./backups"),
  googleDriveBackupFolderId: process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ?? null,
  googleDriveClientId: process.env.GOOGLE_DRIVE_CLIENT_ID ?? null,
  googleDriveClientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? null,
  googleDriveRefreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? null
};
