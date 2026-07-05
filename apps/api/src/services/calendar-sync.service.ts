import type { CalendarConnection, CalendarProvider } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { calendarConnectionRepository, type CalendarConnectionRecord, type RecordSyncResultInput } from "../repositories/calendar.repository.js";
import { notFound } from "../utils/errors.js";
import { mapCalendarConnection } from "./calendar-connection.service.js";
import { recordConnectionJournal } from "./calendar-journal.service.js";

/**
 * Ein provider-spezifischer Sync-Handler führt den eigentlichen Abgleich einer Verbindung durch.
 * Handler werden von den Provider-Modulen registriert: NextCloud in Phase 1, Google in Phase 2/3.
 * Wirft der Handler, wird die Verbindung auf "error" mit der Fehlermeldung gesetzt.
 */
export type CalendarSyncHandler = (database: DbClient, connection: CalendarConnectionRecord) => Promise<void>;

const syncHandlers = new Map<CalendarProvider, CalendarSyncHandler>();

export function registerCalendarSyncHandler(provider: CalendarProvider, handler: CalendarSyncHandler): void {
  syncHandlers.set(provider, handler);
}

export function hasCalendarSyncHandler(provider: CalendarProvider): boolean {
  return syncHandlers.has(provider);
}

/** Für Tests: Registry leeren, um einen definierten Ausgangszustand herzustellen. */
export function clearCalendarSyncHandlers(): void {
  syncHandlers.clear();
}

/**
 * Stößt den Sync einer Verbindung an: setzt den Status auf "syncing", ruft den provider-spezifischen
 * Handler und spiegelt Erfolg (status "active") oder Fehler (status "error" + Meldung) zurück in die
 * Verbindung. Ist (noch) kein Handler für den Anbieter registriert, wird das als kontrollierter
 * Fehlerzustand gemeldet — nicht als Erfolg.
 */
export async function syncCalendarConnection(database: DbClient, id: number, userId: number): Promise<CalendarConnection> {
  const connection = await calendarConnectionRepository.findById(database, id);
  if (!connection || connection.userId !== userId) {
    throw notFound(`Calendar connection ${id} not found`);
  }
  return runConnectionSync(database, connection);
}

/**
 * Führt den Sync einer bereits geladenen Verbindung aus — der System-/Scheduler-Pfad ohne
 * Ownership-Prüfung (AP-4.1). Setzt den Status auf "syncing", ruft den Handler und spiegelt Erfolg
 * ("active") oder Fehler ("error" + Meldung) zurück. Fehlt der Handler, ist das ein Fehlerzustand.
 */
export async function runConnectionSync(database: DbClient, connection: CalendarConnectionRecord): Promise<CalendarConnection> {
  const handler = syncHandlers.get(connection.provider);
  if (!handler) {
    const message = `Kein Sync-Handler für Anbieter "${connection.provider}" verfügbar`;
    await recordConnectionJournal(database, connection, "sync_error", message);
    return applyResult(database, connection, { status: "error", lastError: message });
  }

  await calendarConnectionRepository.recordSyncResult(database, connection.id, { status: "syncing", lastError: null });
  try {
    await handler(database, connection);
    await recordConnectionJournal(database, connection, "sync_success", null);
    return applyResult(database, connection, { status: "active", lastError: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync fehlgeschlagen";
    // Widerrufenes Google-Token (invalid_grant) → Re-Auth statt generischem Fehler (der Status wurde
    // ggf. schon in ensureGoogleAccessToken gesetzt; hier nicht mit "error" überschreiben).
    const reauthRequired = error instanceof Error && (error as { reason?: unknown }).reason === "invalid_grant";
    await recordConnectionJournal(database, connection, "sync_error", message);
    return applyResult(database, connection, { status: reauthRequired ? "reauth_required" : "error", lastError: message });
  }
}

/** Synchronisiert alle Verbindungen eines Nutzers auf einmal (manueller Sammel-Abgleich aus der UI). */
export async function syncAllUserConnections(database: DbClient, userId: number): Promise<{ processed: number; synced: number; failed: number }> {
  const connections = await calendarConnectionRepository.listByUser(database, userId);
  let synced = 0;
  let failed = 0;
  for (const connection of connections) {
    const result = await runConnectionSync(database, connection);
    if (result.status === "error" || result.status === "reauth_required") {
      failed += 1;
    } else {
      synced += 1;
    }
  }
  return { processed: connections.length, synced, failed };
}

/** Schreibt das Sync-Ergebnis in die Verbindung und liefert die aktualisierte API-Sicht. */
async function applyResult(database: DbClient, connection: CalendarConnectionRecord, result: RecordSyncResultInput): Promise<CalendarConnection> {
  const updated = await calendarConnectionRepository.recordSyncResult(database, connection.id, result);
  return mapCalendarConnection(updated ?? connection);
}
