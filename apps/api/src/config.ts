import "dotenv/config";
import path from "node:path";
import { apiRoot } from "./runtime-safety.js";

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
  uploadDir: string;
  previewCacheDir: string;
  previewTextMaxBytes: number;
  previewConversionMaxBytes: number;
  previewConversionTimeoutMs: number;
  libreOfficePath: string;
  contentDir: string;
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
  // Symmetrischer Schlüssel (beliebiger Secret-String, via SHA-256 auf 32 Byte abgeleitet) für die
  // verschlüsselte Ablage von Kalender-Zugangsdaten (MS-79 AP-0.2). Nie im Repo — nur aus der Umgebung.
  calendarEncryptionKey: string | null;
  // Google OAuth (MS-79 AP-2.1): Client-Credentials + Redirect-URI aus der Umgebung.
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleRedirectUri: string;
  // Kalender-Sync-Scheduler (MS-79 AP-4.1): periodischer Hintergrund-Abgleich aller Verbindungen.
  calendarSyncEnabled: boolean;
  calendarSyncIntervalMs: number;
  // Google Push (MS-79 AP-4.2, optional): öffentliche HTTPS-Webhook-URL. Null → Push deaktiviert.
  googlePushWebhookUrl: string | null;
}

function resolveFromApiRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(apiRoot, value);
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
const configuredUploadDir = process.env.UPLOAD_DIR?.trim();

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
  uploadDir: resolveFromApiRoot(configuredUploadDir || "./uploads"),
  previewCacheDir: resolveFromApiRoot(process.env.PREVIEW_CACHE_DIR ?? "./previews"),
  previewTextMaxBytes: numberFromEnv(process.env.PREVIEW_TEXT_MAX_BYTES, 100 * 1024),
  previewConversionMaxBytes: numberFromEnv(process.env.PREVIEW_CONVERSION_MAX_BYTES, 25 * 1024 * 1024),
  previewConversionTimeoutMs: numberFromEnv(process.env.PREVIEW_CONVERSION_TIMEOUT_MS, 15000),
  libreOfficePath: process.env.LIBREOFFICE_PATH ?? "soffice",
  contentDir: resolveFromApiRoot(process.env.CONTENT_DIR ?? "./content"),
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
  sessionSecretIsFallback: !configuredSessionSecret,
  calendarEncryptionKey: process.env.CALENDAR_ENCRYPTION_KEY?.trim() || null,
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || null,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() || "http://localhost:3001/api/calendar-connections/google/callback",
  calendarSyncEnabled: booleanFromEnv(process.env.CALENDAR_SYNC_ENABLED),
  calendarSyncIntervalMs: numberFromEnv(process.env.CALENDAR_SYNC_INTERVAL_MS, 15 * 60 * 1000),
  googlePushWebhookUrl: process.env.GOOGLE_PUSH_WEBHOOK_URL?.trim() || null
};
