import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../config.js";
import type { DbClient } from "../../db/client.js";
import { calendarConnectionRepository } from "../../repositories/calendar.repository.js";
import { runConnectionSync } from "../calendar-sync.service.js";
import { ensureGoogleTargetCalendar } from "./google-calendar.service.js";
import { defaultGoogleFetch, ensureGoogleAccessToken, GoogleAuthError, type GoogleTokenFetch } from "./google-oauth.service.js";

/**
 * Google Push (events.watch) — AP-4.2 (optional). Registriert einen Push-Channel für den Zielkalender
 * und empfängt Änderungs-Benachrichtigungen über einen Webhook, der sofort den Sync der Verbindung
 * anstößt (statt auf den Scheduler-Tick zu warten).
 *
 * Aktivierung setzt eine öffentlich erreichbare HTTPS-Webhook-URL voraus (config.googlePushWebhookUrl,
 * z. B. via Reverse-Proxy/Tunnel). Ohne diese bleibt der periodische Scheduler (AP-4.1) der Weg.
 *
 * Bewusst zurückgestellt (AP-4.2), da ohne öffentliche Test-URL weder aktivierbar noch real abnehmbar:
 * persistente Channel-Verwaltung (channelId/resourceId/expiration), automatisches Kanal-Renewal vor
 * Ablauf und channels.stop beim Trennen. Der Polling-Scheduler (AP-4.1, inkl. Backoff) hält die Daten
 * in der Zwischenzeit konsistent — Push ist reine Latenz-Optimierung, kein Korrektheits-Baustein.
 *
 * Sicherheit ohne Channel-Persistenz: Die Channel-Id kodiert die Verbindung (pm-cal-<id>), der
 * mitgegebene Token ist ein HMAC über die Verbindung. Der Webhook verifiziert beide durch Nachrechnen
 * — eine gefälschte Benachrichtigung ohne gültigen Token wird abgewiesen.
 */

const CALENDARS_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const CHANNEL_PREFIX = "pm-cal-";

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
  return {
    channelId,
    resourceId: typeof data.resourceId === "string" ? data.resourceId : null,
    expiration: typeof data.expiration === "string" ? data.expiration : null
  };
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
