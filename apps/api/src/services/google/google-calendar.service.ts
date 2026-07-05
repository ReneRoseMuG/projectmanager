import type { DbClient, DbSession } from "../../db/client.js";
import { externalCalendarRepository, type ExternalCalendarRecord } from "../../repositories/calendar.repository.js";
import { badRequest } from "../../utils/errors.js";
import { defaultGoogleFetch, ensureGoogleAccessToken, GoogleAuthError, type GoogleTokenFetch } from "./google-oauth.service.js";

/**
 * Google Calendar API — Zielkalender-Auswahl (AP-2.2). Nur beschreibbare Kalender (accessRole
 * owner/writer) sind als Ziel zulässig; ohne getroffene Auswahl fällt das System auf den primären
 * Kalender zurück. Der HTTP-Zugriff ist injizierbar (Tests ohne echtes Google).
 */

const CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  backgroundColor: string | null;
  accessRole: string;
  primary: boolean;
  writable: boolean;
}

interface RawCalendarListEntry {
  id?: string;
  summary?: string;
  backgroundColor?: string;
  accessRole?: string;
  primary?: boolean;
}

function isWritable(accessRole: string | undefined): boolean {
  return accessRole === "owner" || accessRole === "writer";
}

/** Ruft die Kalenderliste des Google-Kontos ab (alle, inkl. Lesekalender — Filterung erfolgt in der UI/Auswahl). */
export async function listGoogleCalendars(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<GoogleCalendarOption[]> {
  const accessToken = await ensureGoogleAccessToken(database, connectionId, fetchImpl);
  const response = await fetchImpl(CALENDAR_LIST_URL, { method: "GET", headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  const data = await response.json();
  if (response.status !== 200) {
    throw new GoogleAuthError("exchange", `Google-Kalenderliste konnte nicht geladen werden: ${String(data.error ?? response.status)}`);
  }
  const items = Array.isArray(data.items) ? (data.items as RawCalendarListEntry[]) : [];
  return items
    .filter((item): item is RawCalendarListEntry & { id: string } => typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      summary: item.summary ?? item.id,
      backgroundColor: item.backgroundColor ?? null,
      accessRole: item.accessRole ?? "reader",
      primary: Boolean(item.primary),
      writable: isWritable(item.accessRole)
    }));
}

/** Wählt einen beschreibbaren Google-Kalender als Ziel und persistiert die Auswahl je Verbindung. */
export async function selectGoogleCalendar(database: DbClient, connectionId: number, calendarId: string, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<ExternalCalendarRecord> {
  const calendars = await listGoogleCalendars(database, connectionId, fetchImpl);
  const chosen = calendars.find((calendar) => calendar.id === calendarId);
  if (!chosen) {
    throw badRequest("Der gewählte Google-Kalender wurde nicht gefunden.");
  }
  if (!chosen.writable) {
    throw badRequest("Nur beschreibbare Kalender (owner/writer) können als Ziel gewählt werden.");
  }
  return database.transaction(async (tx) => {
    const txDb = tx as unknown as DbSession;
    for (const calendar of await externalCalendarRepository.listByConnection(txDb, connectionId)) {
      if (calendar.imported && calendar.externalId !== calendarId) {
        await externalCalendarRepository.setImported(txDb, calendar.id, false);
      }
    }
    return externalCalendarRepository.upsert(txDb, {
      connectionId,
      externalId: calendarId,
      name: chosen.summary,
      color: chosen.backgroundColor ?? undefined,
      imported: true,
      readonly: false
    });
  });
}

/**
 * Liefert den aktuellen Google-Zielkalender. Ist keiner gewählt, wird nachvollziehbar auf den
 * primären (sonst ersten beschreibbaren) Kalender zurückgefallen und dieser persistiert.
 */
export async function ensureGoogleTargetCalendar(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<ExternalCalendarRecord> {
  const selected = (await externalCalendarRepository.listByConnection(database, connectionId)).find((calendar) => calendar.imported);
  if (selected) {
    return selected;
  }
  const calendars = await listGoogleCalendars(database, connectionId, fetchImpl);
  const fallback = calendars.find((calendar) => calendar.primary && calendar.writable) ?? calendars.find((calendar) => calendar.writable);
  if (!fallback) {
    throw badRequest("Kein beschreibbarer Google-Kalender verfügbar.");
  }
  return selectGoogleCalendar(database, connectionId, fallback.id, fetchImpl);
}
