import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { events } from "../db/schema.js";
import { calendarSyncStateRepository, eventMappingRepository, externalCalendarRepository } from "../repositories/calendar.repository.js";
import { calendarMultiget, syncCollection, type CalDavFetch, type NextCloudCredentials } from "./caldav/caldav-client.js";
import { calendarCredentialService } from "./calendar-credential.service.js";
import { registerCalendarSyncHandler } from "./calendar-sync.service.js";
import { importNextCloudCalendar, importRawEvents, type ImportWindow } from "./ical-import.service.js";

export interface DeltaSyncResult {
  changed: number;
  deleted: number;
  resynced: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Löscht alle lokalen Termine, die zu einem NextCloud-href gehören (Einzeltermin oder alle Serien-Instanzen). */
async function deleteEventsByHref(database: DbClient, connectionId: number, href: string): Promise<number> {
  const mappings = await eventMappingRepository.listByConnection(database, connectionId);
  const matching = mappings.filter((mapping) => mapping.externalId === href || mapping.externalId.startsWith(`${href}#`));
  for (const mapping of matching) {
    // Kaskade am event -> event_mapping räumt den Mapping-Satz mit ab.
    await database.delete(events).where(eq(events.id, mapping.localEventId));
  }
  return matching.length;
}

async function deleteEventsOfCalendar(database: DbClient, externalCalendarId: number): Promise<void> {
  const mappings = await eventMappingRepository.listByExternalCalendar(database, externalCalendarId);
  for (const mapping of mappings) {
    await database.delete(events).where(eq(events.id, mapping.localEventId));
  }
}

/**
 * Delta-Abgleich eines NextCloud-Kalenders (AP-1.3): zieht per sync-token nur die Änderungen,
 * lädt geänderte Objekte gezielt per calendar-multiget nach und entfernt gelöschte lokal.
 * Ohne Änderung erfolgt KEIN Detail-Abruf. Bei ungültigem Token wird ein Full-Resync ausgelöst.
 * NextCloud bleibt Master — es werden ausschließlich lesende Requests gesendet.
 */
export async function deltaSyncNextCloudCalendar(
  database: DbClient,
  connectionId: number,
  externalCalendarId: number,
  credentials: NextCloudCredentials,
  window: ImportWindow,
  fetchImpl?: CalDavFetch
): Promise<DeltaSyncResult> {
  const calendar = await externalCalendarRepository.findById(database, externalCalendarId);
  if (!calendar) {
    return { changed: 0, deleted: 0, resynced: false };
  }
  const state = await calendarSyncStateRepository.findByCalendar(database, connectionId, externalCalendarId);
  const result = await syncCollection(credentials, calendar.externalId, state?.syncToken ?? null, fetchImpl);

  if (result.invalidToken) {
    await deleteEventsOfCalendar(database, externalCalendarId);
    const imported = await importNextCloudCalendar(database, connectionId, externalCalendarId, credentials, window, fetchImpl);
    const fresh = await syncCollection(credentials, calendar.externalId, null, fetchImpl);
    await calendarSyncStateRepository.upsert(database, { connectionId, externalCalendarId, syncToken: fresh.syncToken ?? undefined, lastSuccessAt: nowIso() });
    return { changed: imported.imported, deleted: 0, resynced: true };
  }

  let deleted = 0;
  for (const change of result.changes.filter((entry) => entry.deleted)) {
    deleted += await deleteEventsByHref(database, connectionId, change.href);
  }

  const changedHrefs = result.changes.filter((entry) => !entry.deleted).map((entry) => entry.href);
  let changed = 0;
  if (changedHrefs.length > 0) {
    // Geänderte Objekte: alte (Instanzen) verwerfen und frisch importieren — verhindert Waisen bei Serienänderungen.
    for (const href of changedHrefs) {
      await deleteEventsByHref(database, connectionId, href);
    }
    const raw = await calendarMultiget(credentials, calendar.externalId, changedHrefs, fetchImpl);
    const imported = await importRawEvents(database, connectionId, externalCalendarId, raw, window);
    changed = imported.imported;
  }

  await calendarSyncStateRepository.upsert(database, { connectionId, externalCalendarId, syncToken: result.syncToken ?? undefined, lastSuccessAt: nowIso() });
  return { changed, deleted, resynced: false };
}

/**
 * Registriert den NextCloud-Sync-Handler im zentralen Dispatcher (AP-0.3). Wird beim Serverstart
 * aufgerufen; der Scheduler (AP-4.1) und der manuelle Sync nutzen ihn dann pro Verbindung.
 */
/** Standard-Importfenster: einen Monat rückwirkend bis zwölf Monate voraus (relativ zu jetzt). */
export function defaultImportWindow(): ImportWindow {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 1);
  const to = new Date(now);
  to.setMonth(to.getMonth() + 12);
  return { from, to };
}

export function registerNextCloudSyncHandler(windowProvider: () => ImportWindow = defaultImportWindow, fetchImpl?: CalDavFetch): void {
  registerCalendarSyncHandler("nextcloud", async (database, connection) => {
    const credentials = await calendarCredentialService.load(database, connection.id);
    if (!credentials) {
      throw new Error("Für diese NextCloud-Verbindung sind keine Zugangsdaten hinterlegt.");
    }
    const calendars = await externalCalendarRepository.listByConnection(database, connection.id);
    for (const calendar of calendars.filter((entry) => entry.imported)) {
      await deltaSyncNextCloudCalendar(database, connection.id, calendar.id, credentials as unknown as NextCloudCredentials, windowProvider(), fetchImpl);
    }
  });
}
