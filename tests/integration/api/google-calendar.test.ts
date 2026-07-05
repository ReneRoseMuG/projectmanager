/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Kalender-Repository, echte Verschlüsselung. Der Google-API-Zugriff
 *   (calendarList) wird über den injizierten fetch mit aufgezeichneten Antworten ersetzt.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der Netzwerk-Fetcher. Google-Client + EncryptionKey werden konfiguriert.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Kalenderliste trägt korrektes writable-Flag (owner/writer schreibbar, reader nicht)
 * - Nur beschreibbare Kalender wählbar; Auswahl wird persistiert (genau ein Ziel je Verbindung)
 * - Ohne Auswahl Fallback auf primary; bestehende Auswahl hat Vorrang
 *
 * Fehlerfälle:
 * - Auswahl eines reinen Lesekalenders wird abgewiesen
 *
 * Ziel:
 * Absicherung der Google-Zielkalender-Auswahl.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { ensureGoogleTargetCalendar, listGoogleCalendars, selectGoogleCalendar } from "../../../apps/api/src/services/google/google-calendar.service.js";
import { GoogleAuthError, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { AppError } from "../../../apps/api/src/utils/errors.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const CALENDAR_LIST = {
  items: [
    { id: "primary-cal", summary: "Mein Kalender", accessRole: "owner", primary: true, backgroundColor: "#ff0000" },
    { id: "shared-writer", summary: "Team", accessRole: "writer" },
    { id: "readonly-cal", summary: "Feiertage", accessRole: "reader" }
  ]
};

function calendarFetch(status: number, body: Record<string, unknown>): GoogleTokenFetch {
  return async () => ({ status, json: async () => body });
}

describe("Google Zielkalender-Auswahl (AP-2.2)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-calendar-test-key";
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

  async function setupGoogleConnection(): Promise<number> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "google", displayName: "G" }, 1);
    // Noch gültiges Access-Token → ensureGoogleAccessToken refresht nicht, der fetch bedient nur calendarList.
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    return connection.id;
  }

  it("listet Kalender mit korrektem writable-Flag", async () => {
    const connectionId = await setupGoogleConnection();
    const calendars = await listGoogleCalendars(testDb.db, connectionId, calendarFetch(200, CALENDAR_LIST));
    expect(calendars).toHaveLength(3);
    expect(calendars.find((calendar) => calendar.id === "primary-cal")?.writable).toBe(true);
    expect(calendars.find((calendar) => calendar.id === "shared-writer")?.writable).toBe(true);
    expect(calendars.find((calendar) => calendar.id === "readonly-cal")?.writable).toBe(false);
  });

  it("wählt einen beschreibbaren Kalender und persistiert genau ein Ziel", async () => {
    const connectionId = await setupGoogleConnection();
    const calendar = await selectGoogleCalendar(testDb.db, connectionId, "shared-writer", calendarFetch(200, CALENDAR_LIST));
    expect(calendar.externalId).toBe("shared-writer");
    expect(calendar.imported).toBe(true);
    expect(calendar.readonly).toBe(false);
    const imported = (await externalCalendarRepository.listByConnection(testDb.db, connectionId)).filter((entry) => entry.imported);
    expect(imported).toHaveLength(1);
  });

  it("lehnt die Auswahl eines reinen Lesekalenders ab", async () => {
    const connectionId = await setupGoogleConnection();
    await expect(selectGoogleCalendar(testDb.db, connectionId, "readonly-cal", calendarFetch(200, CALENDAR_LIST))).rejects.toBeInstanceOf(AppError);
  });

  it("fällt ohne Auswahl auf den primären Kalender zurück", async () => {
    const connectionId = await setupGoogleConnection();
    const target = await ensureGoogleTargetCalendar(testDb.db, connectionId, calendarFetch(200, CALENDAR_LIST));
    expect(target.externalId).toBe("primary-cal");
  });

  it("nutzt eine bestehende Auswahl statt des primären Kalenders", async () => {
    const connectionId = await setupGoogleConnection();
    await selectGoogleCalendar(testDb.db, connectionId, "shared-writer", calendarFetch(200, CALENDAR_LIST));
    const target = await ensureGoogleTargetCalendar(testDb.db, connectionId, calendarFetch(200, CALENDAR_LIST));
    expect(target.externalId).toBe("shared-writer");
  });

  it("meldet einen API-Fehler beim Laden der Kalenderliste", async () => {
    const connectionId = await setupGoogleConnection();
    await expect(listGoogleCalendars(testDb.db, connectionId, calendarFetch(500, { error: "backendError" }))).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("lehnt die Auswahl eines unbekannten Kalenders ab", async () => {
    const connectionId = await setupGoogleConnection();
    await expect(selectGoogleCalendar(testDb.db, connectionId, "gibt-es-nicht", calendarFetch(200, CALENDAR_LIST))).rejects.toBeInstanceOf(AppError);
  });

  it("fällt ohne primary auf den ersten beschreibbaren Kalender zurück", async () => {
    const connectionId = await setupGoogleConnection();
    const listNoPrimary = { items: [{ id: "w1", summary: "Writer", accessRole: "writer" }, { id: "r1", summary: "Reader", accessRole: "reader" }] };
    const target = await ensureGoogleTargetCalendar(testDb.db, connectionId, calendarFetch(200, listNoPrimary));
    expect(target.externalId).toBe("w1");
  });

  it("meldet, wenn kein beschreibbarer Kalender verfügbar ist", async () => {
    const connectionId = await setupGoogleConnection();
    const listReadonly = { items: [{ id: "r1", summary: "Reader", accessRole: "reader" }] };
    await expect(ensureGoogleTargetCalendar(testDb.db, connectionId, calendarFetch(200, listReadonly))).rejects.toBeInstanceOf(AppError);
  });

  it("verkraftet Kalender ohne Namen, Farbe und Rolle", async () => {
    const connectionId = await setupGoogleConnection();
    const sparse = { items: [{ id: "sparse-cal" }] };
    const calendars = await listGoogleCalendars(testDb.db, connectionId, calendarFetch(200, sparse));
    expect(calendars[0].summary).toBe("sparse-cal");
    expect(calendars[0].backgroundColor).toBeNull();
    expect(calendars[0].writable).toBe(false);
  });

  it("gibt eine leere Liste zurück, wenn keine Kalender-Items geliefert werden", async () => {
    const connectionId = await setupGoogleConnection();
    expect(await listGoogleCalendars(testDb.db, connectionId, calendarFetch(200, {}))).toEqual([]);
  });
});
