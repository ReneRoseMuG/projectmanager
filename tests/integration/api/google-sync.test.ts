/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Event-/Mapping-Repository, echte Verschlüsselung. Nur der Google-Fetcher
 *   wird injiziert und bedient je nach HTTP-Methode events.list (GET) bzw. insert/update (POST/PATCH).
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der HTTP-Fetcher. Zielkalender + Credentials real angelegt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln (AP-3.2):
 * - Echo-Vermeidung: ein zuvor exportierter Termin kommt mit identischem etag zurück und wird NICHT
 *   erneut verbucht/überschrieben
 * - Konflikt (beide Seiten geändert): Last-Write-Wins — der neuere Zeitstempel (updated vs updatedAt)
 *   gewinnt; bei App-Sieg bleibt der lokale Stand und wird per Push zu Google getragen
 * - Reine Remote-Änderung (nicht lokal geändert) wird übernommen
 * - Bidirektionaler Dispatcher: pull + push in einem Lauf (Google-Termin rein, neuer App-Termin raus)
 *
 * Fehlerfälle:
 * - (Fehlerpfade der Einzeloperationen sind in google-events/google-export abgedeckt)
 *
 * Ziel:
 * Absicherung der bidirektionalen Konflikt- und Echo-Behandlung.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { insertId } from "../../../apps/api/src/db/query-utils.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { syncCalendarConnection } from "../../../apps/api/src/services/calendar-sync.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { importGoogleCalendar, registerGoogleSyncHandler } from "../../../apps/api/src/services/google/google-events.service.js";
import { exportDirtyMappedEvents, exportEventToGoogle, loadLocalEvent } from "../../../apps/api/src/services/google/google-export.service.js";
import type { GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface RecordedRequest {
  method: string;
  body?: Record<string, unknown>;
}

/** Fetcher für Schreibzugriffe (POST/PATCH) mit fixem etag; zeichnet die Requests auf. */
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

/** Fetcher für den Import (events.list, GET) mit vorgegebenen Items + syncToken. */
function importFetch(items: Array<Record<string, unknown>>, syncToken: string): GoogleTokenFetch {
  return async () => ({ status: 200, json: async () => ({ items, nextSyncToken: syncToken }) });
}

/** Fetcher für den bidirektionalen Handler: GET → events.list, POST → insert. */
function hybridFetch(items: Array<Record<string, unknown>>, syncToken: string, pushId: string): { fetchImpl: GoogleTokenFetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetchImpl: GoogleTokenFetch = async (_url, init) => {
    requests.push({ method: init.method, body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined });
    if (init.method === "GET") {
      return { status: 200, json: async () => ({ items, nextSyncToken: syncToken }) };
    }
    if (init.method === "POST") {
      return { status: 200, json: async () => ({ id: pushId, etag: "push-etag", iCalUID: null }) };
    }
    return { status: 200, json: async () => ({ etag: "patch-etag" }) };
  };
  return { fetchImpl, requests };
}

function googleItem(id: string, summary: string, opts: { etag?: string; updated?: string } = {}): Record<string, unknown> {
  return {
    id,
    status: "confirmed",
    summary,
    etag: opts.etag,
    updated: opts.updated,
    start: { dateTime: "2026-07-01T10:00:00Z" },
    end: { dateTime: "2026-07-01T11:00:00Z" }
  };
}

describe("Bidirektionale Konflikt- & Echo-Behandlung (AP-3.2)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-sync-test-key";
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

  async function insertLocalEvent(title: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await testDb.db.insert(events).values({
      title,
      startTime: "2026-07-01T10:00:00",
      endTime: "2026-07-01T11:00:00",
      isAllDay: false,
      origin: "local",
      readonly: false,
      createdAt: now,
      updatedAt: now
    });
    return insertId(result);
  }

  it("verhindert ein Echo: identisches etag lässt den exportierten Termin unverändert", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent("App-Termin");
    await exportEventToGoogle(testDb.db, connectionId, eventId, writeFetch("g-echo", "etag-1").fetchImpl);

    // Google liefert denselben Termin mit demselben etag zurück → darf nichts überschreiben.
    const result = await importGoogleCalendar(testDb.db, connectionId, importFetch([googleItem("g-echo", "Remote-Fassung", { etag: "etag-1" })], "s1"));
    expect(result.changed).toBe(0);
    const local = await loadLocalEvent(testDb.db, eventId);
    expect(local?.title).toBe("App-Termin");
  });

  it("löst einen Konflikt zugunsten von Google, wenn die Google-Änderung neuer ist", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent("Original");
    await exportEventToGoogle(testDb.db, connectionId, eventId, writeFetch("g-konf", "etag-old").fetchImpl);
    // Lokale Änderung (dirty), aber Google-Änderung ist jünger.
    await testDb.db.update(events).set({ title: "Lokal geändert", updatedAt: "2030-01-01T10:00:00.000Z" }).where(eq(events.id, eventId));

    await importGoogleCalendar(testDb.db, connectionId, importFetch([googleItem("g-konf", "Google gewinnt", { etag: "etag-new", updated: "2030-06-01T10:00:00.000Z" })], "s1"));
    const local = await loadLocalEvent(testDb.db, eventId);
    expect(local?.title).toBe("Google gewinnt");
  });

  it("löst einen Konflikt zugunsten der App und trägt die lokale Version per Push zu Google", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent("Original");
    await exportEventToGoogle(testDb.db, connectionId, eventId, writeFetch("g-konf", "etag-old").fetchImpl);
    await testDb.db.update(events).set({ title: "Lokal gewinnt", updatedAt: "2030-01-01T10:00:00.000Z" }).where(eq(events.id, eventId));

    // Google-Änderung ist älter → lokale Version bleibt bestehen.
    await importGoogleCalendar(testDb.db, connectionId, importFetch([googleItem("g-konf", "Google alt", { etag: "etag-remote", updated: "2029-01-01T10:00:00.000Z" })], "s1"));
    const afterPull = await loadLocalEvent(testDb.db, eventId);
    expect(afterPull?.title).toBe("Lokal gewinnt");

    // Push trägt die App-Version zu Google (PATCH mit dem lokalen Titel).
    const { fetchImpl, requests } = writeFetch("g-konf", "etag-pushed");
    const pushed = await exportDirtyMappedEvents(testDb.db, connectionId, fetchImpl);
    expect(pushed.updated).toBe(1);
    expect(requests.find((request) => request.method === "PATCH")?.body?.summary).toBe("Lokal gewinnt");
  });

  it("übernimmt eine reine Remote-Änderung, wenn lokal nichts geändert wurde", async () => {
    const { connectionId } = await setupWithTarget();
    const eventId = await insertLocalEvent("Sync");
    await exportEventToGoogle(testDb.db, connectionId, eventId, writeFetch("g-upd", "etag-base").fetchImpl);

    // Kein lokaler Edit → nicht dirty. Google liefert abweichendes etag → Übernahme, kein Konflikt.
    await importGoogleCalendar(testDb.db, connectionId, importFetch([googleItem("g-upd", "Von Google aktualisiert", { etag: "etag-remote", updated: "2030-01-01T10:00:00.000Z" })], "s1"));
    const local = await loadLocalEvent(testDb.db, eventId);
    expect(local?.title).toBe("Von Google aktualisiert");
  });

  it("führt im bidirektionalen Dispatcher Pull und Push in einem Lauf aus", async () => {
    const { connectionId } = await setupWithTarget();
    const freshLocal = await insertLocalEvent("Neu lokal");
    const { fetchImpl, requests } = hybridFetch([googleItem("g-pull", "Aus Google", { etag: "ep" })], "s1", "g-push");
    registerGoogleSyncHandler(fetchImpl);

    await syncCalendarConnection(testDb.db, connectionId, 1);

    // Pull: Google-Termin importiert.
    expect(await eventMappingRepository.findByExternalId(testDb.db, connectionId, "g-pull")).toBeDefined();
    // Push: neuer App-Termin exportiert.
    const pushMapping = await eventMappingRepository.findByLocalEvent(testDb.db, freshLocal);
    expect(pushMapping?.externalId).toBe("g-push");
    expect(requests.some((request) => request.method === "GET")).toBe(true);
    expect(requests.some((request) => request.method === "POST")).toBe(true);
  });
});
