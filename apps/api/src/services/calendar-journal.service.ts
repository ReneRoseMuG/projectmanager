import type { CalendarJournalEntry } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { CALENDAR_JOURNAL_EVENT_TYPES } from "../db/schema.js";
import { calendarSyncJournalRepository, type CalendarConnectionRecord, type CalendarJournalRecord } from "../repositories/calendar.repository.js";

/**
 * Sync-Journal (AP-4.3, FT(10)). Protokolliert Verbindungs-Anlage/-Trennung, Sync-Läufe, Fehler und
 * Konflikte. Das Schreiben ist Best-Effort: ein Journal-Fehler darf die eigentliche Aktion (Sync,
 * Anlage, Trennung) niemals abbrechen — Nachvollziehbarkeit ist wichtig, aber nicht kritischer als
 * die Kernfunktion.
 */

export type CalendarJournalEventType = (typeof CALENDAR_JOURNAL_EVENT_TYPES)[number];

export async function recordJournal(
  database: DbClient,
  input: { userId: number; connectionId?: number | null; connectionLabel: string; eventType: CalendarJournalEventType; message?: string | null }
): Promise<void> {
  try {
    await calendarSyncJournalRepository.create(database, input);
  } catch {
    // Best-Effort: Journal-Schreibfehler nicht weiterreichen.
  }
}

/** Bequemer Weg für verbindungsbezogene Einträge — userId/Label kommen aus der Verbindung. */
export async function recordConnectionJournal(
  database: DbClient,
  connection: Pick<CalendarConnectionRecord, "id" | "userId" | "displayName">,
  eventType: CalendarJournalEventType,
  message?: string | null
): Promise<void> {
  await recordJournal(database, { userId: connection.userId, connectionId: connection.id, connectionLabel: connection.displayName, eventType, message });
}

function mapJournalEntry(record: CalendarJournalRecord): CalendarJournalEntry {
  return {
    id: record.id,
    connectionId: record.connectionId,
    connectionLabel: record.connectionLabel,
    eventType: record.eventType,
    message: record.message,
    createdAt: record.createdAt
  };
}

/** Liefert das Sync-Journal eines Nutzers (neueste zuerst) für die Status-/Verlaufsanzeige. */
export async function listCalendarJournal(database: DbClient, userId: number): Promise<CalendarJournalEntry[]> {
  return (await calendarSyncJournalRepository.listByUser(database, userId)).map(mapJournalEntry);
}
