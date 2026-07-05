/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Event-/Mapping-Repository, echte Verschlüsselung. Nur der
 *   Google-Netzwerk-Fetcher (events.insert/update/delete) wird injiziert und zeichnet die
 *   ausgehenden Requests inkl. Payload auf.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der HTTP-Fetcher. Ein Zielkalender wird vorab gewählt, damit der
 *   Fetcher ausschließlich die Event-Schreibzugriffe bedient.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Lokaler Termin → Google-insert mit korrektem Payload (dateTime+timeZone bzw. date), Mapping angelegt
 * - Bereits gemappter Termin → Google-update (PATCH) auf die bekannte Event-id
 * - Löschen entfernt das Google-Event und das Mapping (idempotent bei 404/410)
 * - Batch exportiert nur ungemappte origin=local-Termine, nicht gemappte oder fremde (nextcloud)
 *
 * Fehlerfälle:
 * - Nicht existenter Termin → skipped
 * - Löschen ohne Mapping → false
 * - HTTP-Fehler bei insert/update/delete → GoogleAuthError
 *
 * Ziel:
 * Absicherung des App→Google Exports (AP-3.1).
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { insertId } from "../../../apps/api/src/db/query-utils.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { deleteExportedEvent, exportEventToGoogle, exportPendingLocalEvents } from "../../../apps/api/src/services/google/google-export.service.js";
import { GoogleAuthError, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface RecordedRequest {
  url: string;
  method: string;
  body?: Record<string, unknown>;
}

interface FetchOptions {
  insertId?: string;
  insertStatus?: number;
  patchStatus?: number;
  deleteStatus?: number;
}

/** Fetcher, der ausgehende Google-Schreibzugriffe aufzeichnet und je nach Methode antwortet. */
function recordingFetch(options: FetchOptions): { fetchImpl: GoogleTokenFetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetchImpl: GoogleTokenFetch = async (url, init) => {
    requests.push({ url, method: init.method, body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined });
    if (init.method === "POST") {
      return { status: options.insertStatus ?? 200, json: async () => ({ id: options.insertId ?? "g-new", etag: "etag-insert", iCalUID: "uid-new" }) };
    }
    if (init.method === "PATCH") {
      return { status: options.patchStatus ?? 200, json: async () => ({ etag: "etag-patch" }) };
    }
    if (init.method === "DELETE") {
      return { status: options.deleteStatus ?? 204, json: async () => ({}) };
    }
    return { status: 200, json: async () => ({}) };
  };
  return { fetchImpl, requests };
}

describe("App → Google Export (AP-3.1)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-export-test-key";
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

  async function insertLocalEvent(input: { title: string; startTime: string; endTime: string; isAllDay?: boolean; origin?: "local" | "nextcloud" | "google"; readonly?: boolean }): Promise<number> {
    const now = new Date().toISOString();
    const result = await testDb.db.insert(events).values({
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      isAllDay: input.isAllDay ?? false,
      origin: input.origin ?? "local",
      readonly: input.readonly ?? false,
      createdAt: now,
      updatedAt: now
    });
    return insertId(result);
  }

  it("legt einen lokalen Termin als Google-Event an und speichert das Mapping", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "Planung", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    const { fetchImpl, requests } = recordingFetch({ insertId: "g-planung" });

    const outcome = await exportEventToGoogle(testDb.db, connectionId, eventId, fetchImpl);
    expect(outcome.action).toBe("insert");
    expect(outcome.externalId).toBe("g-planung");

    const post = requests.find((request) => request.method === "POST");
    expect(post?.url).toContain("/calendars/cal-google/events");
    expect(post?.body?.summary).toBe("Planung");
    expect(post?.body?.start).toEqual({ dateTime: "2026-07-01T10:00:00", timeZone: "Europe/Berlin" });

    const mapping = await eventMappingRepository.findByLocalEvent(testDb.db, eventId);
    expect(mapping?.externalId).toBe("g-planung");
    expect(mapping?.direction).toBe("both");
    expect(mapping?.origin).toBe("local");
  });

  it("exportiert einen Ganztagstermin mit date statt dateTime", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "Urlaub", startTime: "2026-07-05T00:00:00", endTime: "2026-07-06T00:00:00", isAllDay: true });
    const { fetchImpl, requests } = recordingFetch({ insertId: "g-urlaub" });

    await exportEventToGoogle(testDb.db, connectionId, eventId, fetchImpl);
    const post = requests.find((request) => request.method === "POST");
    expect(post?.body?.start).toEqual({ date: "2026-07-05" });
    expect(post?.body?.end).toEqual({ date: "2026-07-06" });
  });

  it("aktualisiert einen bereits exportierten Termin via PATCH auf die bekannte Event-id", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "V1", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ insertId: "g-versioniert" }).fetchImpl);
    await testDb.db.update(events).set({ title: "V2" }).where(eq(events.id, eventId));

    const { fetchImpl, requests } = recordingFetch({});
    const outcome = await exportEventToGoogle(testDb.db, connectionId, eventId, fetchImpl);
    expect(outcome.action).toBe("update");

    const patch = requests.find((request) => request.method === "PATCH");
    expect(patch?.url).toContain("/events/g-versioniert");
    expect(patch?.body?.summary).toBe("V2");
  });

  it("löscht einen exportierten Termin bei Google und entfernt das Mapping", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "Weg", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ insertId: "g-weg" }).fetchImpl);

    const { fetchImpl, requests } = recordingFetch({});
    const deleted = await deleteExportedEvent(testDb.db, connectionId, eventId, fetchImpl);
    expect(deleted).toBe(true);
    expect(requests.find((request) => request.method === "DELETE")?.url).toContain("/events/g-weg");
    expect(await eventMappingRepository.findByLocalEvent(testDb.db, eventId)).toBeUndefined();
  });

  it("meldet false, wenn kein Mapping zum Löschen existiert", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "Nie exportiert", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    expect(await deleteExportedEvent(testDb.db, connectionId, eventId, recordingFetch({}).fetchImpl)).toBe(false);
  });

  it("exportiert im Batch nur ungemappte local-Termine, nicht gemappte oder fremde", async () => {
    const { connectionId } = await setupWithTarget();
    const exported = await insertLocalEvent({ title: "Schon draußen", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await exportEventToGoogle(testDb.db, connectionId, exported, recordingFetch({ insertId: "g-old" }).fetchImpl);
    const fresh = await insertLocalEvent({ title: "Neu lokal", startTime: "2026-07-02T10:00:00", endTime: "2026-07-02T11:00:00" });
    const nextcloud = await insertLocalEvent({ title: "Von NextCloud", startTime: "2026-07-03T10:00:00", endTime: "2026-07-03T11:00:00", origin: "nextcloud", readonly: true });

    const { fetchImpl, requests } = recordingFetch({ insertId: "g-fresh" });
    const result = await exportPendingLocalEvents(testDb.db, connectionId, fetchImpl);
    expect(result.inserted).toBe(1);
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
    expect(requests.find((request) => request.method === "POST")?.body?.summary).toBe("Neu lokal");
    expect(await eventMappingRepository.findByLocalEvent(testDb.db, fresh)).toBeDefined();
    expect(await eventMappingRepository.findByLocalEvent(testDb.db, nextcloud)).toBeUndefined();
  });

  it("überspringt einen nicht existenten Termin", async () => {
    const { connectionId } = await setupWithTarget();
    const outcome = await exportEventToGoogle(testDb.db, connectionId, 999_999, recordingFetch({}).fetchImpl);
    expect(outcome.action).toBe("skipped");
  });

  it("überträgt die Beschreibung und verkraftet eine Insert-Antwort ohne etag/iCalUID", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "MitBeschreibung", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await testDb.db.update(events).set({ description: "Wichtige Notiz" }).where(eq(events.id, eventId));

    const requests: RecordedRequest[] = [];
    const minimalFetch: GoogleTokenFetch = async (url, init) => {
      requests.push({ url, method: init.method, body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined });
      return { status: 200, json: async () => ({ id: "g-min" }) };
    };

    const outcome = await exportEventToGoogle(testDb.db, connectionId, eventId, minimalFetch);
    expect(outcome.externalId).toBe("g-min");
    expect(requests.find((request) => request.method === "POST")?.body?.description).toBe("Wichtige Notiz");
    const mapping = await eventMappingRepository.findByLocalEvent(testDb.db, eventId);
    expect(mapping?.etag).toBeNull();
    expect(mapping?.iCalUid).toBeNull();
  });

  it("meldet einen Fehler beim Anlegen als GoogleAuthError", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "Fehlerhaft", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await expect(exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ insertStatus: 500 }).fetchImpl)).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("meldet einen Fehler bei der Aktualisierung als GoogleAuthError", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "PatchFehler", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ insertId: "g-p" }).fetchImpl);
    await expect(exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ patchStatus: 500 }).fetchImpl)).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("meldet einen unerwarteten Fehler beim Löschen als GoogleAuthError, behandelt 404 aber idempotent", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent({ title: "DelFehler", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00" });
    await exportEventToGoogle(testDb.db, connectionId, eventId, recordingFetch({ insertId: "g-d" }).fetchImpl);
    await expect(deleteExportedEvent(testDb.db, connectionId, eventId, recordingFetch({ deleteStatus: 500 }).fetchImpl)).rejects.toBeInstanceOf(GoogleAuthError);
    // Mapping besteht nach dem Fehler weiter; ein 404 räumt es dann idempotent ab.
    const deleted = await deleteExportedEvent(testDb.db, connectionId, eventId, recordingFetch({ deleteStatus: 404 }).fetchImpl);
    expect(deleted).toBe(true);
    expect(await eventMappingRepository.findByLocalEvent(testDb.db, eventId)).toBeUndefined();
  });
});
