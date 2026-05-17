import type { DumpDriveConfig } from "@taskmanager/shared-types";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { appSettings } from "../db/schema.js";
import { badRequest } from "../utils/errors.js";
import { nowIso, requireNonEmpty } from "./helpers.js";

const GOOGLE_DRIVE_BACKUP_FOLDER_KEY = "googleDriveBackupFolderId";
const GOOGLE_DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{8,}$/;

function buildFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export function normalizeGoogleDriveFolderId(input: string): string {
  const trimmed = requireNonEmpty(input, "folderInput");
  let candidate = trimmed;

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const foldersIndex = segments.indexOf("folders");
    const folderSegment = foldersIndex >= 0 ? segments[foldersIndex + 1] : undefined;
    candidate = folderSegment ?? url.searchParams.get("id") ?? trimmed;
  } catch {
    candidate = trimmed;
  }

  const normalized = candidate.trim();
  if (!GOOGLE_DRIVE_FOLDER_ID_PATTERN.test(normalized)) {
    throw badRequest("Google Drive folder input must be a folder URL or folder ID");
  }

  return normalized;
}

function getStoredFolderSetting(database: DbClient): { value: string; updatedAt: string } | null {
  return (
    database
      .select({
        value: appSettings.value,
        updatedAt: appSettings.updatedAt
      })
      .from(appSettings)
      .where(eq(appSettings.key, GOOGLE_DRIVE_BACKUP_FOLDER_KEY))
      .get() ?? null
  );
}

function hasOAuthConfig(): boolean {
  return Boolean(config.googleDriveClientId && config.googleDriveClientSecret && config.googleDriveRefreshToken);
}

export function getEffectiveGoogleDriveBackupFolderId(database: DbClient): string | null {
  const stored = getStoredFolderSetting(database);
  return stored?.value ?? config.googleDriveBackupFolderId ?? null;
}

export function getDriveBackupConfig(database: DbClient): DumpDriveConfig {
  const stored = getStoredFolderSetting(database);
  const folderId = stored?.value ?? config.googleDriveBackupFolderId ?? null;
  const oauthConfigured = hasOAuthConfig();

  return {
    folderId,
    folderUrl: folderId ? buildFolderUrl(folderId) : null,
    source: stored ? "database" : config.googleDriveBackupFolderId ? "environment" : "missing",
    oauthConfigured,
    ready: Boolean(folderId && oauthConfigured),
    updatedAt: stored?.updatedAt ?? null
  };
}

export function updateDriveBackupConfig(database: DbClient, input: { folderInput?: string }): DumpDriveConfig {
  const folderId = normalizeGoogleDriveFolderId(input.folderInput ?? "");
  const updatedAt = nowIso();
  database
    .insert(appSettings)
    .values({
      key: GOOGLE_DRIVE_BACKUP_FOLDER_KEY,
      value: folderId,
      updatedAt
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: folderId,
        updatedAt
      }
    })
    .run();

  return getDriveBackupConfig(database);
}
