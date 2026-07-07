import {
  CALENDAR_SYNC_DEFAULT_INTERVAL_MS,
  CALENDAR_SYNC_MIN_INTERVAL_MS,
  type CalendarSyncConfigView,
  type CurrentUser,
  type UpdateCalendarSyncConfigRequest
} from "@taskmanager/shared-types";
import { config } from "../config.js";
import type { DbClient } from "../db/client.js";
import { settingsRepository } from "../repositories/settings.repository.js";
import { badRequest, forbidden } from "../utils/errors.js";
import { getCredentialCipher } from "./credential-cipher.js";
import { hasPermission } from "./roles.service.js";

/**
 * Zentrale Kalender-Sync-Konfiguration (MS-79). Die sechs Werte werden als EINE versionierte Zeile
 * im generischen Settings-Speicher (settings_values, GLOBAL) gehalten, damit sie nur einmal statt je
 * Arbeitsplatz in der .env gepflegt werden müssen. Das Client-Secret liegt verschlüsselt (derselbe
 * Cipher wie die Kalender-Zugangsdaten); der Klartext verlässt den Server nie.
 *
 * Vorrangkette je Wert: DB-Zeile → .env (config) → Default. So bleibt die bestehende .env als
 * Rückfallebene gültig und die Umstellung ist bruchfrei.
 *
 * Dieser Service kennt den Scheduler NICHT (Zirkelvermeidung) — die Scheduler-Nachführung nach einer
 * Änderung orchestriert der Aufrufer (Route/Boot) über applyCalendarSchedulerState.
 */

export const CALENDAR_SYNC_CONFIG_KEY = "calendar.sync.config";
export const CALENDAR_SYNC_CONFIG_SCOPE_TYPE = "GLOBAL" as const;
export const CALENDAR_SYNC_CONFIG_SCOPE_ID = "global";

/** In der DB abgelegte Form; das Secret ist der base64-Cipher-Payload, nie Klartext. */
interface StoredCalendarConfig {
  googleClientId: string;
  googleClientSecretCipher: string | null;
  googleRedirectUri: string;
  syncEnabled: boolean;
  syncIntervalMs: number;
  googlePushWebhookUrl: string;
}

/** Serverseitig aufgelöste, wirksame Konfiguration inkl. Klartext-Secret — NICHT an Clients geben. */
export interface EffectiveCalendarConfig {
  googleClientId: string | null;
  googleClientSecret: string | null;
  googleRedirectUri: string;
  syncEnabled: boolean;
  syncIntervalMs: number;
  googlePushWebhookUrl: string | null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseStored(valueJson: string): StoredCalendarConfig | null {
  let raw: Partial<StoredCalendarConfig>;
  try {
    raw = JSON.parse(valueJson) as Partial<StoredCalendarConfig>;
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const intervalValid = typeof raw.syncIntervalMs === "number" && raw.syncIntervalMs >= CALENDAR_SYNC_MIN_INTERVAL_MS;
  return {
    googleClientId: typeof raw.googleClientId === "string" ? raw.googleClientId : "",
    googleClientSecretCipher: typeof raw.googleClientSecretCipher === "string" ? raw.googleClientSecretCipher : null,
    googleRedirectUri: typeof raw.googleRedirectUri === "string" ? raw.googleRedirectUri : "",
    syncEnabled: raw.syncEnabled === true,
    syncIntervalMs: intervalValid ? (raw.syncIntervalMs as number) : CALENDAR_SYNC_DEFAULT_INTERVAL_MS,
    googlePushWebhookUrl: typeof raw.googlePushWebhookUrl === "string" ? raw.googlePushWebhookUrl : ""
  };
}

async function loadRow(db: DbClient): Promise<{ stored: StoredCalendarConfig | null; version: number }> {
  const record = await settingsRepository.findByScope(db, CALENDAR_SYNC_CONFIG_KEY, CALENDAR_SYNC_CONFIG_SCOPE_TYPE, CALENDAR_SYNC_CONFIG_SCOPE_ID);
  if (!record) {
    return { stored: null, version: 0 };
  }
  return { stored: parseStored(record.valueJson), version: record.version };
}

/** Entschlüsselt das Secret defensiv — fehlender Schlüssel oder beschädigter Payload zählt als "kein Secret". */
function decryptSecret(cipher: string | null): string | null {
  if (!cipher) {
    return null;
  }
  try {
    return getCredentialCipher().decrypt(cipher);
  } catch {
    return null;
  }
}

/** Reine Auflösung DB → .env → Default, ohne DB-Zugriff (der Aufrufer lädt die Zeile einmal). */
function resolveEffective(stored: StoredCalendarConfig | null): EffectiveCalendarConfig {
  return {
    googleClientId: nonEmpty(stored?.googleClientId) ?? config.googleClientId,
    googleClientSecret: stored?.googleClientSecretCipher ? decryptSecret(stored.googleClientSecretCipher) : config.googleClientSecret,
    googleRedirectUri: nonEmpty(stored?.googleRedirectUri) ?? config.googleRedirectUri,
    syncEnabled: stored ? stored.syncEnabled : config.calendarSyncEnabled,
    syncIntervalMs: stored ? stored.syncIntervalMs : config.calendarSyncIntervalMs,
    googlePushWebhookUrl: nonEmpty(stored?.googlePushWebhookUrl) ?? config.googlePushWebhookUrl
  };
}

/** Wirksame Konfiguration für die Server-Nutzung (OAuth, Scheduler). Enthält das Klartext-Secret. */
export async function getEffectiveCalendarConfig(db: DbClient): Promise<EffectiveCalendarConfig> {
  const { stored } = await loadRow(db);
  return resolveEffective(stored);
}

/** Maskierte Sicht für die Admin-Oberfläche — nie mit Klartext-Secret. */
export async function getCalendarSyncConfigView(db: DbClient): Promise<CalendarSyncConfigView> {
  const { stored, version } = await loadRow(db);
  const effective = resolveEffective(stored);
  const secretSet = stored ? Boolean(stored.googleClientSecretCipher) : Boolean(config.googleClientSecret);
  return {
    googleClientId: effective.googleClientId ?? "",
    googleClientSecretSet: secretSet,
    googleRedirectUri: effective.googleRedirectUri,
    syncEnabled: effective.syncEnabled,
    syncIntervalMs: effective.syncIntervalMs,
    googlePushWebhookUrl: effective.googlePushWebhookUrl ?? "",
    version,
    usingEnvFallback: stored === null,
    encryptionKeyConfigured: Boolean(config.calendarEncryptionKey)
  };
}

/**
 * Speichert die Konfiguration (nur mit settings:admin). Secret-Feld: undefined/null lässt es
 * unverändert, "" entfernt es, ein nicht-leerer Wert wird verschlüsselt neu abgelegt. Der
 * Versionskonflikt (VersionConflictError) wird vom globalen Error-Handler auf 409 gemappt.
 */
export async function updateCalendarSyncConfig(db: DbClient, currentUser: CurrentUser, input: UpdateCalendarSyncConfigRequest): Promise<CalendarSyncConfigView> {
  if (!hasPermission(currentUser.role, "settings", "admin")) {
    throw forbidden("Nur Administratoren dürfen die Kalender-Synchronisation konfigurieren");
  }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    throw badRequest("expectedVersion must be an integer greater than or equal to 0");
  }
  if (!Number.isInteger(input.syncIntervalMs) || input.syncIntervalMs < CALENDAR_SYNC_MIN_INTERVAL_MS) {
    throw badRequest(`syncIntervalMs must be an integer of at least ${CALENDAR_SYNC_MIN_INTERVAL_MS} ms`);
  }

  const { stored } = await loadRow(db);
  let secretCipher = stored?.googleClientSecretCipher ?? null;
  if (input.googleClientSecret === "") {
    secretCipher = null;
  } else if (typeof input.googleClientSecret === "string" && input.googleClientSecret.length > 0) {
    if (!config.calendarEncryptionKey) {
      throw badRequest("CALENDAR_ENCRYPTION_KEY ist nicht konfiguriert — das Client-Secret kann nicht verschlüsselt gespeichert werden.");
    }
    secretCipher = getCredentialCipher().encrypt(input.googleClientSecret);
  }

  const next: StoredCalendarConfig = {
    googleClientId: input.googleClientId.trim(),
    googleClientSecretCipher: secretCipher,
    googleRedirectUri: input.googleRedirectUri.trim(),
    syncEnabled: input.syncEnabled,
    syncIntervalMs: input.syncIntervalMs,
    googlePushWebhookUrl: input.googlePushWebhookUrl.trim()
  };

  await settingsRepository.upsertWithVersion(db, {
    settingKey: CALENDAR_SYNC_CONFIG_KEY,
    scopeType: CALENDAR_SYNC_CONFIG_SCOPE_TYPE,
    scopeId: CALENDAR_SYNC_CONFIG_SCOPE_ID,
    valueJson: JSON.stringify(next),
    updatedBy: currentUser.id,
    expectedVersion: input.expectedVersion
  });

  return getCalendarSyncConfigView(db);
}
