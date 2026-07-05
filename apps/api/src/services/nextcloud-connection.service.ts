import type { CalendarConnection } from "@taskmanager/shared-types";
import type { DbClient, DbSession } from "../db/client.js";
import { calendarConnectionRepository, externalCalendarRepository } from "../repositories/calendar.repository.js";
import { badRequest } from "../utils/errors.js";
import { CalDavError, discoverCalendars, type CalDavFetch } from "./caldav/caldav-client.js";
import { mapCalendarConnection } from "./calendar-connection.service.js";
import { calendarCredentialService } from "./calendar-credential.service.js";

export interface ConnectNextCloudInput {
  displayName: string;
  baseUrl: string;
  username: string;
  appPassword: string;
}

/**
 * Verbindet ein NextCloud-Konto: testet Erreichbarkeit + Auth via CalDAV-Discovery, legt bei Erfolg
 * eine read-only Verbindung an, speichert die Zugangsdaten verschlüsselt (AP-0.2) und persistiert die
 * gefundenen Kalender. Discovery-Fehler werden als klare 400-Meldung an den Aufrufer weitergereicht.
 */
export async function connectNextCloud(
  database: DbClient,
  userId: number,
  input: ConnectNextCloudInput,
  fetchImpl?: CalDavFetch
): Promise<CalendarConnection> {
  const displayName = input.displayName?.trim();
  if (!displayName) {
    throw badRequest("Ein Anzeigename ist erforderlich.");
  }

  let calendars;
  try {
    calendars = await discoverCalendars({ baseUrl: input.baseUrl, username: input.username, appPassword: input.appPassword }, fetchImpl);
  } catch (error) {
    if (error instanceof CalDavError) {
      throw badRequest(error.message);
    }
    throw error;
  }

  const connection = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbSession;
    const created = await calendarConnectionRepository.create(txDb, { userId, provider: "nextcloud", displayName, status: "active" }, userId);
    await calendarCredentialService.store(txDb, created.id, {
      baseUrl: input.baseUrl,
      username: input.username,
      appPassword: input.appPassword
    });
    for (const calendar of calendars) {
      await externalCalendarRepository.upsert(txDb, {
        connectionId: created.id,
        externalId: calendar.href,
        name: calendar.displayName ?? undefined,
        color: calendar.color ?? undefined,
        readonly: true
      });
    }
    return created;
  });

  return mapCalendarConnection(connection);
}
