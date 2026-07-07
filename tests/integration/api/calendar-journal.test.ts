/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Journal-/Verbindungs-/Mapping-Repository, echte Verschlüsselung, echter
 *   Sync-Dispatcher. Nur der Google-Netzwerk-Fetcher (OAuth-Token, events.list, Push) wird injiziert.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks. Sync-Handler kommen über die reale Registry.
 *
 * Isolation:
 * - Temp-DB (createTestDb — appliziert auch die neue Journal-Migration), truncateAll +
 *   clearCalendarSyncHandlers vor jedem Test.
 *
 * Abgedeckte Regeln (AP-4.3):
 * - Erfolgreicher Sync → Journal-Eintrag sync_success
 * - Fehlgeschlagener Sync → Status "error" + Journal sync_error mit Ursache
 * - invalid_grant → Status "reauth_required" (nicht "error")
 * - Konflikt aus dem bidirektionalen Google-Sync → Journal conflict
 * - Verbindungs-Trennung → Journal disconnected (überlebt via connectionId=null + Label)
 * - Re-Auth legt keine zweite Verbindung an, erhält Mappings, protokolliert connected
 *
 * Fehlerfälle:
 * - Handler-Fehler / Token-Widerruf (s. o.)
 *
 * Ziel:
 * Absicherung von Fehler-/Status-Führung, Re-Auth-Flow und Journal-Integration.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { events } from "../../../apps/api/src/db/schema.js";
import { insertId } from "../../../apps/api/src/db/query-utils.js";
import { calendarConnectionRepository, eventMappingRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { deleteCalendarConnection } from "../../../apps/api/src/services/calendar-connection.service.js";
import { listCalendarJournal } from "../../../apps/api/src/services/calendar-journal.service.js";
import { clearCalendarSyncHandlers, registerCalendarSyncHandler, runConnectionSync, syncCalendarConnection } from "../../../apps/api/src/services/calendar-sync.service.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { registerGoogleSyncHandler } from "../../../apps/api/src/services/google/google-events.service.js";
import { versionOf } from "../../../apps/api/src/services/google/google-export.service.js";
import { buildGoogleAuthUrl, GoogleAuthError, handleGoogleCallback, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const USER_ID = 1;

const oauthFetch: GoogleTokenFetch = async () => ({ status: 200, json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600 }) });

async function stateFromAuthUrl(db: TestDb["db"]): Promise<string> {
  const url = new URL(await buildGoogleAuthUrl(db, USER_ID));
  const state = url.searchParams.get("state");
  if (!state) {
    throw new Error("kein state in der Auth-URL");
  }
  return state;
}

describe("Fehler-/Status-UI, Re-Auth & Journal (AP-4.3)", () => {
  let testDb: TestDb;
  let originalKey: string | null;
  let originalClientId: string | null;
  let originalSecret: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    originalClientId = config.googleClientId;
    originalSecret = config.googleClientSecret;
    config.calendarEncryptionKey = "journal-test-key";
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

  async function createGoogleConnection(displayName = "Google") {
    return calendarConnectionRepository.create(testDb.db, { userId: USER_ID, provider: "google", displayName }, USER_ID);
  }

  it("protokolliert einen erfolgreichen Sync", async () => {
    registerCalendarSyncHandler("google", async () => {});
    const connection = await createGoogleConnection();
    const result = await runConnectionSync(testDb.db, connection);
    expect(result.status).toBe("active");

    const journal = await listCalendarJournal(testDb.db, USER_ID);
    expect(journal[0].eventType).toBe("sync_success");
    expect(journal[0].connectionId).toBe(connection.id);
  });

  it("protokolliert einen fehlgeschlagenen Sync mit Ursache und setzt Status error", async () => {
    registerCalendarSyncHandler("google", async () => {
      throw new Error("Netzwerk nicht erreichbar");
    });
    const connection = await createGoogleConnection();
    const result = await runConnectionSync(testDb.db, connection);
    expect(result.status).toBe("error");

    const journal = await listCalendarJournal(testDb.db, USER_ID);
    expect(journal[0].eventType).toBe("sync_error");
    expect(journal[0].message).toContain("Netzwerk nicht erreichbar");
  });

  it("setzt bei widerrufenem Token (invalid_grant) den Status reauth_required", async () => {
    registerCalendarSyncHandler("google", async () => {
      throw new GoogleAuthError("invalid_grant", "Refresh-Token widerrufen");
    });
    const connection = await createGoogleConnection();
    const result = await runConnectionSync(testDb.db, connection);
    expect(result.status).toBe("reauth_required");

    const journal = await listCalendarJournal(testDb.db, USER_ID);
    expect(journal[0].eventType).toBe("sync_error");
  });

  it("protokolliert einen Konflikt aus dem bidirektionalen Google-Sync", async () => {
    const connection = await createGoogleConnection();
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    const target = await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "cal-google", name: "Google", imported: true, readonly: false });

    // Lokales Event mit Mapping: seenVersion in der Vergangenheit → aktuelle updatedAt macht es "dirty".
    const now = new Date().toISOString();
    const inserted = await testDb.db.insert(events).values({ title: "Lokal", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00", isAllDay: false, origin: "google", readonly: false, createdAt: now, updatedAt: now });
    const localEventId = insertId(inserted);
    await eventMappingRepository.create(testDb.db, { connectionId: connection.id, externalCalendarId: target.id, localEventId, externalId: "g-conflict", origin: "local", direction: "both", etag: "old-etag", seenVersion: versionOf("2020-01-01T00:00:00.000Z") });

    // Google liefert dasselbe Event mit abweichendem etag, aber ÄLTEREM updated → App gewinnt → Konflikt.
    const conflictFetch: GoogleTokenFetch = async (_url, init) => {
      if (init.method === "GET") {
        return {
          status: 200,
          json: async () => ({ items: [{ id: "g-conflict", status: "confirmed", summary: "Remote", etag: "remote-etag", updated: "2019-01-01T00:00:00.000Z", start: { dateTime: "2026-07-01T10:00:00Z" }, end: { dateTime: "2026-07-01T11:00:00Z" } }], nextSyncToken: "s1" })
        };
      }
      return { status: 200, json: async () => ({ etag: "pushed" }) };
    };
    registerGoogleSyncHandler(conflictFetch);

    await syncCalendarConnection(testDb.db, connection.id, USER_ID);
    const journal = await listCalendarJournal(testDb.db, USER_ID);
    expect(journal.some((entry) => entry.eventType === "conflict")).toBe(true);
  });

  it("protokolliert die Trennung einer Verbindung (überlebt via Label)", async () => {
    const connection = await createGoogleConnection("Weg damit");
    await deleteCalendarConnection(testDb.db, connection.id, USER_ID);

    const journal = await listCalendarJournal(testDb.db, USER_ID);
    const disconnected = journal.find((entry) => entry.eventType === "disconnected");
    expect(disconnected).toBeDefined();
    expect(disconnected?.connectionId).toBeNull();
    expect(disconnected?.connectionLabel).toBe("Weg damit");
  });

  it("führt Re-Auth ohne zweite Verbindung durch, erhält Mappings und protokolliert connected", async () => {
    const first = await handleGoogleCallback(testDb.db, "code-1", await stateFromAuthUrl(testDb.db), oauthFetch);
    // Ein Zielkalender + Mapping an die Verbindung hängen — sie müssen die Re-Auth überleben.
    const target = await externalCalendarRepository.upsert(testDb.db, { connectionId: first.id, externalId: "cal-keep", name: "Bestandskalender", imported: true, readonly: false });
    const now = new Date().toISOString();
    const inserted = await testDb.db.insert(events).values({ title: "Bestand", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00", isAllDay: false, origin: "google", readonly: false, createdAt: now, updatedAt: now });
    await eventMappingRepository.create(testDb.db, { connectionId: first.id, externalCalendarId: target.id, localEventId: insertId(inserted), externalId: "keep-me", origin: "google", direction: "both" });

    const second = await handleGoogleCallback(testDb.db, "code-2", await stateFromAuthUrl(testDb.db), oauthFetch);
    expect(second.id).toBe(first.id);

    const googleConnections = (await calendarConnectionRepository.listByUser(testDb.db, USER_ID)).filter((entry) => entry.provider === "google");
    expect(googleConnections).toHaveLength(1);
    expect(await eventMappingRepository.findByExternalId(testDb.db, first.id, "keep-me")).toBeDefined();

    const journal = await listCalendarJournal(testDb.db, USER_ID);
    expect(journal.filter((entry) => entry.eventType === "connected")).toHaveLength(2);
  });
});
