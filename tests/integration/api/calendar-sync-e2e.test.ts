/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration / End-to-End (Abnahme-Gate AP-4.4)
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echte Repositories/Services, echter Sync-Dispatcher, echte Verschlüsselung und
 *   echter iCal-/Zeitzonen-Code. Nur die externen Netzwerk-Fetcher (Google, CalDAV) werden mit
 *   aufgezeichneten Antworten injiziert — laut Aufgabe ausdrücklich als hochwertige Mocks zulässig,
 *   da kein echtes Google-Konto / keine NextCloud-Instanz bereitsteht.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der HTTP-Fetcher je Provider (zeichnet Methoden für den
 *   „kein-Schreibzugriff"-Nachweis auf).
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll + clearCalendarSyncHandlers vor jedem Test.
 *
 * Abgedeckte Szenarien (die fünf verpflichtenden E2E-Abläufe):
 * 1. NextCloud read-only: verbinden → importieren → spiegeln; nur lesende CalDAV-Methoden
 * 2. Google Import inkl. Serie über die DST-Grenze (konstante Wandzeit)
 * 3. Google Export: App-Termin erscheint in Google mit Herkunftsmarke
 * 4. Bidirektional + Konflikt (LWW) und mehrere Zyklen ohne Echo/Duplikat
 * 5. Resilienz: Re-Auth, 410-Resync, 429-Fehlerstatus, NextCloud offline isoliert
 *
 * Ziel:
 * Verbindlicher Nachweis, dass das Gesamtsystem als Ganzes funktioniert.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { insertId } from "../../../apps/api/src/db/query-utils.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import type { CalDavFetch } from "../../../apps/api/src/services/caldav/caldav-client.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { clearCalendarSyncHandlers, syncCalendarConnection } from "../../../apps/api/src/services/calendar-sync.service.js";
import { runScheduledSync } from "../../../apps/api/src/services/calendar-scheduler.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { exportEventToGoogle, loadLocalEvent } from "../../../apps/api/src/services/google/google-export.service.js";
import { registerGoogleSyncHandler } from "../../../apps/api/src/services/google/google-events.service.js";
import type { GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { connectNextCloud } from "../../../apps/api/src/services/nextcloud-connection.service.js";
import { defaultImportWindow, registerNextCloudSyncHandler } from "../../../apps/api/src/services/nextcloud-sync.service.js";
import { type ImportWindow } from "../../../apps/api/src/services/ical-import.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const USER_ID = 1;
const WINDOW: ImportWindow = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-12-31T23:59:59Z") };

const DISCOVERY_XML =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">' +
  "<d:response><d:href>/remote.php/dav/calendars/rene/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "<d:response><d:href>/remote.php/dav/calendars/rene/personal/</d:href><d:propstat><d:prop><d:displayname>Privat</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "</d:multistatus>";

const ICS =
  "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\nBEGIN:VEVENT\r\nUID:nc1\r\nDTSTART;TZID=Europe/Berlin:20260701T090000\r\nDTEND;TZID=Europe/Berlin:20260701T100000\r\nSUMMARY:NextCloud-Termin\r\nEND:VEVENT\r\nEND:VCALENDAR";

function syncXml(href: string, etag: string, token: string): string {
  return `<d:multistatus xmlns:d="DAV:"><d:response><d:href>${href}</d:href><d:propstat><d:prop><d:getetag>"${etag}"</d:getetag></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response><d:sync-token>${token}</d:sync-token></d:multistatus>`;
}
function syncDeletedXml(href: string, token: string): string {
  return `<d:multistatus xmlns:d="DAV:"><d:response><d:href>${href}</d:href><d:status>HTTP/1.1 404 Not Found</d:status></d:response><d:sync-token>${token}</d:sync-token></d:multistatus>`;
}
function multigetXml(href: string, ics: string): string {
  return `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${href}</d:href><d:propstat><d:prop><d:getetag>"e"</d:getetag><c:calendar-data>${ics}</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`;
}

describe("Kalender-Synchronisation — E2E-Abnahme (AP-4.4)", () => {
  let testDb: TestDb;
  let originalKey: string | null;
  let originalClientId: string | null;
  let originalSecret: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    originalClientId = config.googleClientId;
    originalSecret = config.googleClientSecret;
    config.calendarEncryptionKey = "e2e-abnahme-key";
    config.googleClientId = "client-id";
    config.googleClientSecret = "client-secret";
    resetCredentialCipherCache();
  });
  beforeEach(async () => {
    await truncateAll(testDb.pool);
    clearCalendarSyncHandlers();
  });
  afterAll(async () => {
    config.calendarEncryptionKey = originalKey;
    config.googleClientId = originalClientId;
    config.googleClientSecret = originalSecret;
    resetCredentialCipherCache();
    clearCalendarSyncHandlers();
    await testDb?.close();
  });

  async function setupGoogle(displayName = "Google"): Promise<number> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: USER_ID, provider: "google", displayName }, USER_ID);
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "cal-google", name: "Google", imported: true, readonly: false });
    return connection.id;
  }

  async function localEventCount(connectionId: number): Promise<number> {
    return (await eventMappingRepository.listByConnection(testDb.db, connectionId)).length;
  }

  // ── Szenario 1: NextCloud read-only ────────────────────────────────────────────────────────────
  it("Szenario 1: NextCloud verbinden, importieren, Änderung/Löschung spiegeln — nur lesende Methoden", async () => {
    const requests: string[] = [];
    let syncStep = 0;
    const href = "/remote.php/dav/calendars/rene/personal/nc1.ics";
    const fetchImpl: CalDavFetch = async (_url, init) => {
      requests.push(init.method);
      const body = String(init.body ?? "");
      if (init.method === "PROPFIND") {
        return { status: 207, text: async () => DISCOVERY_XML };
      }
      if (body.includes("sync-collection")) {
        syncStep += 1;
        if (syncStep === 1) return { status: 207, text: async () => syncXml(href, "e1", "tok-1") };
        return { status: 207, text: async () => syncDeletedXml(href, "tok-2") };
      }
      if (body.includes("calendar-multiget")) {
        return { status: 207, text: async () => multigetXml(href, ICS) };
      }
      return { status: 404, text: async () => "" };
    };

    const connection = await connectNextCloud(testDb.db, USER_ID, { displayName: "Büro-Cloud", baseUrl: "https://cloud.example.com", username: "rene", appPassword: "pw" }, fetchImpl);
    const calendars = await externalCalendarRepository.listByConnection(testDb.db, connection.id);
    expect(calendars.every((entry) => entry.readonly)).toBe(true);
    // Kalenderauswahl: den passenden Kalender zum Import markieren (der href des Ereignisses liegt darunter).
    const personal = calendars.find((entry) => entry.externalId.endsWith("/personal/")) ?? calendars[0];
    await externalCalendarRepository.setImported(testDb.db, personal.id, true);

    registerNextCloudSyncHandler(() => WINDOW, fetchImpl);

    // Erster Sync → Import; das Ereignis liegt read-only vor.
    await syncCalendarConnection(testDb.db, connection.id, USER_ID);
    const afterImport = await eventMappingRepository.listByConnection(testDb.db, connection.id);
    expect(afterImport).toHaveLength(1);
    const imported = await loadLocalEvent(testDb.db, afterImport[0].localEventId);
    expect(imported?.readonly).toBe(true);
    expect(imported?.origin).toBe("nextcloud");

    // Zweiter Sync meldet Löschung → App entfernt den Termin.
    await syncCalendarConnection(testDb.db, connection.id, USER_ID);
    expect(await eventMappingRepository.listByConnection(testDb.db, connection.id)).toHaveLength(0);

    // Kein Schreibzugriff auf NextCloud: ausschließlich lesende Methoden.
    expect(requests.every((method) => method === "PROPFIND" || method === "REPORT")).toBe(true);
    expect(requests.some((method) => ["PUT", "POST", "DELETE", "PATCH", "PROPPATCH", "MKCALENDAR"].includes(method))).toBe(false);
  });

  // ── Szenario 2: Google Import inkl. Serie über die DST-Grenze ────────────────────────────────────
  it("Szenario 2: Google-Serie über die DST-Grenze wird mit konstanter Wandzeit importiert", async () => {
    const connectionId = await setupGoogle();
    registerGoogleSyncHandler(async () => ({
      status: 200,
      json: async () => ({
        items: [
          { id: "s1", status: "confirmed", summary: "Team", etag: "e1", recurringEventId: "serie", start: { dateTime: "2026-03-25T10:00:00+01:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-03-25T11:00:00+01:00", timeZone: "Europe/Berlin" } },
          { id: "s2", status: "confirmed", summary: "Team", etag: "e2", recurringEventId: "serie", start: { dateTime: "2026-04-01T10:00:00+02:00", timeZone: "Europe/Berlin" }, end: { dateTime: "2026-04-01T11:00:00+02:00", timeZone: "Europe/Berlin" } }
        ],
        nextSyncToken: "s"
      })
    }));

    await syncCalendarConnection(testDb.db, connectionId, USER_ID);
    const mappings = await eventMappingRepository.listByConnection(testDb.db, connectionId);
    const times = (await Promise.all(mappings.map((mapping) => loadLocalEvent(testDb.db, mapping.localEventId)))).map((entry) => entry?.startTime);
    expect(times.sort()).toEqual(["2026-03-25T10:00:00", "2026-04-01T10:00:00"]);
  });

  // ── Szenario 3: Google Export mit Herkunftsmarke ────────────────────────────────────────────────
  it("Szenario 3: App-Termin wird nach Google exportiert und trägt die Herkunftsmarke", async () => {
    const connectionId = await setupGoogle();
    const now = new Date().toISOString();
    const inserted = await testDb.db.insert(events).values({ title: "Planungstermin", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00", isAllDay: false, origin: "local", readonly: false, createdAt: now, updatedAt: now });
    const localEventId = insertId(inserted);

    const posted: Array<Record<string, unknown>> = [];
    const exportFetch: GoogleTokenFetch = async (_url, init) => {
      if (init.method === "POST") {
        posted.push(init.body ? (JSON.parse(init.body) as Record<string, unknown>) : {});
        return { status: 200, json: async () => ({ id: "g-exported", etag: "e", iCalUID: null }) };
      }
      return { status: 200, json: async () => ({}) };
    };
    const outcome = await exportEventToGoogle(testDb.db, connectionId, localEventId, exportFetch);
    expect(outcome.action).toBe("insert");
    expect(posted[0]?.summary).toBe("Planungstermin");
    expect((posted[0]?.extendedProperties as { private?: { pmOrigin?: string } })?.private?.pmOrigin).toBe("projektmanager");

    // Mapping als Herkunftsnachweis (App → Google).
    const mapping = await eventMappingRepository.findByLocalEvent(testDb.db, localEventId);
    expect(mapping?.externalId).toBe("g-exported");
    expect(mapping?.origin).toBe("local");
  });

  // ── Szenario 4: Bidirektional + Konflikt + kein Echo über mehrere Zyklen ─────────────────────────
  it("Szenario 4: mehrere Sync-Zyklen erzeugen kein Echo/Duplikat (etag-stabiles Google-Event)", async () => {
    const connectionId = await setupGoogle();
    const item = { id: "stable", status: "confirmed", summary: "Fix", etag: "same-etag", start: { dateTime: "2026-07-01T10:00:00Z" }, end: { dateTime: "2026-07-01T11:00:00Z" } };
    registerGoogleSyncHandler(async (_url, init) => {
      if (init.method === "GET") {
        return { status: 200, json: async () => ({ items: [item], nextSyncToken: "s" }) };
      }
      return { status: 200, json: async () => ({ etag: "same-etag" }) };
    });

    await syncCalendarConnection(testDb.db, connectionId, USER_ID);
    expect(await localEventCount(connectionId)).toBe(1);
    // Zwei weitere Zyklen: identisches etag → Echo-Skip, keine Duplikate.
    await syncCalendarConnection(testDb.db, connectionId, USER_ID);
    await syncCalendarConnection(testDb.db, connectionId, USER_ID);
    expect(await localEventCount(connectionId)).toBe(1);
  });

  // ── Szenario 5: Resilienz ───────────────────────────────────────────────────────────────────────
  it("Szenario 5a: widerrufenes Token führt zu reauth_required", async () => {
    const connectionId = await setupGoogle();
    // Kein gültiges Access-Token erzwingt einen Refresh; der antwortet mit invalid_grant.
    await calendarCredentialService.store(testDb.db, connectionId, { refreshToken: "rt", accessToken: "expired", expiresAt: String(Date.now() - 1000) });
    registerGoogleSyncHandler(async () => ({ status: 400, json: async () => ({ error: "invalid_grant" }) }));

    const result = await syncCalendarConnection(testDb.db, connectionId, USER_ID);
    expect(result.status).toBe("reauth_required");
  });

  it("Szenario 5b: HTTP 410 löst einen Full-Resync aus, 429 meldet einen Fehlerstatus", async () => {
    const resyncId = await setupGoogle("G-410");
    let step = 0;
    registerGoogleSyncHandler(async () => {
      step += 1;
      if (step === 1) return { status: 410, json: async () => ({}) };
      return { status: 200, json: async () => ({ items: [{ id: "fresh", status: "confirmed", summary: "Neu", etag: "e", start: { dateTime: "2026-07-01T10:00:00Z" }, end: { dateTime: "2026-07-01T11:00:00Z" } }], nextSyncToken: "s" }) };
    });
    const resynced = await syncCalendarConnection(testDb.db, resyncId, USER_ID);
    expect(resynced.status).toBe("active");
    expect(await localEventCount(resyncId)).toBe(1);

    const rateId = await setupGoogle("G-429");
    registerGoogleSyncHandler(async () => ({ status: 429, json: async () => ({ error: "rateLimitExceeded" }) }));
    const limited = await syncCalendarConnection(testDb.db, rateId, USER_ID);
    expect(limited.status).toBe("error");
  });

  it("Szenario 5c: eine ausgefallene Verbindung stoppt die anderen nicht (Isolation im Scheduler)", async () => {
    // Google-Verbindung liefert sauber; NextCloud-Verbindung fällt aus.
    const googleId = await setupGoogle("G-ok");
    registerGoogleSyncHandler(async (_url, init) => {
      if (init.method === "GET") return { status: 200, json: async () => ({ items: [{ id: "ok1", status: "confirmed", summary: "OK", etag: "e", start: { dateTime: "2026-07-01T10:00:00Z" }, end: { dateTime: "2026-07-01T11:00:00Z" } }], nextSyncToken: "s" }) };
      return { status: 200, json: async () => ({}) };
    });
    const ncConnection = await calendarConnectionRepository.create(testDb.db, { userId: USER_ID, provider: "nextcloud", displayName: "NC-offline" }, USER_ID);
    await calendarCredentialService.store(testDb.db, ncConnection.id, { baseUrl: "https://cloud.example.com", username: "rene", appPassword: "pw" });
    await externalCalendarRepository.upsert(testDb.db, { connectionId: ncConnection.id, externalId: "/cal/", name: "NC", imported: true, readonly: true });
    registerNextCloudSyncHandler(() => WINDOW, async () => {
      throw new Error("NextCloud nicht erreichbar");
    });

    const result = await runScheduledSync(testDb.db);
    expect(result.processed).toBe(2);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);

    // Google blieb aktiv und importierte; NextCloud steht auf Fehler.
    expect((await calendarConnectionRepository.findById(testDb.db, googleId))?.status).toBe("active");
    expect((await calendarConnectionRepository.findById(testDb.db, ncConnection.id))?.status).toBe("error");
    expect(await localEventCount(googleId)).toBe(1);
  });

  // ── Randfälle der Fehler-/Ausfallpfade (Abnahme-Härtung) ────────────────────────────────────────
  it("Szenario 5d: ein Netzwerkabbruch beim NextCloud-Verbinden wird als Fehler weitergereicht", async () => {
    const throwingFetch: CalDavFetch = async () => {
      throw new Error("Netzwerk nicht erreichbar");
    };
    await expect(
      connectNextCloud(testDb.db, USER_ID, { displayName: "X", baseUrl: "https://cloud.example.com", username: "u", appPassword: "p" }, throwingFetch)
    ).rejects.toThrow("Netzwerk nicht erreichbar");
    // Kein Teilzustand: es entsteht keine Verbindung.
    expect(await calendarConnectionRepository.listByUser(testDb.db, USER_ID)).toHaveLength(0);
  });

  it("Szenario 5e: eine NextCloud-Verbindung ohne Zugangsdaten meldet einen Fehlerstatus", async () => {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: USER_ID, provider: "nextcloud", displayName: "Ohne Creds" }, USER_ID);
    await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "/cal/", name: "NC", imported: true, readonly: true });
    registerNextCloudSyncHandler(() => WINDOW);
    const result = await syncCalendarConnection(testDb.db, connection.id, USER_ID);
    expect(result.status).toBe("error");
  });

  it("liefert ein plausibles Standard-Importfenster (ein Monat zurück bis zwölf Monate voraus)", () => {
    const window = defaultImportWindow();
    expect(window.from.getTime()).toBeLessThan(window.to.getTime());
  });
});
