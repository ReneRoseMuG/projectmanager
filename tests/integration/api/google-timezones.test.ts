/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Event-/Mapping-Repository, echte Verschlüsselung, echte
 *   Zeitzonen-/Wandzeit-Logik. Nur der Google-Fetcher wird injiziert.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der HTTP-Fetcher. Zielkalender + Credentials real angelegt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln (AP-3.3):
 * - Import: eine 10:00-Instanz bleibt über Sommer-/Winterzeit 10:00 (Offset variiert, Wandzeit nicht)
 * - Import einer Google-Serie (singleEvents-Instanzen) über die DST-Grenze → mehrere Termine, konstante Uhrzeit
 * - Export: Wandzeit wird mit Ziel-Zeitzone (nicht mit fixem Offset) übergeben — Google ordnet DST selbst ein
 * - Round-Trip App→Google→App hält die Wandzeit ohne Drift
 * - Ganztag beidseitig: date rein wie raus (kein Tagesversatz)
 *
 * Fehlerfälle:
 * - dateTime ohne Offset + timeZone wird nicht in der Maschinen-Zeitzone fehlinterpretiert
 *
 * Ziel:
 * Absicherung der beidseitigen Zeitzonen-/Serienbehandlung.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { insertId } from "../../../apps/api/src/db/query-utils.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { importGoogleCalendar } from "../../../apps/api/src/services/google/google-events.service.js";
import { exportEventToGoogle, loadLocalEvent } from "../../../apps/api/src/services/google/google-export.service.js";
import type { GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface RecordedRequest {
  method: string;
  body?: Record<string, unknown>;
}

function writeFetch(externalId: string, etag: string): { fetchImpl: GoogleTokenFetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetchImpl: GoogleTokenFetch = async (_url, init) => {
    requests.push({ method: init.method, body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined });
    if (init.method === "POST") {
      return { status: 200, json: async () => ({ id: externalId, etag, iCalUID: null }) };
    }
    return { status: 200, json: async () => ({ etag }) };
  };
  return { fetchImpl, requests };
}

function importFetch(items: Array<Record<string, unknown>>, syncToken: string): GoogleTokenFetch {
  return async () => ({ status: 200, json: async () => ({ items, nextSyncToken: syncToken }) });
}

describe("Serien & Zeitzonen beidseitig (AP-3.3)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-tz-test-key";
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

  async function setupWithTarget(): Promise<{ connectionId: number }> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "G" }, 1);
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "cal-google", name: "Google", imported: true, readonly: false });
    return { connectionId: connection.id };
  }

  async function insertLocalEvent(title: string, startTime: string, endTime: string, isAllDay = false): Promise<number> {
    const now = new Date().toISOString();
    const result = await testDb.db.insert(events).values({ title, startTime, endTime, isAllDay, origin: "local", readonly: false, createdAt: now, updatedAt: now });
    return insertId(result);
  }

  async function localEventsSorted(connectionId: number): Promise<Array<typeof events.$inferSelect>> {
    const mappings = await eventMappingRepository.listByConnection(testDb.db, connectionId);
    const rows = await Promise.all(mappings.map((mapping) => loadLocalEvent(testDb.db, mapping.localEventId)));
    return rows.filter((row): row is typeof events.$inferSelect => Boolean(row)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  it("hält eine 10:00-Instanz über Sommer- und Winterzeit auf 10:00 Wandzeit (Import)", async () => {
    const { connectionId } = await setupWithTarget();
    // Sommer (+02:00) und Winter (+01:00) — Offset verschieden, Wandzeit identisch.
    await importGoogleCalendar(testDb.db, connectionId, importFetch([
      { id: "sommer", status: "confirmed", summary: "Sommer", etag: "e1", start: { dateTime: "2026-07-01T10:00:00+02:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-07-01T11:00:00+02:00", timeZone: "Europe/Berlin" } },
      { id: "winter", status: "confirmed", summary: "Winter", etag: "e2", start: { dateTime: "2026-12-01T10:00:00+01:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-12-01T11:00:00+01:00", timeZone: "Europe/Berlin" } }
    ], "s1"));

    const local = await localEventsSorted(connectionId);
    expect(local.map((entry) => entry.startTime)).toEqual(["2026-07-01T10:00:00", "2026-12-01T10:00:00"]);
  });

  it("importiert eine Google-Serie (Instanzen) über die DST-Grenze mit konstanter Uhrzeit", async () => {
    const { connectionId } = await setupWithTarget();
    // singleEvents-Instanzen einer wöchentlichen 10:00-Serie: 25.03. (Winter, +01) und 01.04. (Sommer, +02).
    await importGoogleCalendar(testDb.db, connectionId, importFetch([
      { id: "serie_20260325", status: "confirmed", summary: "Team", etag: "s1", recurringEventId: "serie", start: { dateTime: "2026-03-25T10:00:00+01:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-03-25T11:00:00+01:00", timeZone: "Europe/Berlin" } },
      { id: "serie_20260401", status: "confirmed", summary: "Team", etag: "s2", recurringEventId: "serie", start: { dateTime: "2026-04-01T10:00:00+02:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-04-01T11:00:00+02:00", timeZone: "Europe/Berlin" } }
    ], "s1"));

    const local = await localEventsSorted(connectionId);
    expect(local).toHaveLength(2);
    expect(local.every((entry) => entry.startTime.endsWith("T10:00:00"))).toBe(true);
    expect(local.map((entry) => entry.startTime.slice(0, 10))).toEqual(["2026-03-25", "2026-04-01"]);
  });

  it("exportiert Wandzeit mit Ziel-Zeitzone statt fixem Offset (Google ordnet DST selbst ein)", async () => {
    const { connectionId } = await setupWithTarget();
    const sommer = await insertLocalEvent("Sommer", "2026-07-01T10:00:00", "2026-07-01T11:00:00");
    const winter = await insertLocalEvent("Winter", "2026-12-01T10:00:00", "2026-12-01T11:00:00");

    const summerFetch = writeFetch("g-sommer", "e1");
    await exportEventToGoogle(testDb.db, connectionId, sommer, summerFetch.fetchImpl);
    const winterFetch = writeFetch("g-winter", "e2");
    await exportEventToGoogle(testDb.db, connectionId, winter, winterFetch.fetchImpl);

    expect(summerFetch.requests[0]?.body?.start).toEqual({ dateTime: "2026-07-01T10:00:00", timeZone: "Europe/Berlin" });
    expect(winterFetch.requests[0]?.body?.start).toEqual({ dateTime: "2026-12-01T10:00:00", timeZone: "Europe/Berlin" });
  });

  it("hält die Wandzeit über einen Round-Trip App→Google→App ohne Drift", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent("Round", "2026-07-01T10:00:00", "2026-07-01T11:00:00");
    await exportEventToGoogle(testDb.db, connectionId, eventId, writeFetch("g-rt", "etag-export").fetchImpl);

    // Google gibt denselben Termin mit berechnetem Offset (+02:00 im Berliner Sommer) zurück.
    await importGoogleCalendar(testDb.db, connectionId, importFetch([
      { id: "g-rt", status: "confirmed", summary: "Round", etag: "etag-remote", start: { dateTime: "2026-07-01T10:00:00+02:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-07-01T11:00:00+02:00", timeZone: "Europe/Berlin" } }
    ], "s1"));

    const local = await loadLocalEvent(testDb.db, eventId);
    expect(local?.startTime).toBe("2026-07-01T10:00:00");
    expect(local?.endTime).toBe("2026-07-01T11:00:00");
  });

  it("überträgt Ganztagstermine beidseitig ohne Tagesversatz (date rein wie raus)", async () => {
    const { connectionId } = await setupWithTarget();
    // Import: date-basiert.
    await importGoogleCalendar(testDb.db, connectionId, importFetch([
      { id: "ganztag", status: "confirmed", summary: "Feiertag", etag: "e1", start: { date: "2026-07-01" }, end: { date: "2026-07-02" } }
    ], "s1"));
    const imported = (await localEventsSorted(connectionId))[0];
    expect(imported.isAllDay).toBe(true);
    expect(imported.startTime).toBe("2026-07-01T00:00:00");

    // Export: Ganztag → date.
    const local = await insertLocalEvent("Urlaub", "2026-08-10T00:00:00", "2026-08-11T00:00:00", true);
    const fetch = writeFetch("g-urlaub", "e2");
    await exportEventToGoogle(testDb.db, connectionId, local, fetch.fetchImpl);
    expect(fetch.requests[0]?.body?.start).toEqual({ date: "2026-08-10" });
    expect(fetch.requests[0]?.body?.end).toEqual({ date: "2026-08-11" });
  });

  it("interpretiert dateTime ohne Offset trotz timeZone als Wandzeit (keine Maschinen-Zeitzone)", async () => {
    const { connectionId } = await setupWithTarget();
    await importGoogleCalendar(testDb.db, connectionId, importFetch([
      { id: "no-offset", status: "confirmed", summary: "Floating", etag: "e1", start: { dateTime: "2026-07-01T09:30:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-07-01T10:30:00", timeZone: "Europe/Berlin" } }
    ], "s1"));
    const local = (await localEventsSorted(connectionId))[0];
    expect(local.startTime).toBe("2026-07-01T09:30:00");
  });
});
