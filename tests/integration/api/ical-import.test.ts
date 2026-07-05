/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Event-/Mapping-Repository, echter node-ical-Parser. Der CalDAV-Abruf
 *   wird für den vollen Flow durch eine aufgezeichnete multistatus-Antwort (injizierter fetch) ersetzt.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der Netzwerk-Fetcher wird injiziert.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Import legt lokale Termine (origin=nextcloud, readonly) + event_mappings an; Serien werden expandiert
 * - Re-Import ist idempotent (keine Duplikate); voller Flow importNextCloudCalendar funktioniert
 *
 * Fehlerfälle:
 * - Kaputtes ICS wird übersprungen, gültige Termine desselben Laufs bleiben erhalten
 *
 * Ziel:
 * Absicherung des idempotenten NextCloud-Initialimports gegen die reale Persistenzschicht.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { events } from "../../../apps/api/src/db/schema.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import type { CalDavFetch } from "../../../apps/api/src/services/caldav/caldav-client.js";
import { importNextCloudCalendar, importRawEvents, type ImportWindow } from "../../../apps/api/src/services/ical-import.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const WINDOW: ImportWindow = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-12-31T23:59:59Z") };

const SINGLE_ICS =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n" +
  "BEGIN:VEVENT\r\nUID:single-1\r\nDTSTART;TZID=Europe/Berlin:20260701T100000\r\nDTEND;TZID=Europe/Berlin:20260701T110000\r\nSUMMARY:Einzeltermin\r\nEND:VEVENT\r\nEND:VCALENDAR";

const SERIES_ICS =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n" +
  "BEGIN:VEVENT\r\nUID:series-1\r\nDTSTART;TZID=Europe/Berlin:20260302T100000\r\nDTEND;TZID=Europe/Berlin:20260302T110000\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nSUMMARY:Serie\r\nEND:VEVENT\r\nEND:VCALENDAR";

describe("iCal Import — Persistenz & Idempotenz (AP-1.2)", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await testDb?.close();
  });

  async function setup(): Promise<{ connectionId: number; calendarId: number }> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "nextcloud", displayName: "NC" }, 1);
    const calendar = await externalCalendarRepository.create(testDb.db, { connectionId: connection.id, externalId: "/remote.php/dav/calendars/rene/personal/", readonly: true });
    return { connectionId: connection.id, calendarId: calendar.id };
  }

  it("importiert Einzeltermin + expandierte Serie als read-only nextcloud-Termine mit Mapping", async () => {
    const { connectionId, calendarId } = await setup();
    const result = await importRawEvents(
      testDb.db,
      connectionId,
      calendarId,
      [
        { href: "/e/single.ics", etag: "e1", ics: SINGLE_ICS },
        { href: "/e/series.ics", etag: "e2", ics: SERIES_ICS }
      ],
      WINDOW
    );

    expect(result.imported).toBe(4); // 1 Einzel + 3 Serien-Instanzen
    const allEvents = await testDb.db.select().from(events);
    expect(allEvents).toHaveLength(4);
    expect(allEvents.every((event) => event.origin === "nextcloud" && event.readonly)).toBe(true);
    expect(await eventMappingRepository.listByConnection(testDb.db, connectionId)).toHaveLength(4);
  });

  it("ist idempotent: erneuter Import erzeugt keine Duplikate", async () => {
    const { connectionId, calendarId } = await setup();
    const raw = [{ href: "/e/single.ics", etag: "e1", ics: SINGLE_ICS }];
    await importRawEvents(testDb.db, connectionId, calendarId, raw, WINDOW);
    await importRawEvents(testDb.db, connectionId, calendarId, [{ href: "/e/single.ics", etag: "e2", ics: SINGLE_ICS }], WINDOW);

    expect(await testDb.db.select().from(events)).toHaveLength(1);
    expect(await eventMappingRepository.listByConnection(testDb.db, connectionId)).toHaveLength(1);
    // etag wurde beim zweiten Lauf aktualisiert
    const [mapping] = await eventMappingRepository.listByConnection(testDb.db, connectionId);
    expect(mapping.etag).toBe("e2");
  });

  it("überspringt kaputtes ICS und importiert die gültigen Termine desselben Laufs", async () => {
    const { connectionId, calendarId } = await setup();
    const result = await importRawEvents(
      testDb.db,
      connectionId,
      calendarId,
      [
        { href: "/e/broken.ics", etag: "e1", ics: "BEGIN:VCALENDAR nur Muell ohne Ende" },
        { href: "/e/single.ics", etag: "e2", ics: SINGLE_ICS }
      ],
      WINDOW
    );
    expect(result.imported).toBe(1);
    expect(await testDb.db.select().from(events)).toHaveLength(1);
  });

  it("importNextCloudCalendar ruft den Kalender ab und importiert (gemockter CalDAV-fetch)", async () => {
    const { connectionId, calendarId } = await setup();
    const multistatus =
      '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      "<d:response><d:href>/e/single.ics</d:href><d:propstat><d:prop>" +
      '<d:getetag>"etag-1"</d:getetag><c:calendar-data>' +
      SINGLE_ICS +
      "</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>";
    const fetchImpl: CalDavFetch = async () => ({ status: 207, text: async () => multistatus });

    const result = await importNextCloudCalendar(testDb.db, connectionId, calendarId, { baseUrl: "https://cloud.example.com", username: "rene", appPassword: "pw" }, WINDOW, fetchImpl);
    expect(result.imported).toBe(1);
    expect(await testDb.db.select().from(events)).toHaveLength(1);
  });
});
