import { eq } from "drizzle-orm";
import type { DbClient } from "../../db/client.js";
import { events } from "../../db/schema.js";
import { insertId } from "../../db/query-utils.js";
import { calendarSyncStateRepository, eventMappingRepository } from "../../repositories/calendar.repository.js";
import { registerCalendarSyncHandler } from "../calendar-sync.service.js";
import { wallTimeIso } from "../ical-import.service.js";
import { exportDirtyMappedEvents, exportPendingLocalEvents, isLocallyModified, loadLocalEvent, versionOf } from "./google-export.service.js";
import { ensureGoogleTargetCalendar } from "./google-calendar.service.js";
import { defaultGoogleFetch, ensureGoogleAccessToken, GoogleAuthError, type GoogleTokenFetch } from "./google-oauth.service.js";

/**
 * Google → App Import-Sync (AP-2.3). Initial vollständig (events.list, singleEvents), danach
 * inkrementell per nextSyncToken inkl. Pagination. `status: cancelled` löscht lokal, HTTP 410
 * verwirft den Token und erzwingt einen sauberen Full-Resync. Idempotent über das event_mapping
 * (externalId = Google-Event-id). Serien werden von Google zu Einzelinstanzen expandiert.
 */

const EVENTS_BASE = "https://www.googleapis.com/calendar/v3/calendars";

interface GoogleTimePoint {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  iCalUID?: string;
  etag?: string;
  updated?: string;
  start?: GoogleTimePoint;
  end?: GoogleTimePoint;
}

/** True, wenn die Google-Änderung (RFC3339 `updated`) mindestens so neu ist wie der lokale Stand. */
function googleIsNewer(googleUpdated: string | undefined, localUpdatedAt: string): boolean {
  if (!googleUpdated) {
    return true; // ohne Google-Zeitstempel gewinnt die geteilte Remote-Quelle
  }
  return googleUpdated >= localUpdatedAt;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Wandelt eine Google-Zeitangabe in lokale Wandzeit ("YYYY-MM-DDTHH:mm:ss") + Ganztags-Flag. */
function mapGoogleTime(point: GoogleTimePoint): { iso: string; isAllDay: boolean } {
  if (point.date) {
    return { iso: `${point.date}T00:00:00`, isAllDay: true };
  }
  const dateTime = point.dateTime ?? "";
  if (point.timeZone) {
    return { iso: wallTimeIso(new Date(dateTime), point.timeZone), isAllDay: false };
  }
  // Ohne Zeitzone: den lokalen Wandzeit-Teil vor Offset/Z übernehmen.
  return { iso: dateTime.replace(/([+-]\d{2}:\d{2}|Z)$/, "").slice(0, 19), isAllDay: false };
}

interface EventsPage {
  status: number;
  items: GoogleEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

async function fetchEventsPage(accessToken: string, calendarId: string, params: Record<string, string | undefined>, fetchImpl: GoogleTokenFetch): Promise<EventsPage> {
  const url = new URL(`${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "true");
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  const response = await fetchImpl(url.toString(), { method: "GET", headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  const data = await response.json();
  return {
    status: response.status,
    items: Array.isArray(data.items) ? (data.items as GoogleEvent[]) : [],
    nextPageToken: typeof data.nextPageToken === "string" ? data.nextPageToken : undefined,
    nextSyncToken: typeof data.nextSyncToken === "string" ? data.nextSyncToken : undefined
  };
}

async function deleteByExternalId(database: DbClient, connectionId: number, externalId: string): Promise<number> {
  const mapping = await eventMappingRepository.findByExternalId(database, connectionId, externalId);
  if (!mapping) {
    return 0;
  }
  await database.delete(events).where(eq(events.id, mapping.localEventId));
  return 1;
}

type UpsertOutcome = "created" | "updated" | "skipped";

async function upsertGoogleEvent(database: DbClient, connectionId: number, externalCalendarId: number, event: GoogleEvent): Promise<UpsertOutcome> {
  if (!event.id || !event.start || !event.end) {
    return "skipped";
  }
  const incomingEtag = event.etag ?? null;
  const now = nowIso();
  const existing = await eventMappingRepository.findByExternalId(database, connectionId, event.id);

  if (existing) {
    // Echo-Vermeidung: identisches etag → seit unserem letzten Sync/Export unverändert, kein Rückschreiben.
    if (incomingEtag !== null && existing.etag === incomingEtag) {
      return "skipped";
    }
    const local = await loadLocalEvent(database, existing.localEventId);
    if (local && isLocallyModified(local, existing.seenVersion) && !googleIsNewer(event.updated, local.updatedAt)) {
      // Konflikt und die App-Version ist neuer → lokal behalten; nur das gesehene etag merken.
      // Der anschließende Push (AP-3.2 Orchestrator) trägt die App-Version zu Google.
      await eventMappingRepository.update(database, existing.id, { etag: incomingEtag });
      return "skipped";
    }
    // Kein Konflikt oder Google gewinnt → Google-Version übernehmen, Sync-Stand festhalten.
    const start = mapGoogleTime(event.start);
    const end = mapGoogleTime(event.end);
    await database
      .update(events)
      .set({ title: event.summary ?? "(ohne Titel)", description: event.description ?? null, startTime: start.iso, endTime: end.iso, isAllDay: start.isAllDay, updatedAt: now })
      .where(eq(events.id, existing.localEventId));
    await eventMappingRepository.update(database, existing.id, { etag: incomingEtag, iCalUid: event.iCalUID ?? null, seenVersion: versionOf(now) });
    return "updated";
  }

  const start = mapGoogleTime(event.start);
  const end = mapGoogleTime(event.end);
  const inserted = await database.insert(events).values({
    title: event.summary ?? "(ohne Titel)",
    description: event.description ?? null,
    startTime: start.iso,
    endTime: end.iso,
    isAllDay: start.isAllDay,
    origin: "google",
    readonly: false,
    createdAt: now,
    updatedAt: now
  });
  await eventMappingRepository.create(database, {
    connectionId,
    externalCalendarId,
    localEventId: insertId(inserted),
    externalId: event.id,
    iCalUid: event.iCalUID ?? null,
    etag: incomingEtag,
    seenVersion: versionOf(now),
    origin: "google",
    direction: "both"
  });
  return "created";
}

async function deleteAllOfCalendar(database: DbClient, externalCalendarId: number): Promise<void> {
  for (const mapping of await eventMappingRepository.listByExternalCalendar(database, externalCalendarId)) {
    await database.delete(events).where(eq(events.id, mapping.localEventId));
  }
}

export interface GoogleImportResult {
  changed: number;
  deleted: number;
  resynced: boolean;
}

/** Führt den (initialen oder inkrementellen) Import des Google-Zielkalenders aus. */
export async function importGoogleCalendar(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<GoogleImportResult> {
  const target = await ensureGoogleTargetCalendar(database, connectionId, fetchImpl);
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const state = await calendarSyncStateRepository.findByCalendar(database, connectionId, target.id);

  let syncToken = state?.syncToken ?? null;
  let pageToken: string | undefined;
  let newSyncToken: string | null = null;
  let changed = 0;
  let deleted = 0;
  let resynced = false;

  for (let guard = 0; guard < 1000; guard += 1) {
    const params = syncToken ? { syncToken, pageToken } : { pageToken, timeMin: "2000-01-01T00:00:00Z" };
    const page = await fetchEventsPage(accessToken, target.externalId, params, fetchImpl);

    if (page.status === 410) {
      // Ungültiger syncToken → Token verwerfen, lokalen Stand leeren, Full-Resync.
      await deleteAllOfCalendar(database, target.id);
      syncToken = null;
      pageToken = undefined;
      resynced = true;
      continue;
    }
    if (page.status !== 200) {
      throw new GoogleAuthError("exchange", `Google-Import fehlgeschlagen: HTTP ${page.status}.`);
    }

    for (const item of page.items) {
      if (!item.id) {
        continue;
      }
      if (item.status === "cancelled") {
        deleted += await deleteByExternalId(database, connectionId, item.id);
      } else {
        const outcome = await upsertGoogleEvent(database, connectionId, target.id, item);
        if (outcome !== "skipped") {
          changed += 1;
        }
      }
    }

    pageToken = page.nextPageToken;
    if (!pageToken) {
      newSyncToken = page.nextSyncToken ?? null;
      break;
    }
  }

  await calendarSyncStateRepository.upsert(database, { connectionId, externalCalendarId: target.id, syncToken: newSyncToken ?? undefined, lastSuccessAt: nowIso() });
  return { changed, deleted, resynced };
}

/**
 * Registriert den bidirektionalen Google-Sync-Handler im zentralen Dispatcher (AP-3.2).
 * Reihenfolge: erst Pull (Google→App, Echo-/Konfliktbehandlung), dann Push — neue App-Termine
 * (insert) und lokal geänderte bzw. bei einem Konflikt lokal gewonnene Termine (PATCH).
 */
export function registerGoogleSyncHandler(fetchImpl?: GoogleTokenFetch): void {
  registerCalendarSyncHandler("google", async (database, connection) => {
    await importGoogleCalendar(database, connection.id, fetchImpl);
    await exportPendingLocalEvents(database, connection.id, fetchImpl);
    await exportDirtyMappedEvents(database, connection.id, fetchImpl);
  });
}
