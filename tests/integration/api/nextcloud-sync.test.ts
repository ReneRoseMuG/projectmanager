/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echte Repositories, echter node-ical-Parser. Die CalDAV-Requests werden
 *   durch einen aufzeichnenden fetch-Mock beantwortet (gemockte CalDAV-Sequenzen laut Aufgabe).
 *
 * Mock-Entscheidung:
 * - Nur der Netzwerk-Fetcher wird injiziert; er zeichnet Methode + Body jedes Requests auf, um
 *   "keine Schreibzugriffe" und "kein Detailabruf ohne Änderung" nachzuweisen.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Geändertes Objekt wird gezielt nachgeladen + sync-token aktualisiert; gelöschtes lokal entfernt
 * - Ohne Änderung KEIN calendar-multiget; ungültiger Token löst Full-Resync aus
 * - Es werden ausschließlich lesende Methoden (REPORT/PROPFIND) gesendet
 *
 * Fehlerfälle:
 * - Ungültiger sync-token → kontrollierter Full-Resync
 *
 * Ziel:
 * Absicherung des read-only Delta-Sync gegen die reale Persistenzschicht.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { events } from "../../../apps/api/src/db/schema.js";
import { calendarConnectionRepository, calendarSyncStateRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import type { CalDavFetch } from "../../../apps/api/src/services/caldav/caldav-client.js";
import { config } from "../../../apps/api/src/config.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { clearCalendarSyncHandlers, syncCalendarConnection } from "../../../apps/api/src/services/calendar-sync.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { deltaSyncNextCloudCalendar, registerNextCloudSyncHandler } from "../../../apps/api/src/services/nextcloud-sync.service.js";
import { type ImportWindow } from "../../../apps/api/src/services/ical-import.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const CREDS = { baseUrl: "https://cloud.example.com", username: "rene", appPassword: "pw" };
const WINDOW: ImportWindow = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-12-31T23:59:59Z") };
const SINGLE_ICS =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\nBEGIN:VEVENT\r\nUID:u1\r\nDTSTART;TZID=Europe/Berlin:20260701T100000\r\nDTEND;TZID=Europe/Berlin:20260701T110000\r\nSUMMARY:Termin\r\nEND:VEVENT\r\nEND:VCALENDAR";

function syncXml(changes: Array<{ href: string; etag: string }>, token: string): string {
  const responses = changes
    .map((change) => `<d:response><d:href>${change.href}</d:href><d:propstat><d:prop><d:getetag>"${change.etag}"</d:getetag></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`)
    .join("");
  return `<d:multistatus xmlns:d="DAV:">${responses}<d:sync-token>${token}</d:sync-token></d:multistatus>`;
}
function syncDeletedXml(href: string, token: string): string {
  return `<d:multistatus xmlns:d="DAV:"><d:response><d:href>${href}</d:href><d:status>HTTP/1.1 404 Not Found</d:status></d:response><d:sync-token>${token}</d:sync-token></d:multistatus>`;
}
function syncEmptyXml(token: string): string {
  return `<d:multistatus xmlns:d="DAV:"><d:sync-token>${token}</d:sync-token></d:multistatus>`;
}
function multigetXml(href: string, ics: string): string {
  return `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${href}</d:href><d:propstat><d:prop><d:getetag>"e"</d:getetag><c:calendar-data>${ics}</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`;
}

interface Handlers {
  sync: () => { status: number; body: string };
  multiget?: () => { status: number; body: string };
  query?: () => { status: number; body: string };
}

function makeFetch(handlers: Handlers): { fetch: CalDavFetch; requests: Array<{ method: string; body: string }> } {
  const requests: Array<{ method: string; body: string }> = [];
  const fetch: CalDavFetch = async (_url, init) => {
    const body = String(init.body ?? "");
    requests.push({ method: init.method, body });
    let result: { status: number; body: string };
    if (body.includes("sync-collection")) {
      result = handlers.sync();
    } else if (body.includes("calendar-multiget")) {
      result = handlers.multiget?.() ?? { status: 404, body: "" };
    } else if (body.includes("calendar-query")) {
      result = handlers.query?.() ?? { status: 404, body: "" };
    } else {
      result = { status: 404, body: "" };
    }
    return { status: result.status, text: async () => result.body };
  };
  return { fetch, requests };
}

describe("NextCloud Delta-Sync (AP-1.3)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "delta-sync-test-key";
    resetCredentialCipherCache();
  });
  beforeEach(async () => {
    await truncateAll(testDb.pool);
    clearCalendarSyncHandlers();
  });
  afterAll(async () => {
    config.calendarEncryptionKey = originalKey;
    resetCredentialCipherCache();
    clearCalendarSyncHandlers();
    await testDb?.close();
  });

  async function setup(): Promise<{ connectionId: number; calendarId: number }> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "nextcloud", displayName: "NC" }, 1);
    const calendar = await externalCalendarRepository.create(testDb.db, { connectionId: connection.id, externalId: "/remote.php/dav/calendars/rene/personal/", imported: true, readonly: true });
    return { connectionId: connection.id, calendarId: calendar.id };
  }

  async function seedEvent(connectionId: number, calendarId: number, href: string): Promise<void> {
    const [result] = await testDb.pool.execute(
      "INSERT INTO events (title, start_time, end_time, is_all_day, origin, `readonly`, reminder_minutes, version, created_at, updated_at) " +
        "VALUES ('Alt', '2026-07-01T10:00:00', '2026-07-01T11:00:00', 0, 'nextcloud', 1, 60, 1, NOW(), NOW())"
    );
    const eventId = (result as { insertId: number }).insertId;
    await eventMappingRepository.create(testDb.db, { connectionId, externalCalendarId: calendarId, localEventId: eventId, externalId: href, origin: "nextcloud", direction: "import" });
  }

  it("lädt ein geändertes Objekt gezielt nach und speichert den neuen sync-token", async () => {
    const { connectionId, calendarId } = await setup();
    const { fetch, requests } = makeFetch({
      sync: () => ({ status: 207, body: syncXml([{ href: "/e/1.ics", etag: "e2" }], "token-2") }),
      multiget: () => ({ status: 207, body: multigetXml("/e/1.ics", SINGLE_ICS) })
    });

    const result = await deltaSyncNextCloudCalendar(testDb.db, connectionId, calendarId, CREDS, WINDOW, fetch);

    expect(result.changed).toBe(1);
    expect(await testDb.db.select().from(events)).toHaveLength(1);
    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("token-2");
    expect(requests.some((request) => request.body.includes("calendar-multiget"))).toBe(true);
  });

  it("entfernt ein serverseitig gelöschtes Objekt lokal", async () => {
    const { connectionId, calendarId } = await setup();
    await seedEvent(connectionId, calendarId, "/e/1.ics");
    expect(await testDb.db.select().from(events)).toHaveLength(1);

    const { fetch } = makeFetch({ sync: () => ({ status: 207, body: syncDeletedXml("/e/1.ics", "token-2") }) });
    const result = await deltaSyncNextCloudCalendar(testDb.db, connectionId, calendarId, CREDS, WINDOW, fetch);

    expect(result.deleted).toBe(1);
    expect(await testDb.db.select().from(events)).toHaveLength(0);
  });

  it("ruft ohne Änderung keine Detaildaten ab (kein calendar-multiget)", async () => {
    const { connectionId, calendarId } = await setup();
    const { fetch, requests } = makeFetch({ sync: () => ({ status: 207, body: syncEmptyXml("token-2") }) });

    const result = await deltaSyncNextCloudCalendar(testDb.db, connectionId, calendarId, CREDS, WINDOW, fetch);

    expect(result.changed).toBe(0);
    expect(requests.some((request) => request.body.includes("calendar-multiget"))).toBe(false);
    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("token-2");
  });

  it("löst bei ungültigem sync-token einen Full-Resync aus", async () => {
    const { connectionId, calendarId } = await setup();
    await calendarSyncStateRepository.upsert(testDb.db, { connectionId, externalCalendarId: calendarId, syncToken: "alt-token" });
    let syncCall = 0;
    const { fetch } = makeFetch({
      sync: () => {
        syncCall += 1;
        return syncCall === 1
          ? { status: 403, body: "<d:error xmlns:d=\"DAV:\"><d:valid-sync-token/></d:error>" }
          : { status: 207, body: syncEmptyXml("token-neu") };
      },
      query: () => ({ status: 207, body: multigetXml("/e/1.ics", SINGLE_ICS) })
    });

    const result = await deltaSyncNextCloudCalendar(testDb.db, connectionId, calendarId, CREDS, WINDOW, fetch);

    expect(result.resynced).toBe(true);
    expect(await testDb.db.select().from(events)).toHaveLength(1);
    const state = await calendarSyncStateRepository.findByCalendar(testDb.db, connectionId, calendarId);
    expect(state?.syncToken).toBe("token-neu");
  });

  it("sendet ausschließlich lesende Requests (kein PUT/POST/DELETE an NextCloud)", async () => {
    const { connectionId, calendarId } = await setup();
    const { fetch, requests } = makeFetch({
      sync: () => ({ status: 207, body: syncXml([{ href: "/e/1.ics", etag: "e2" }], "token-2") }),
      multiget: () => ({ status: 207, body: multigetXml("/e/1.ics", SINGLE_ICS) })
    });

    await deltaSyncNextCloudCalendar(testDb.db, connectionId, calendarId, CREDS, WINDOW, fetch);

    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((request) => request.method === "REPORT" || request.method === "PROPFIND")).toBe(true);
  });

  it("registerNextCloudSyncHandler synct importierte Kalender über den Dispatcher", async () => {
    const { connectionId, calendarId } = await setup();
    void calendarId;
    await calendarCredentialService.store(testDb.db, connectionId, CREDS);
    const { fetch } = makeFetch({
      sync: () => ({ status: 207, body: syncXml([{ href: "/e/1.ics", etag: "e2" }], "token-2") }),
      multiget: () => ({ status: 207, body: multigetXml("/e/1.ics", SINGLE_ICS) })
    });
    registerNextCloudSyncHandler(() => WINDOW, fetch);

    const updated = await syncCalendarConnection(testDb.db, connectionId, 1);

    expect(updated.status).toBe("active");
    expect(await testDb.db.select().from(events)).toHaveLength(1);
  });

  it("liefert ein leeres Ergebnis für einen unbekannten Kalender", async () => {
    const { connectionId } = await setup();
    const { fetch } = makeFetch({ sync: () => ({ status: 207, body: syncEmptyXml("t") }) });
    const result = await deltaSyncNextCloudCalendar(testDb.db, connectionId, 999999, CREDS, WINDOW, fetch);
    expect(result).toEqual({ changed: 0, deleted: 0, resynced: false });
  });
});
