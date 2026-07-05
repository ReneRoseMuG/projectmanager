import ical from "node-ical";
import type { DbClient, DbSession } from "../db/client.js";
import { eventMappingRepository, externalCalendarRepository } from "../repositories/calendar.repository.js";
import { events } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { insertId } from "../db/query-utils.js";
import { fetchCalendarEvents, type CalDavFetch, type NextCloudCredentials } from "./caldav/caldav-client.js";

/**
 * Importiert NextCloud-Kalender als lokale read-only Termine (AP-1.2).
 *
 * Zeitbehandlung: Termine werden als lokale Wandzeit ("YYYY-MM-DDTHH:mm:ss") gespeichert. Die
 * Uhrzeit einer Serie bleibt über Sommer-/Winterzeit hinweg konstant (ein 10:00-Termin bleibt
 * 10:00), das Datum jeder Instanz kommt aus der RRULE-Expansion — so entsteht kein DST-Off-by-one.
 * Serien werden in Einzelinstanzen expandiert (jede = ein Termin + event_mapping mit stabiler ID
 * `href#instanceStart`), Ausnahmen (EXDATE) ausgelassen und Overrides berücksichtigt.
 */

export interface EventDraft {
  externalId: string;
  iCalUid: string | null;
  etag: string | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

export interface ImportWindow {
  from: Date;
  to: Date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Wandzeit eines absoluten Zeitpunkts in der gegebenen IANA-Zeitzone als "YYYY-MM-DDTHH:mm:ss". */
export function wallTimeIso(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}`;
}

/** Reines Datum eines Ganztagstermins als "YYYY-MM-DD". node-ical legt date-only Werte auf die
 *  lokale Mitternacht des Zieltags — daher die lokalen Datumsfelder (verhindert Tagesverschiebung). */
function allDayDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Addiert eine Dauer (ms) zu einer Wandzeit, ohne DST-Sprünge (floating-Interpretation). */
function addDurationToWall(startIso: string, durationMs: number): string {
  const floating = new Date(`${startIso}Z`);
  const shifted = new Date(floating.getTime() + durationMs);
  return shifted.toISOString().slice(0, 19);
}

type ParsedVEvent = {
  type?: string;
  uid?: string;
  summary?: string;
  description?: string;
  start?: Date & { tz?: string };
  end?: Date & { tz?: string };
  datetype?: string;
  recurrenceid?: Date;
  rrule?: { between(after: Date, before: Date, inc?: boolean): Date[]; origOptions?: { tzid?: string } };
  exdate?: Record<string, Date>;
  recurrences?: Record<string, ParsedVEvent>;
};

function timezoneOf(vevent: ParsedVEvent): string {
  return vevent.start?.tz ?? vevent.rrule?.origOptions?.tzid ?? "UTC";
}

function draftFromInstance(vevent: ParsedVEvent, href: string, etag: string | null, startIso: string, endIso: string, isRecurringInstance: boolean): EventDraft {
  return {
    externalId: isRecurringInstance ? `${href}#${startIso}` : href,
    iCalUid: vevent.uid ?? null,
    etag,
    title: vevent.summary ?? "(ohne Titel)",
    description: vevent.description ?? null,
    startTime: startIso,
    endTime: endIso,
    isAllDay: vevent.datetype === "date"
  };
}

/** Expandiert ein VEVENT (ggf. mit Serie) zu Termin-Entwürfen innerhalb des Zeitfensters. */
export function veventToDrafts(vevent: ParsedVEvent, href: string, etag: string | null, window: ImportWindow): EventDraft[] {
  if (!vevent.start || !vevent.end) {
    return [];
  }
  const timeZone = timezoneOf(vevent);
  const isAllDay = vevent.datetype === "date";
  const durationMs = vevent.end.getTime() - vevent.start.getTime();

  if (!vevent.rrule) {
    const startIso = isAllDay ? `${allDayDate(vevent.start)}T00:00:00` : wallTimeIso(vevent.start, timeZone);
    const endIso = isAllDay ? `${allDayDate(vevent.end)}T00:00:00` : wallTimeIso(vevent.end, timeZone);
    return [draftFromInstance(vevent, href, etag, startIso, endIso, false)];
  }

  const timePart = wallTimeIso(vevent.start, timeZone).slice(11);
  const excluded = new Set(Object.keys(vevent.exdate ?? {}).map((key) => key.slice(0, 10)));
  const drafts: EventDraft[] = [];

  for (const occurrence of vevent.rrule.between(window.from, window.to, true)) {
    const datePart = `${occurrence.getUTCFullYear()}-${pad(occurrence.getUTCMonth() + 1)}-${pad(occurrence.getUTCDate())}`;
    if (excluded.has(datePart)) {
      continue;
    }
    const override = vevent.recurrences?.[datePart];
    if (override?.start && override.end) {
      const overrideStart = wallTimeIso(override.start, timezoneOf(override));
      const overrideEnd = wallTimeIso(override.end, timezoneOf(override));
      drafts.push(draftFromInstance(override, href, etag, overrideStart, overrideEnd, true));
      continue;
    }
    const startIso = isAllDay ? `${datePart}T00:00:00` : `${datePart}T${timePart}`;
    drafts.push(draftFromInstance(vevent, href, etag, startIso, addDurationToWall(startIso, durationMs), true));
  }
  return drafts;
}

function parseVEvents(ics: string): ParsedVEvent[] {
  const parsed = ical.sync.parseICS(ics) as Record<string, ParsedVEvent>;
  // Override-VEVENTs (mit RECURRENCE-ID) werden über recurrences des Masters behandelt — nicht doppelt.
  return Object.values(parsed).filter((component) => component.type === "VEVENT" && !component.recurrenceid);
}

async function persistDraft(database: DbSession, connectionId: number, externalCalendarId: number, draft: EventDraft): Promise<void> {
  const now = new Date().toISOString();
  const existing = await eventMappingRepository.findByExternalId(database, connectionId, draft.externalId);
  if (existing) {
    await database
      .update(events)
      .set({ title: draft.title, description: draft.description, startTime: draft.startTime, endTime: draft.endTime, isAllDay: draft.isAllDay, updatedAt: now })
      .where(eq(events.id, existing.localEventId));
    await eventMappingRepository.update(database, existing.id, { etag: draft.etag, iCalUid: draft.iCalUid });
    return;
  }
  const inserted = await database.insert(events).values({
    title: draft.title,
    description: draft.description,
    startTime: draft.startTime,
    endTime: draft.endTime,
    isAllDay: draft.isAllDay,
    origin: "nextcloud",
    readonly: true,
    createdAt: now,
    updatedAt: now
  });
  await eventMappingRepository.create(database, {
    connectionId,
    externalCalendarId,
    localEventId: insertId(inserted),
    externalId: draft.externalId,
    iCalUid: draft.iCalUid,
    etag: draft.etag,
    origin: "nextcloud",
    direction: "import"
  });
}

/** Importiert die iCal-Rohdaten eines Kalenders idempotent in lokale read-only Termine. */
export async function importRawEvents(
  database: DbClient,
  connectionId: number,
  externalCalendarId: number,
  rawEvents: Array<{ href: string; etag: string | null; ics: string }>,
  window: ImportWindow
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  for (const raw of rawEvents) {
    let drafts: EventDraft[];
    try {
      drafts = parseVEvents(raw.ics).flatMap((vevent) => veventToDrafts(vevent, raw.href, raw.etag, window));
    } catch {
      skipped += 1;
      continue;
    }
    for (const draft of drafts) {
      await database.transaction(async (tx) => {
        await persistDraft(tx as unknown as DbSession, connectionId, externalCalendarId, draft);
      });
      imported += 1;
    }
  }
  return { imported, skipped };
}

/** Voller Initialimport eines ausgewählten NextCloud-Kalenders. */
export async function importNextCloudCalendar(
  database: DbClient,
  connectionId: number,
  externalCalendarId: number,
  credentials: NextCloudCredentials,
  window: ImportWindow,
  fetchImpl?: CalDavFetch
): Promise<{ imported: number; skipped: number }> {
  const calendar = await externalCalendarRepository.findById(database, externalCalendarId);
  if (!calendar) {
    return { imported: 0, skipped: 0 };
  }
  const rawEvents = await fetchCalendarEvents(credentials, calendar.externalId, fetchImpl);
  return importRawEvents(database, connectionId, externalCalendarId, rawEvents, window);
}
