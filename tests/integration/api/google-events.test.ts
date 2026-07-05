/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Kalender-/Event-Repository, echte Verschlüsselung. Nur der
 *   Google-Netzwerk-Fetcher (events.list) wird mit aufgezeichneten Antworten injiziert.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der HTTP-Fetcher. Ein bereits gewählter Zielkalender wird
 *   vorab angelegt, damit der Fetcher ausschließlich events.list bedient (kein calendarList).
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Initialimport legt Google-Events lokal an (origin=google, nicht read-only, korrekte Wandzeit/Ganztag)
 * - Pagination: alle Seiten werden geholt, der nextSyncToken erst nach der letzten Seite persistiert
 * - Inkrementeller Lauf mit syncToken; status=cancelled löscht den lokalen Termin
 * - Idempotenz: identischer Import erzeugt kein Duplikat, Änderungen aktualisieren den Termin
 * - HTTP 410 verwirft den Token und erzwingt einen Full-Resync (alter Stand verschwindet)
 *
 * Fehlerfälle:
 * - Nicht behandelter HTTP-Fehler (500) wird als GoogleAuthError gemeldet
 *
 * Ziel:
 * Absicherung des Google→App Import-Syncs (AP-2.3).
 */

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { calendarConnectionRepository, calendarSyncStateRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { importGoogleCalendar, registerGoogleSyncHandler } from "../../../apps/api/src/services/google/google-events.service.js";
import { syncCalendarConnection } from "../../../apps/api/src/services/calendar-sync.service.js";
import { GoogleAuthError, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface QueuedResponse {
  status: number;
  body: Record<string, unknown>;
}

/** Arbeitet eine Antwort-Queue ab (für Pagination und 410→Resync); wiederholt die letzte Antwort defensiv. */
function queuedFetch(responses: QueuedResponse[]): GoogleTokenFetch {
  let index = 0;
  return async () => {
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return { status: response.status, json: async () => response.body };
  };
}

function timedEvent(id: string, summary: string, startUtc: string, endUtc: string, status = "confirmed"): Record<string, unknown> {
  return { id, status, summary, start: { dateTime: startUtc }, end: { dateTime: endUtc } };
}

describe("Google → App Import-Sync (AP-2.3)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-events-test-key";
    resetCredentialCipherCache();
  });
  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });
  afterAll(async () => {
    config.calendarEncryptionKey = originalKey;
    resetCredentialCipherCache();
    await testDb?.close();
  });

  async function setupWithTarget(): Promise<{ connectionId: number; calendarId: number }> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "G" }, 1);
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    const target = await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "cal-google", name: "Google", imported: true, readonly: false });
    return { connectionId: connection.id, calendarId: target.id };
  }

  async function localEventsOf(calendarId: number): Promise<Array<typeof events.$inferSelect>> {
    const mappings = await eventMappingRepository.listByExternalCalendar(testDb.db, calendarId);
    const ids = mappings.map((mapping) => mapping.localEventId);
    if (ids.length === 0) {
      return [];
    }
    return testDb.db.select().from(events).where(inArray(events.id, ids));
  }

  it("importiert Google-Events initial als lokale Termine (origin=google, nicht read-only)", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    const fetchImpl = queuedFetch([
      {
        status: 200,
        body: {
          items: [
            { id: "g1", status: "confirmed", summary: "Meeting", iCalUID: "g1@google", start: { dateTime: "2026-07-01T10:00:00+02:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-07-01T11:00:00+02:00", timeZone: "Europe/Berlin" } },
            { id: "g2", status: "confirmed", summary: "Ganztag", start: { date: "2026-07-05" }, end: { date: "2026-07-06" } }
          ],
          nextSyncToken: "sync-1"
        }
      }
    ]);

    const result = await importGoogleCalendar(testDb.db, connectionId, fetchImpl);
    expect(result.changed).toBe(2);

    const local = await localEventsOf(calendarId);
    expect(local).toHaveLength(2);
    const meeting = local.find((entry) => entry.title === "Meeting");
    expect(meeting?.origin).toBe("google");
    expect(meeting?.readonly).toBe(false);
    expect(meeting?.startTime).toBe("2026-07-01T10:00:00");
    const allDay = local.find((entry) => entry.title === "Ganztag");
    expect(allDay?.isAllDay).toBe(true);
    expect(allDay?.startTime).toBe("2026-07-05T00:00:00");

    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("sync-1");
  });

  it("holt alle Seiten und persistiert den syncToken erst nach der letzten Seite", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    const fetchImpl = queuedFetch([
      { status: 200, body: { items: [timedEvent("p1", "Seite1", "2026-07-01T08:00:00Z", "2026-07-01T09:00:00Z")], nextPageToken: "page-2" } },
      { status: 200, body: { items: [timedEvent("p2", "Seite2", "2026-07-02T08:00:00Z", "2026-07-02T09:00:00Z")], nextSyncToken: "sync-final" } }
    ]);

    const result = await importGoogleCalendar(testDb.db, connectionId, fetchImpl);
    expect(result.changed).toBe(2);
    expect(await localEventsOf(calendarId)).toHaveLength(2);
    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("sync-final");
  });

  it("löscht den lokalen Termin, wenn Google ihn als cancelled meldet", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    await importGoogleCalendar(testDb.db, connectionId, queuedFetch([{ status: 200, body: { items: [timedEvent("c1", "X", "2026-07-01T10:00:00Z", "2026-07-01T11:00:00Z")], nextSyncToken: "s1" } }]));
    expect(await localEventsOf(calendarId)).toHaveLength(1);

    const result = await importGoogleCalendar(testDb.db, connectionId, queuedFetch([{ status: 200, body: { items: [{ id: "c1", status: "cancelled" }], nextSyncToken: "s2" } }]));
    expect(result.deleted).toBe(1);
    expect(await localEventsOf(calendarId)).toHaveLength(0);
  });

  it("ist idempotent — ein erneuter Import aktualisiert statt zu duplizieren", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    await importGoogleCalendar(testDb.db, connectionId, queuedFetch([{ status: 200, body: { items: [timedEvent("i1", "Erst", "2026-07-01T10:00:00Z", "2026-07-01T11:00:00Z")], nextSyncToken: "s1" } }]));
    await importGoogleCalendar(testDb.db, connectionId, queuedFetch([{ status: 200, body: { items: [timedEvent("i1", "Umbenannt", "2026-07-01T10:00:00Z", "2026-07-01T11:00:00Z")], nextSyncToken: "s2" } }]));

    const local = await localEventsOf(calendarId);
    expect(local).toHaveLength(1);
    expect(local[0].title).toBe("Umbenannt");
  });

  it("verwirft den Token und macht einen Full-Resync bei HTTP 410", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    await importGoogleCalendar(testDb.db, connectionId, queuedFetch([{
      status: 200,
      body: { items: [timedEvent("old1", "Alt1", "2026-07-01T10:00:00Z", "2026-07-01T11:00:00Z"), timedEvent("old2", "Alt2", "2026-07-02T10:00:00Z", "2026-07-02T11:00:00Z")], nextSyncToken: "stale" }
    }]));
    expect(await localEventsOf(calendarId)).toHaveLength(2);

    const fetchImpl = queuedFetch([
      { status: 410, body: {} },
      { status: 200, body: { items: [timedEvent("fresh1", "Neu", "2026-07-03T10:00:00Z", "2026-07-03T11:00:00Z")], nextSyncToken: "fresh" } }
    ]);
    const result = await importGoogleCalendar(testDb.db, connectionId, fetchImpl);
    expect(result.resynced).toBe(true);

    const local = await localEventsOf(calendarId);
    expect(local).toHaveLength(1);
    expect(local[0].title).toBe("Neu");
    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("fresh");
  });

  it("meldet einen nicht behandelten HTTP-Fehler als GoogleAuthError", async () => {
    const { connectionId } = await setupWithTarget();
    await expect(importGoogleCalendar(testDb.db, connectionId, queuedFetch([{ status: 500, body: { error: "boom" } }]))).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("registriert einen Google-Sync-Handler, der über den zentralen Dispatcher ausgeführt wird", async () => {
    const { connectionId, calendarId } = await setupWithTarget();
    registerGoogleSyncHandler(queuedFetch([{ status: 200, body: { items: [timedEvent("d1", "Dispatcher", "2026-07-01T10:00:00Z", "2026-07-01T11:00:00Z")], nextSyncToken: "s1" } }]));
    await syncCalendarConnection(testDb.db, connectionId, 1);
    const local = await localEventsOf(calendarId);
    expect(local).toHaveLength(1);
    expect(local[0].title).toBe("Dispatcher");
  });
});
