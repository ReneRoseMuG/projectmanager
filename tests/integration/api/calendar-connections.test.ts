/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App (buildTestApp, enableAuth), echte Test-MySQL, echte Session/Rollen,
 *   echter globaler Auth-Guard und Sync-Dispatcher.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Der Sync-Handler wird über die reale Registry (registerCalendarSyncHandler)
 *   gesetzt — das ist der produktive Erweiterungspunkt, kein Test-Double.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll + clearCalendarSyncHandlers vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - GET listet nur eigene Verbindungen; Response enthält NIE encrypted_credentials
 * - DELETE trennt die eigene Verbindung (Kaskade), Sync-Dispatcher spiegelt Erfolg/Fehler in den Status
 * - Sync ohne registrierten Provider-Handler meldet kontrolliert Fehlerstatus (kein Schein-Erfolg)
 *
 * Fehlerfälle:
 * - Fremde Verbindung: 404 (Eigentümerschaft); Reader ohne delete-Permission: 403; anonym: 401
 *
 * Ziel:
 * Absicherung der Verwaltungs-API für Kalenderverbindungen inkl. serverseitiger Berechtigung.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { clearCalendarSyncHandlers, registerCalendarSyncHandler } from "../../../apps/api/src/services/calendar-sync.service.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

// bcrypt-Hash für "password123" (identisch zum Seed-Admin).
const PASSWORD_HASH = "$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q";
const ADMIN_ID = 1;

describe("Calendar Connections API (AP-0.3)", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    clearCalendarSyncHandlers();
  });

  afterAll(async () => {
    clearCalendarSyncHandlers();
    await app?.close();
    await testDb?.close();
  });

  async function login(email: string, password = "password123") {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email, password }).expect(200);
    return agent;
  }

  async function createUser(email: string, roleId: number): Promise<number> {
    const [result] = await testDb.pool.execute(
      "INSERT INTO users (name, full_name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) " +
        "VALUES ('', ?, 'T', 'U', ?, ?, ?, 1, 1, NOW(), NOW())",
      [email, email, PASSWORD_HASH, roleId]
    );
    return (result as { insertId: number }).insertId;
  }

  async function makeConnection(userId: number, overrides: Partial<{ provider: "google" | "nextcloud"; displayName: string; encryptedCredentials: string }> = {}) {
    return calendarConnectionRepository.create(
      testDb.db,
      { userId, provider: overrides.provider ?? "nextcloud", displayName: overrides.displayName ?? "Verbindung", encryptedCredentials: overrides.encryptedCredentials },
      userId
    );
  }

  it("GET /calendar-connections listet nur die eigenen Verbindungen, ohne Credential-Feld", async () => {
    const agent = await login("admin@local");
    await makeConnection(ADMIN_ID, { displayName: "Meine A", provider: "google" });
    await makeConnection(ADMIN_ID, { displayName: "Meine B", provider: "nextcloud" });
    const otherUserId = await createUser("fremd@local", 2);
    await makeConnection(otherUserId, { displayName: "Fremd" });

    const res = await agent.get("/api/calendar-connections").expect(200);
    expect((res.body as Array<{ displayName: string }>).map((c) => c.displayName).sort()).toEqual(["Meine A", "Meine B"]);
    expect(res.body[0]).not.toHaveProperty("encryptedCredentials");
    expect(res.body[0]).not.toHaveProperty("encrypted_credentials");
  });

  it("DELETE /calendar-connections/:id trennt die eigene Verbindung", async () => {
    const agent = await login("admin@local");
    const conn = await makeConnection(ADMIN_ID, { encryptedCredentials: "cipher" });
    await agent.delete(`/api/calendar-connections/${conn.id}`).expect(204);
    expect(await calendarConnectionRepository.findById(testDb.db, conn.id)).toBeUndefined();
  });

  it("DELETE einer fremden Verbindung liefert 404 und lässt sie bestehen", async () => {
    const agent = await login("admin@local");
    const otherUserId = await createUser("fremd@local", 2);
    const foreign = await makeConnection(otherUserId, { displayName: "Fremd" });
    await agent.delete(`/api/calendar-connections/${foreign.id}`).expect(404);
    expect(await calendarConnectionRepository.findById(testDb.db, foreign.id)).toBeDefined();
  });

  it("POST /:id/sync ohne registrierten Handler meldet kontrolliert Fehlerstatus", async () => {
    const agent = await login("admin@local");
    const conn = await makeConnection(ADMIN_ID, { provider: "google" });
    const res = await agent.post(`/api/calendar-connections/${conn.id}/sync`).expect(200);
    expect(res.body.status).toBe("error");
    expect(res.body.lastError).toContain("Kein Sync-Handler");
  });

  it("GET /calendar-connections/config meldet, ob Google serverseitig eingerichtet ist", async () => {
    const agent = await login("admin@local");
    const originalId = config.googleClientId;
    const originalSecret = config.googleClientSecret;
    config.googleClientId = "client-id";
    config.googleClientSecret = "client-secret";
    try {
      const res = await agent.get("/api/calendar-connections/config").expect(200);
      expect(res.body.googleConfigured).toBe(true);
      expect(typeof res.body.autoSyncEnabled).toBe("boolean");
    } finally {
      config.googleClientId = originalId;
      config.googleClientSecret = originalSecret;
    }
  });

  it("POST /calendar-connections/sync-all synchronisiert nur die eigenen Verbindungen", async () => {
    const agent = await login("admin@local");
    registerCalendarSyncHandler("google", async () => {});
    await makeConnection(ADMIN_ID, { provider: "google", displayName: "A" });
    await makeConnection(ADMIN_ID, { provider: "google", displayName: "B" });
    const otherUserId = await createUser("fremd@local", 2);
    const foreign = await makeConnection(otherUserId, { provider: "google", displayName: "Fremd" });

    const res = await agent.post("/api/calendar-connections/sync-all").expect(200);
    expect(res.body).toMatchObject({ processed: 2, synced: 2, failed: 0 });
    // Fremde Verbindung unberührt.
    expect((await calendarConnectionRepository.findById(testDb.db, foreign.id))?.lastSyncAt).toBeNull();
  });

  it("POST /:id/sync mit registriertem Handler synchronisiert erfolgreich (Status active)", async () => {
    const agent = await login("admin@local");
    const conn = await makeConnection(ADMIN_ID, { provider: "nextcloud" });
    const handledIds: number[] = [];
    registerCalendarSyncHandler("nextcloud", async (_db, connection) => {
      handledIds.push(connection.id);
    });

    const res = await agent.post(`/api/calendar-connections/${conn.id}/sync`).expect(200);
    expect(handledIds).toEqual([conn.id]);
    expect(res.body.status).toBe("active");
    expect(res.body.lastSyncAt).toBeTruthy();
    expect(res.body.lastError).toBeNull();
  });

  it("POST /:id/sync mit fehlschlagendem Handler spiegelt den Fehler in den Status", async () => {
    const agent = await login("admin@local");
    const conn = await makeConnection(ADMIN_ID, { provider: "nextcloud" });
    registerCalendarSyncHandler("nextcloud", async () => {
      throw new Error("CalDAV 401 Unauthorized");
    });

    const res = await agent.post(`/api/calendar-connections/${conn.id}/sync`).expect(200);
    expect(res.body.status).toBe("error");
    expect(res.body.lastError).toBe("CalDAV 401 Unauthorized");
  });

  it("POST /:id/sync mit Nicht-Error-Wurf meldet eine generische Fehlermeldung", async () => {
    const agent = await login("admin@local");
    const conn = await makeConnection(ADMIN_ID, { provider: "nextcloud" });
    registerCalendarSyncHandler("nextcloud", async () => {
      throw "kaputt";
    });
    const res = await agent.post(`/api/calendar-connections/${conn.id}/sync`).expect(200);
    expect(res.body.status).toBe("error");
    expect(res.body.lastError).toBe("Sync fehlgeschlagen");
  });

  it("Reader darf lesen, aber nicht trennen (403)", async () => {
    const readerId = await createUser("reader-cal@local", 3);
    const readerAgent = await login("reader-cal@local");
    const conn = await makeConnection(readerId, {});

    await readerAgent.get("/api/calendar-connections").expect(200);
    await readerAgent.delete(`/api/calendar-connections/${conn.id}`).expect(403);
    // Verbindung besteht weiter — der Guard greift vor dem Handler
    expect(await calendarConnectionRepository.findById(testDb.db, conn.id)).toBeDefined();
  });

  it("DELETE einer nicht existierenden Verbindung liefert 404", async () => {
    const agent = await login("admin@local");
    await agent.delete("/api/calendar-connections/999999").expect(404);
  });

  it("POST /:id/sync auf eine nicht existierende Verbindung liefert 404", async () => {
    const agent = await login("admin@local");
    await agent.post("/api/calendar-connections/999999/sync").expect(404);
  });

  it("POST /:id/sync auf eine fremde Verbindung liefert 404", async () => {
    const agent = await login("admin@local");
    const otherUserId = await createUser("fremd-sync@local", 2);
    const foreign = await makeConnection(otherUserId, { provider: "google" });
    await agent.post(`/api/calendar-connections/${foreign.id}/sync`).expect(404);
  });

  it("Anonyme Anfrage wird abgewiesen (401)", async () => {
    await supertest(app.server).get("/api/calendar-connections").expect(401);
  });
});
