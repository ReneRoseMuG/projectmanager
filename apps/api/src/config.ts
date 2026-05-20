import "dotenv/config";
import path from "node:path";
import { apiRoot, repoRoot } from "./runtime-safety.js";

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
  aiBaseUrl: string;
  aiDefaultModel: string;
  aiTimeoutMs: number;
  aiMaxInputChars: number;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminInitialPassword: string | null;
  sessionSecret: string;
  sessionSecretIsFallback: boolean;
}

function resolveFromApiRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
}

function resolveFromRepoRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

export function resolveBackupWorkDir(value: string | undefined): string {
  const configuredValue = value?.trim() ? value.trim() : "./backups";
  const resolvedPath = resolveFromRepoRoot(configuredValue);
  const legacyApiBackupDir = path.resolve(apiRoot, "backups");
  if (path.resolve(resolvedPath).toLowerCase() === legacyApiBackupDir.toLowerCase()) {
    return path.resolve(repoRoot, "backups");
  }
  return resolvedPath;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const configuredSessionSecret = process.env.SESSION_SECRET?.trim();

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
  backupWorkDir: resolveBackupWorkDir(process.env.BACKUP_WORK_DIR),
  aiBaseUrl: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434/api",
  aiDefaultModel: process.env.AI_DEFAULT_MODEL ?? "llama3.2:1b",
  aiTimeoutMs: numberFromEnv(process.env.AI_TIMEOUT_MS, 60000),
  aiMaxInputChars: numberFromEnv(process.env.AI_MAX_INPUT_CHARS, 12000),
  adminEmail: process.env.ADMIN_EMAIL?.trim() || "admin@local",
  adminFirstName: process.env.ADMIN_FIRST_NAME?.trim() || "Admin",
  adminLastName: process.env.ADMIN_LAST_NAME?.trim() || "System",
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD?.trim() ? process.env.ADMIN_INITIAL_PASSWORD.trim() : null,
  sessionSecret: configuredSessionSecret || "taskmanager-local-dev-session-secret-change-me",
  sessionSecretIsFallback: !configuredSessionSecret
};
