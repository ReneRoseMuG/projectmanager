import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../config.js";
import type { DbClient } from "../../db/client.js";
import { calendarConnectionRepository, externalCalendarRepository } from "../../repositories/calendar.repository.js";
import { runConnectionSync } from "../calendar-sync.service.js";
import { ensureGoogleTargetCalendar } from "./google-calendar.service.js";
import { defaultGoogleFetch, ensureGoogleAccessToken, GoogleAuthError, type GoogleTokenFetch } from "./google-oauth.service.js";

/**
 * Google Push (events.watch) — AP-4.2. Registriert einen Push-Channel für den Zielkalender und
 * empfängt Änderungs-Benachrichtigungen über einen Webhook, der sofort den Sync der Verbindung
 * anstößt (statt auf den Scheduler-Tick zu warten).
 *
 * Vollständiger Kanal-Lebenszyklus: watch registriert + persistiert (channelId/resourceId/expiration
 * am Zielkalender), renewExpiringChannels erneuert vor Ablauf, stopGoogleWatch meldet beim Trennen ab.
 * Sicherheit: Die Channel-Id kodiert die Verbindung (pm-cal-<id>), der Token ist ein HMAC über die
 * Verbindung — der Webhook verifiziert beides durch Nachrechnen; gefälschte Aufrufe werden abgewiesen.
 *
 * Betriebsvoraussetzung: eine öffentlich erreichbare HTTPS-Webhook-URL (config.googlePushWebhookUrl).
 * Ohne sie bleibt der periodische Scheduler (AP-4.1) der Weg; Push ist reine Latenz-Optimierung. Der
 * reale Empfang echter Google-Zustellungen ist erst mit dieser URL abnehmbar (die Logik ist es hier).
 */

const CALENDARS_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const CHANNELS_STOP_URL = "https://www.googleapis.com/calendar/v3/channels/stop";
const CHANNEL_PREFIX = "pm-cal-";
/** Kanäle, die innerhalb dieses Fensters ablaufen, werden vom Renewal erneuert (Standard 24 h). */
const RENEWAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function pushChannelId(connectionId: number): string {
  return `${CHANNEL_PREFIX}${connectionId}`;
}

function connectionIdFromChannel(channelId: string): number | null {
  if (!channelId.startsWith(CHANNEL_PREFIX)) {
    return null;
  }
  const raw = Number(channelId.slice(CHANNEL_PREFIX.length));
  return Number.isInteger(raw) && raw > 0 ? raw : null;
}

/** Stabiler HMAC-Token über die Verbindung — ohne Persistenz allein durch Nachrechnen verifizierbar. */
export function signPushToken(connectionId: number): string {
  return createHmac("sha256", config.sessionSecret).update(`push.${connectionId}`).digest("base64url");
}

function verifyPushToken(connectionId: number, token: string): boolean {
  const expected = createHmac("sha256", config.sessionSecret).update(`push.${connectionId}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(token, "base64url");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface WatchResult {
  channelId: string;
  resourceId: string | null;
  expiration: string | null;
}

/** Registriert einen Google-Push-Channel (events.watch) für den Zielkalender der Verbindung. */
export async function watchGoogleCalendar(database: DbClient, connectionId: number, webhookUrl: string, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<WatchResult> {
  const target = await ensureGoogleTargetCalendar(database, connectionId, fetchImpl);
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const channelId = pushChannelId(connectionId);
  const response = await fetchImpl(`${CALENDARS_BASE}/${encodeURIComponent(target.externalId)}/events/watch`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ id: channelId, type: "web_hook", address: webhookUrl, token: signPushToken(connectionId) })
  });
  if (response.status !== 200) {
    throw new GoogleAuthError("exchange", `Google-Push-Registrierung fehlgeschlagen: HTTP ${response.status}.`);
  }
  const data = await response.json();
  const resourceId = typeof data.resourceId === "string" ? data.resourceId : null;
  const expiration = typeof data.expiration === "string" ? data.expiration : null;
  // Kanaldaten am Zielkalender persistieren — Basis für Renewal + channels.stop.
  await externalCalendarRepository.setPushChannel(database, target.id, { channelId, resourceId, expiration });
  return { channelId, resourceId, expiration };
}

/** Meldet den Push-Kanal des Zielkalenders bei Google ab (channels.stop) und löscht die lokalen Kanaldaten. */
export async function stopGoogleWatch(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<boolean> {
  const target = (await externalCalendarRepository.listByConnection(database, connectionId)).find((calendar) => calendar.pushChannelId);
  if (!target || !target.pushChannelId) {
    return false;
  }
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const response = await fetchImpl(CHANNELS_STOP_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ id: target.pushChannelId, resourceId: target.pushResourceId })
  });
  // 200/204 gestoppt; 404 = Kanal bereits weg — beides ist ein erfolgreicher Endzustand.
  if (![200, 204, 404].includes(response.status)) {
    throw new GoogleAuthError("exchange", `Google channels.stop fehlgeschlagen: HTTP ${response.status}.`);
  }
  await externalCalendarRepository.clearPushChannel(database, target.id);
  return true;
}

/**
 * Erneuert Push-Kanäle, die innerhalb des Schwellenfensters ablaufen (Renewal-Job, AP-4.2). Google-
 * Kanäle verfallen nach Tagen; ohne Erneuerung versiegt der Push. `now` ist injizierbar (Testzeit).
 */
export async function renewExpiringChannels(
  database: DbClient,
  webhookUrl: string,
  now: number,
  fetchImpl: GoogleTokenFetch = defaultGoogleFetch,
  thresholdMs: number = RENEWAL_THRESHOLD_MS
): Promise<{ renewed: number }> {
  let renewed = 0;
  for (const calendar of await externalCalendarRepository.listWithActivePushChannel(database)) {
    const expiresAt = calendar.pushExpiration ? Number(calendar.pushExpiration) : 0;
    if (Number.isFinite(expiresAt) && expiresAt > now + thresholdMs) {
      continue; // noch lange gültig
    }
    // Neu registrieren (Google erlaubt Überlappung); watchGoogleCalendar aktualisiert die Kanaldaten.
    await watchGoogleCalendar(database, calendar.connectionId, webhookUrl, fetchImpl);
    renewed += 1;
  }
  return { renewed };
}

/**
 * Verarbeitet eine Google-Push-Benachrichtigung: verifiziert Channel + HMAC-Token, ermittelt die
 * Verbindung und stößt deren Sync an. Liefert false bei ungültiger/gefälschter Benachrichtigung.
 */
export async function handlePushNotification(database: DbClient, channelId: string, token: string): Promise<boolean> {
  const connectionId = connectionIdFromChannel(channelId);
  if (connectionId === null || !verifyPushToken(connectionId, token)) {
    return false;
  }
  const connection = await calendarConnectionRepository.findById(database, connectionId);
  if (!connection) {
    return false;
  }
  await runConnectionSync(database, connection);
  return true;
}
