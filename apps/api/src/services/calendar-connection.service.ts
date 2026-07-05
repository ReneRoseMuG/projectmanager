import type { CalendarConnection } from "@taskmanager/shared-types";
import type { DbClient, DbSession } from "../db/client.js";
import { calendarConnectionRepository, type CalendarConnectionRecord } from "../repositories/calendar.repository.js";
import { notFound } from "../utils/errors.js";
import { calendarCredentialService } from "./calendar-credential.service.js";

/**
 * Mappt einen DB-Record auf das API-DTO. Das Feld encrypted_credentials wird bewusst
 * NICHT übernommen — Zugangsdaten verlassen die Persistenzschicht nie in Richtung API.
 */
export function mapCalendarConnection(record: CalendarConnectionRecord): CalendarConnection {
  return {
    id: record.id,
    userId: record.userId,
    provider: record.provider,
    displayName: record.displayName,
    status: record.status,
    lastSyncAt: record.lastSyncAt,
    lastError: record.lastError,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

/** Lädt eine Verbindung und stellt sicher, dass sie dem anfragenden Nutzer gehört. */
export async function requireOwnedConnection(database: DbSession, id: number, userId: number): Promise<CalendarConnectionRecord> {
  const record = await calendarConnectionRepository.findById(database, id);
  if (!record || record.userId !== userId) {
    throw notFound(`Calendar connection ${id} not found`);
  }
  return record;
}

export async function listCalendarConnections(database: DbClient, userId: number): Promise<CalendarConnection[]> {
  const records = await calendarConnectionRepository.listByUser(database, userId);
  return records.map(mapCalendarConnection);
}

export async function getCalendarConnection(database: DbClient, id: number, userId: number): Promise<CalendarConnection> {
  return mapCalendarConnection(await requireOwnedConnection(database, id, userId));
}

/** Trennt eine Verbindung: entfernt zuerst die Zugangsdaten, dann die Verbindung (Kaskade räumt Rest). */
export async function deleteCalendarConnection(database: DbClient, id: number, userId: number): Promise<void> {
  await requireOwnedConnection(database, id, userId);
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbSession;
    await calendarCredentialService.clear(txDb, id);
    await calendarConnectionRepository.delete(txDb, id);
  });
}
