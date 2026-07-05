import { eq } from "drizzle-orm";
import type { DbClient } from "../../db/client.js";
import { events } from "../../db/schema.js";
import { eventMappingRepository } from "../../repositories/calendar.repository.js";
import { ensureGoogleTargetCalendar } from "./google-calendar.service.js";
import { defaultGoogleFetch, ensureGoogleAccessToken, GoogleAuthError, type GoogleTokenFetch } from "./google-oauth.service.js";

/**
 * App → Google Export (AP-3.1). Lokale Termine werden als Google-Events angelegt (events.insert),
 * aktualisiert (events.update/PATCH) oder gelöscht (events.delete). Das event_mapping verknüpft
 * den lokalen Termin mit der Google-Event-id und macht den Export idempotent.
 *
 * Zeitbehandlung: Lokale Termine liegen als Wandzeit ("YYYY-MM-DDTHH:mm:ss") ohne Offset vor. Sie
 * werden mit expliziter App-Zeitzone an Google übergeben (dateTime + timeZone), sodass Google die
 * Wandzeit inkl. Sommer-/Winterzeit korrekt einordnet. Die beidseitige Zeitzonen-/Serienbehandlung
 * wird in AP-3.3 vertieft.
 *
 * Der origin-Filter (nur "local") liegt bewusst im Batch, nicht in exportEventToGoogle — so kann die
 * bidirektionale Rückpropagierung (AP-3.2) dieselbe Export-Mechanik für geänderte Google-Termine nutzen.
 */

const EVENTS_BASE = "https://www.googleapis.com/calendar/v3/calendars";
/** App-seitige Zeitzone der Wandzeit-Termine. AP-3.3 kann dies pro Verbindung/Kalender verfeinern. */
const APP_TIME_ZONE = "Europe/Berlin";

type GoogleTimeValue = { dateTime: string; timeZone: string } | { date: string };

interface GoogleEventPayload {
  summary: string;
  description?: string;
  start: GoogleTimeValue;
  end: GoogleTimeValue;
}

/** Wandelt eine lokale Wandzeit in eine Google-Zeitangabe (Ganztag → date, sonst dateTime + timeZone). */
function toGoogleTime(iso: string, isAllDay: boolean): GoogleTimeValue {
  if (isAllDay) {
    return { date: iso.slice(0, 10) };
  }
  return { dateTime: iso.slice(0, 19), timeZone: APP_TIME_ZONE };
}

function toPayload(event: typeof events.$inferSelect): GoogleEventPayload {
  return {
    summary: event.title,
    description: event.description ?? undefined,
    start: toGoogleTime(event.startTime, event.isAllDay),
    end: toGoogleTime(event.endTime, event.isAllDay)
  };
}

export interface ExportOutcome {
  action: "insert" | "update" | "skipped";
  externalId?: string;
}

async function loadEvent(database: DbClient, localEventId: number): Promise<typeof events.$inferSelect | undefined> {
  const [event] = await database.select().from(events).where(eq(events.id, localEventId));
  return event;
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" };
}

/**
 * Exportiert einen lokalen Termin nach Google. Legt ihn bei fehlendem Mapping an (insert) und
 * aktualisiert ihn andernfalls (update). Die Aufrufer-Ebene entscheidet, welche Termine exportiert werden.
 */
export async function exportEventToGoogle(database: DbClient, connectionId: number, localEventId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<ExportOutcome> {
  const event = await loadEvent(database, localEventId);
  if (!event) {
    return { action: "skipped" };
  }
  const target = await ensureGoogleTargetCalendar(database, connectionId, fetchImpl);
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const body = JSON.stringify(toPayload(event));
  const mapping = await eventMappingRepository.findByLocalEvent(database, localEventId);

  if (mapping) {
    const response = await fetchImpl(`${EVENTS_BASE}/${encodeURIComponent(target.externalId)}/events/${encodeURIComponent(mapping.externalId)}`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body
    });
    if (response.status !== 200) {
      throw new GoogleAuthError("exchange", `Google-Aktualisierung fehlgeschlagen: HTTP ${response.status}.`);
    }
    const data = await response.json();
    await eventMappingRepository.update(database, mapping.id, { etag: typeof data.etag === "string" ? data.etag : null });
    return { action: "update", externalId: mapping.externalId };
  }

  const response = await fetchImpl(`${EVENTS_BASE}/${encodeURIComponent(target.externalId)}/events`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body
  });
  if (response.status !== 200) {
    throw new GoogleAuthError("exchange", `Google-Anlage fehlgeschlagen: HTTP ${response.status}.`);
  }
  const data = await response.json();
  if (typeof data.id !== "string") {
    throw new GoogleAuthError("exchange", "Google lieferte keine Event-id für den exportierten Termin.");
  }
  await eventMappingRepository.create(database, {
    connectionId,
    externalCalendarId: target.id,
    localEventId,
    externalId: data.id,
    iCalUid: typeof data.iCalUID === "string" ? data.iCalUID : null,
    etag: typeof data.etag === "string" ? data.etag : null,
    origin: "local",
    direction: "both"
  });
  return { action: "insert", externalId: data.id };
}

/** Löscht einen zuvor exportierten Termin bei Google und entfernt das Mapping. Idempotent (404/410 = bereits weg). */
export async function deleteExportedEvent(database: DbClient, connectionId: number, localEventId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<boolean> {
  const mapping = await eventMappingRepository.findByLocalEvent(database, localEventId);
  if (!mapping) {
    return false;
  }
  const target = await ensureGoogleTargetCalendar(database, connectionId, fetchImpl);
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const response = await fetchImpl(`${EVENTS_BASE}/${encodeURIComponent(target.externalId)}/events/${encodeURIComponent(mapping.externalId)}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  // 200/204 gelöscht; 404/410 bereits entfernt — beides ist ein erfolgreicher Endzustand.
  if (![200, 204, 404, 410].includes(response.status)) {
    throw new GoogleAuthError("exchange", `Google-Löschung fehlgeschlagen: HTTP ${response.status}.`);
  }
  await eventMappingRepository.delete(database, mapping.id);
  return true;
}

export interface ExportBatchResult {
  inserted: number;
}

/**
 * Erst-Export aller App-eigenen Termine (origin=local) ohne Google-Mapping. Bereits gemappte Termine
 * werden übersprungen — die Aktualisierung geänderter Termine läuft ereignisgetrieben (AP-3.2), nicht
 * als Massen-Update, um die Google-API nicht bei jedem Sync mit unveränderten Terminen zu belasten.
 */
export async function exportPendingLocalEvents(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<ExportBatchResult> {
  const localEvents = await database.select().from(events).where(eq(events.origin, "local"));
  let inserted = 0;
  for (const event of localEvents) {
    const mapping = await eventMappingRepository.findByLocalEvent(database, event.id);
    if (mapping) {
      continue;
    }
    const outcome = await exportEventToGoogle(database, connectionId, event.id, fetchImpl);
    if (outcome.action === "insert") {
      inserted += 1;
    }
  }
  return { inserted };
}
