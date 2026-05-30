import "dotenv/config";
import path from "node:path";
import { apiRoot, repoRoot } from "./runtime-safety.js";

export interface AppConfig {
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  port: number;
  corsOrigin: string;
  attachmentBasePath: string;
  uploadDir: string;
  previewCacheDir: string;
  previewTextMaxBytes: number;
  previewConversionMaxBytes: number;
  previewConversionTimeoutMs: number;
  libreOfficePath: string;
  contentDir: string;
  backupWorkDir: string;
  backupSftpEnabled: boolean;
  backupSftpHost: string;
  backupSftpPort: number;
  backupSftpUser: string;
  backupSftpPassword: string;
  backupSftpRemoteDir: string;
  backupSftpProtectedConfirmed: boolean;
  notificationsEnabled: boolean;
  notificationCron: string;
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFrom: string;
  webPushEnabled: boolean;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminInitialPassword: string | null;
  authBypassAdmin: boolean;
  apiKey: string | null;
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

function booleanFromEnv(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

const configuredSessionSecret = process.env.SESSION_SECRET?.trim();
const configuredApiKey = process.env.API_KEY?.trim();
const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim() || "admin@local";

export const config: AppConfig = {
  db: {
    host: process.env.DB_HOST?.trim() ?? "localhost",
    port: numberFromEnv(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME?.trim() ?? "taskmanager",
    user: process.env.DB_USER?.trim() ?? "taskmanager",
    password: process.env.DB_PASSWORD ?? "",
    ssl: booleanFromEnv(process.env.DB_SSL)
  },
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  attachmentBasePath: resolveFromApiRoot(process.env.ATTACHMENT_BASE_PATH ?? process.env.UPLOAD_DIR ?? "./uploads"),
  uploadDir: resolveFromApiRoot(process.env.ATTACHMENT_BASE_PATH ?? process.env.UPLOAD_DIR ?? "./uploads"),
  previewCacheDir: resolveFromApiRoot(process.env.PREVIEW_CACHE_DIR ?? "./previews"),
  previewTextMaxBytes: numberFromEnv(process.env.PREVIEW_TEXT_MAX_BYTES, 100 * 1024),
  previewConversionMaxBytes: numberFromEnv(process.env.PREVIEW_CONVERSION_MAX_BYTES, 25 * 1024 * 1024),
  previewConversionTimeoutMs: numberFromEnv(process.env.PREVIEW_CONVERSION_TIMEOUT_MS, 15000),
  libreOfficePath: process.env.LIBREOFFICE_PATH ?? "soffice",
  contentDir: resolveFromApiRoot(process.env.CONTENT_DIR ?? "./content"),
  backupWorkDir: resolveBackupWorkDir(process.env.BACKUP_WORK_DIR),
  backupSftpEnabled: booleanFromEnv(process.env.BACKUP_SFTP_ENABLED),
  backupSftpHost: process.env.BACKUP_SFTP_HOST?.trim() ?? "",
  backupSftpPort: numberFromEnv(process.env.BACKUP_SFTP_PORT, 22),
  backupSftpUser: process.env.BACKUP_SFTP_USER?.trim() ?? "",
  backupSftpPassword: process.env.BACKUP_SFTP_PASSWORD ?? "",
  backupSftpRemoteDir: process.env.BACKUP_SFTP_REMOTE_DIR?.trim() ?? "",
  backupSftpProtectedConfirmed: booleanFromEnv(process.env.BACKUP_SFTP_PROTECTED_CONFIRMED),
  notificationsEnabled: booleanFromEnv(process.env.NOTIFICATIONS_ENABLED),
  notificationCron: process.env.NOTIFICATION_CRON?.trim() || "* * * * *",
  smtpEnabled: booleanFromEnv(process.env.SMTP_ENABLED),
  smtpHost: process.env.SMTP_HOST?.trim() ?? "",
  smtpPort: numberFromEnv(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER?.trim() ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFrom: process.env.SMTP_FROM?.trim() || configuredAdminEmail,
  webPushEnabled: booleanFromEnv(process.env.WEB_PUSH_ENABLED),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY?.trim() ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY?.trim() ?? "",
  vapidSubject: process.env.VAPID_SUBJECT?.trim() || `mailto:${configuredAdminEmail}`,
  adminEmail: configuredAdminEmail,
  adminFirstName: process.env.ADMIN_FIRST_NAME?.trim() || "Admin",
  adminLastName: process.env.ADMIN_LAST_NAME?.trim() || "System",
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD?.trim() ? process.env.ADMIN_INITIAL_PASSWORD.trim() : null,
  authBypassAdmin: booleanFromEnv(process.env.AUTH_BYPASS_ADMIN),
  apiKey: configuredApiKey || null,
  sessionSecret: configuredSessionSecret || "taskmanager-local-dev-session-secret-change-me",
  sessionSecretIsFallback: !configuredSessionSecret
};
