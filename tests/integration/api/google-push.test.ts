/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App (buildTestApp, enableAuth), echte Test-MySQL, echter Auth-Guard und
 *   Sync-Dispatcher. Nur der Google-Fetcher (events.watch) wird injiziert.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks. Der Sync-Handler wird über die reale Registry gesetzt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll + clearCalendarSyncHandlers vor jedem Test.
 *
 * Abgedeckte Regeln (AP-4.2):
 * - watch registriert einen Channel mit korrekter Id/Adresse/HMAC-Token, gibt resourceId/expiration zurück
 * - Push-Benachrichtigung mit gültigem Token stößt den Sync der zugehörigen Verbindung an
 * - Webhook-Route ist offen erreichbar (kein Login), der HMAC-Token schützt gegen Fälschung
 * - Handshake ("sync") wird quittiert, ohne zu synchronisieren
 *
 * Fehlerfälle:
 * - Ungültiger Token, fremde Channel-Id, unbekannte Verbindung → kein Sync (Route quittiert dennoch 200)
 * - events.watch HTTP-Fehler → GoogleAuthError
 *
 * Ziel:
 * Absicherung der Google-Push-Anbindung (events.watch + Webhook).
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository, externalCalendarRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { clearCalendarSyncHandlers, registerCalendarSyncHandler } from "../../../apps/api/src/services/calendar-sync.service.js";
import { handlePushNotification, pushChannelId, renewExpiringChannels, signPushToken, stopGoogleWatch, watchGoogleCalendar } from "../../../apps/api/src/services/google/google-push.service.js";
import { GoogleAuthError, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const ADMIN_ID = 1;

function watchFetch(status = 200, body: Record<string, unknown> = { resourceId: "res-1", expiration: "1999999999999" }): { fetchImpl: GoogleTokenFetch; requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> } {
  const requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
  const fetchImpl: GoogleTokenFetch = async (url, init) => {
    requests.push({ url, method: init.method, body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : undefined });
    return { status, json: async () => body };
  };
  return { fetchImpl, requests };
}

describe("Google Push (events.watch) (AP-4.2)", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "google-push-test-key";
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
    await app?.close();
    await testDb?.close();
  });

  async function setupConnection(): Promise<number> {
    const connection = await calendarConnectionRepository.create(testDb.db, { userId: ADMIN_ID, provider: "google", displayName: "G" }, ADMIN_ID);
    await calendarCredentialService.store(testDb.db, connection.id, { refreshToken: "rt", accessToken: "valid-at", expiresAt: String(Date.now() + 3_600_000) });
    await externalCalendarRepository.upsert(testDb.db, { connectionId: connection.id, externalId: "cal-google", name: "Google", imported: true, readonly: false });
    return connection.id;
  }

  it("registriert einen Push-Channel mit korrekter Id, Adresse und HMAC-Token", async () => {
    const connectionId = await setupConnection();
    const { fetchImpl, requests } = watchFetch();
    const result = await watchGoogleCalendar(testDb.db, connectionId, "https://example.com/hook", fetchImpl);

    expect(result.channelId).toBe(pushChannelId(connectionId));
    expect(result.resourceId).toBe("res-1");
    const post = requests.find((request) => request.method === "POST");
    expect(post?.body?.id).toBe(pushChannelId(connectionId));
    expect(post?.body?.type).toBe("web_hook");
    expect(post?.body?.address).toBe("https://example.com/hook");
    expect(post?.body?.token).toBe(signPushToken(connectionId));
  });

  it("meldet einen events.watch-Fehler als GoogleAuthError", async () => {
    const connectionId = await setupConnection();
    await expect(watchGoogleCalendar(testDb.db, connectionId, "https://example.com/hook", watchFetch(500, {}).fetchImpl)).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("stößt bei gültigem Token den Sync der Verbindung an", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("google", async (_database, connection) => {
      synced.push(connection.id);
    });
    const connectionId = await setupConnection();
    const handled = await handlePushNotification(testDb.db, pushChannelId(connectionId), signPushToken(connectionId));
    expect(handled).toBe(true);
    expect(synced).toEqual([connectionId]);
  });

  it("weist einen ungültigen Token ab (kein Sync)", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("google", async (_database, connection) => {
      synced.push(connection.id);
    });
    const connectionId = await setupConnection();
    expect(await handlePushNotification(testDb.db, pushChannelId(connectionId), "gefaelscht")).toBe(false);
    expect(synced).toEqual([]);
  });

  it("weist eine fremde Channel-Id und eine unbekannte Verbindung ab", async () => {
    expect(await handlePushNotification(testDb.db, "fremd-1", signPushToken(1))).toBe(false);
    expect(await handlePushNotification(testDb.db, pushChannelId(999_999), signPushToken(999_999))).toBe(false);
  });

  it("Webhook mit gültigem Token ist offen erreichbar und stößt den Sync an", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("google", async (_database, connection) => {
      synced.push(connection.id);
    });
    const connectionId = await setupConnection();
    // Kein Login — die Route ist offen; der HMAC-Token schützt.
    await supertest(app.server)
      .post("/api/calendar-connections/google/notifications")
      .set("x-goog-channel-id", pushChannelId(connectionId))
      .set("x-goog-channel-token", signPushToken(connectionId))
      .set("x-goog-resource-state", "exists")
      .expect(200);
    expect(synced).toEqual([connectionId]);
  });

  it("Webhook quittiert Handshake und ungültigen Token mit 200, ohne zu synchronisieren", async () => {
    const synced: number[] = [];
    registerCalendarSyncHandler("google", async (_database, connection) => {
      synced.push(connection.id);
    });
    const connectionId = await setupConnection();

    await supertest(app.server)
      .post("/api/calendar-connections/google/notifications")
      .set("x-goog-channel-id", pushChannelId(connectionId))
      .set("x-goog-channel-token", signPushToken(connectionId))
      .set("x-goog-resource-state", "sync")
      .expect(200);
    await supertest(app.server)
      .post("/api/calendar-connections/google/notifications")
      .set("x-goog-channel-id", pushChannelId(connectionId))
      .set("x-goog-channel-token", "gefaelscht")
      .set("x-goog-resource-state", "exists")
      .expect(200);

    expect(synced).toEqual([]);
  });

  it("persistiert die Kanaldaten (channelId/resourceId/expiration) am Zielkalender", async () => {
    const connectionId = await setupConnection();
    await watchGoogleCalendar(testDb.db, connectionId, "https://example.com/hook", watchFetch(200, { resourceId: "res-42", expiration: "1999999999999" }).fetchImpl);
    const target = (await externalCalendarRepository.listByConnection(testDb.db, connectionId)).find((calendar) => calendar.pushChannelId);
    expect(target?.pushChannelId).toBe(pushChannelId(connectionId));
    expect(target?.pushResourceId).toBe("res-42");
    expect(target?.pushExpiration).toBe("1999999999999");
  });

  it("meldet den Kanal per channels.stop ab und löscht die lokalen Kanaldaten", async () => {
    const connectionId = await setupConnection();
    await watchGoogleCalendar(testDb.db, connectionId, "https://example.com/hook", watchFetch().fetchImpl);
    const stop = watchFetch(204, {});
    const stopped = await stopGoogleWatch(testDb.db, connectionId, stop.fetchImpl);

    expect(stopped).toBe(true);
    expect(stop.requests[0]?.url).toContain("/channels/stop");
    expect(stop.requests[0]?.body?.id).toBe(pushChannelId(connectionId));
    expect(stop.requests[0]?.body?.resourceId).toBe("res-1");
    const target = (await externalCalendarRepository.listByConnection(testDb.db, connectionId)).find((calendar) => calendar.imported);
    expect(target?.pushChannelId).toBeNull();
  });

  it("meldet false, wenn kein aktiver Push-Kanal zum Abmelden existiert", async () => {
    const connectionId = await setupConnection();
    expect(await stopGoogleWatch(testDb.db, connectionId, watchFetch().fetchImpl)).toBe(false);
  });

  it("erneuert nur Kanäle, die innerhalb des Schwellenfensters ablaufen", async () => {
    const NOW = 1_700_000_000_000;
    const soon = await setupConnection();
    const later = await setupConnection();
    await watchGoogleCalendar(testDb.db, soon, "https://hook", watchFetch(200, { resourceId: "r-soon", expiration: String(NOW + 3_600_000) }).fetchImpl); // +1 h
    await watchGoogleCalendar(testDb.db, later, "https://hook", watchFetch(200, { resourceId: "r-late", expiration: String(NOW + 48 * 3_600_000) }).fetchImpl); // +48 h

    const renew = watchFetch(200, { resourceId: "r-renewed", expiration: String(NOW + 7 * 24 * 3_600_000) });
    const result = await renewExpiringChannels(testDb.db, "https://hook", NOW, renew.fetchImpl);

    expect(result.renewed).toBe(1);
    // Der bald ablaufende Kanal trägt jetzt die neue Ablaufzeit, der ferne ist unverändert.
    const soonTarget = (await externalCalendarRepository.listByConnection(testDb.db, soon)).find((calendar) => calendar.pushChannelId);
    expect(soonTarget?.pushExpiration).toBe(String(NOW + 7 * 24 * 3_600_000));
    const laterTarget = (await externalCalendarRepository.listByConnection(testDb.db, later)).find((calendar) => calendar.pushChannelId);
    expect(laterTarget?.pushExpiration).toBe(String(NOW + 48 * 3_600_000));
  });
});
