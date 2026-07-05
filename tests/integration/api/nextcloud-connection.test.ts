/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Verbindungs-/Kalender-Repository, echte AES-256-GCM-Verschlüsselung.
 *   Der CalDAV-HTTP-Zugriff wird durch aufgezeichnete Antworten (injizierter fetch) ersetzt —
 *   laut Aufgabe ausdrücklich zulässig (gemockte CalDAV-Antworten), da keine echte NextCloud-Instanz.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; einzig der Netzwerk-Fetcher wird injiziert (technische Beigabe).
 *   config.calendarEncryptionKey wird für die Suite gesetzt und danach zurückgesetzt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test, Admin-User id=1.
 *
 * Abgedeckte Regeln:
 * - Erfolgreiche Verbindung legt Verbindung an, speichert Zugangsdaten verschlüsselt und
 *   persistiert die entdeckten Kalender als read-only
 *
 * Fehlerfälle:
 * - Falsche Zugangsdaten (401) und http:// werden abgewiesen, ohne eine Verbindung anzulegen
 *
 * Ziel:
 * Absicherung des NextCloud-Verbinden-Flows inkl. sicherer Credential-Ablage.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import type { CalDavFetch } from "../../../apps/api/src/services/caldav/caldav-client.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { connectNextCloud } from "../../../apps/api/src/services/nextcloud-connection.service.js";
import { AppError } from "../../../apps/api/src/utils/errors.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const MULTISTATUS =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">' +
  "<d:response><d:href>/remote.php/dav/calendars/rene/</d:href>" +
  "<d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "<d:response><d:href>/remote.php/dav/calendars/rene/personal/</d:href>" +
  "<d:propstat><d:prop><d:displayname>Privat</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype><ic:calendar-color>#FF0000</ic:calendar-color></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "<d:response><d:href>/remote.php/dav/calendars/rene/work/</d:href>" +
  "<d:propstat><d:prop><d:displayname>Arbeit</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "</d:multistatus>";

const okFetch: CalDavFetch = async () => ({ status: 207, text: async () => MULTISTATUS });

describe("NextCloud Connect (AP-1.1)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "nextcloud-test-encryption-key";
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

  it("legt eine Verbindung an, verschlüsselt die Zugangsdaten und persistiert die Kalender read-only", async () => {
    const connection = await connectNextCloud(
      testDb.db,
      1,
      { displayName: "Büro-Cloud", baseUrl: "https://cloud.example.com", username: "rene", appPassword: "geheim-app-pw" },
      okFetch
    );

    expect(connection.provider).toBe("nextcloud");
    expect(connection.displayName).toBe("Büro-Cloud");
    expect(connection).not.toHaveProperty("encryptedCredentials");

    const calendars = await externalCalendarRepository.listByConnection(testDb.db, connection.id);
    expect(calendars.map((c) => c.name).sort()).toEqual(["Arbeit", "Privat"]);
    expect(calendars.every((c) => c.readonly)).toBe(true);

    const [rows] = await testDb.pool.query("SELECT encrypted_credentials FROM calendar_connections WHERE id = ?", [connection.id]);
    const cipher = (rows as Array<{ encrypted_credentials: string | null }>)[0].encrypted_credentials;
    expect(cipher).toBeTruthy();
    expect(cipher).not.toContain("geheim-app-pw");

    expect(await calendarCredentialService.load(testDb.db, connection.id)).toEqual({
      baseUrl: "https://cloud.example.com",
      username: "rene",
      appPassword: "geheim-app-pw"
    });
  });

  it("weist falsche Zugangsdaten (401) ab, ohne eine Verbindung anzulegen", async () => {
    const unauthorizedFetch: CalDavFetch = async () => ({ status: 401, text: async () => "" });
    await expect(
      connectNextCloud(testDb.db, 1, { displayName: "X", baseUrl: "https://cloud.example.com", username: "rene", appPassword: "falsch" }, unauthorizedFetch)
    ).rejects.toBeInstanceOf(AppError);
    expect(await calendarConnectionRepository.listByUser(testDb.db, 1)).toHaveLength(0);
  });

  it("lehnt http:// ab (nur HTTPS) und legt keine Verbindung an", async () => {
    await expect(
      connectNextCloud(testDb.db, 1, { displayName: "X", baseUrl: "http://cloud.example.com", username: "rene", appPassword: "pw" }, okFetch)
    ).rejects.toBeInstanceOf(AppError);
    expect(await calendarConnectionRepository.listByUser(testDb.db, 1)).toHaveLength(0);
  });

  it("weist einen leeren Anzeigenamen ab", async () => {
    await expect(
      connectNextCloud(testDb.db, 1, { displayName: "   ", baseUrl: "https://cloud.example.com", username: "rene", appPassword: "pw" }, okFetch)
    ).rejects.toBeInstanceOf(AppError);
  });
});
