/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echter Settings-Speicher (settings_values), echte AES-256-GCM-Verschlüsselung,
 *   echte Fastify-App mit globalem Auth-Guard und echten Sessions. Keine Mocks.
 *   config.* (Encryption-Key + Google-/Sync-Fallbackwerte) werden je Test deterministisch gesetzt.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. config wird bewusst gesetzt/zurückgesetzt, um die Vorrangkette DB → .env → Default
 *   deterministisch und unabhängig von der realen apps/api/.env zu prüfen.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll (inkl. settings_values) vor jedem Test; Scheduler nach jedem Test gestoppt.
 *
 * Abgedeckte Regeln:
 * - Client-Secret wird verschlüsselt abgelegt und nie im Klartext ausgeliefert (Service + HTTP + View)
 * - Wirksame Konfiguration: DB-Wert hat Vorrang, sonst .env, sonst Default
 * - Auth-Guard: settings:read für Lesen, settings:admin für Schreiben
 * - Optimistic Locking: veraltete expectedVersion → Konflikt (Service: Fehler, HTTP: 409)
 * - Scheduler-Nachführung: Aktivieren startet, Deaktivieren stoppt den periodischen Abgleich
 *
 * Fehlerfälle:
 * - Kein Login → 401; Reader ohne settings:admin → 403; Nicht-Admin im Service → FORBIDDEN; Versionskonflikt
 *
 * Ziel:
 * Absicherung der zentralen, DB-gestützten Kalender-Sync-Konfiguration inkl. sicherer Secret-Ablage,
 * Vorrangkette, Berechtigungsgrenzen und Scheduler-Steuerung.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { UpdateCalendarSyncConfigRequest } from "@taskmanager/shared-types";
import { config } from "../../../apps/api/src/config.js";
import { VersionConflictError } from "../../../apps/api/src/repositories/base.repository.js";
import { settingsRepository } from "../../../apps/api/src/repositories/settings.repository.js";
import {
  CALENDAR_SYNC_CONFIG_KEY,
  CALENDAR_SYNC_CONFIG_SCOPE_ID,
  CALENDAR_SYNC_CONFIG_SCOPE_TYPE,
  getCalendarSyncConfigView,
  getEffectiveCalendarConfig,
  updateCalendarSyncConfig
} from "../../../apps/api/src/services/calendar-config.service.js";
import { isCalendarSyncSchedulerRunning, stopCalendarSyncScheduler } from "../../../apps/api/src/services/calendar-scheduler.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { getCurrentUser } from "../../../apps/api/src/services/auth.service.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const PASSWORD = "password123";
// Derselbe bcrypt-Hash wie der Seed-Admin (Klartext "password123") — für einen zweiten Test-User wiederverwendet.
const PASSWORD_HASH = "$2b$12$6i0aEyMqgUs3z.zKCqvpQexCgDxZk17O0lNs8ChHO4Iy87/pDp40q";
const REDIRECT = "http://localhost:3001/api/calendar-connections/google/callback";

function syncConfigInput(overrides: Partial<UpdateCalendarSyncConfigRequest> = {}): UpdateCalendarSyncConfigRequest {
  return {
    googleClientId: "client-123",
    googleRedirectUri: REDIRECT,
    syncEnabled: false,
    syncIntervalMs: 900_000,
    googlePushWebhookUrl: "",
    expectedVersion: 0,
    ...overrides
  };
}

async function createReader(pool: TestDb["pool"], email: string): Promise<number> {
  const [result] = await pool.execute(
    "INSERT INTO users (name, full_name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES ('', 'Leser, Test', 'Test', 'Leser', ?, ?, 3, 1, 1, NOW(), NOW())",
    [email, PASSWORD_HASH]
  );
  return (result as { insertId: number }).insertId;
}

async function login(app: FastifyInstance, email: string) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return agent;
}

describe("Kalender-Sync-Konfiguration (MS-79)", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let original: Record<string, unknown>;

  function applyBaseConfig(): void {
    config.calendarEncryptionKey = "calendar-config-test-key";
    config.googleClientId = null;
    config.googleClientSecret = null;
    config.googleRedirectUri = REDIRECT;
    config.calendarSyncEnabled = false;
    config.calendarSyncIntervalMs = 900_000;
    config.googlePushWebhookUrl = null;
    resetCredentialCipherCache();
  }

  beforeAll(async () => {
    testDb = await createTestDb();
    original = {
      key: config.calendarEncryptionKey,
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      redirectUri: config.googleRedirectUri,
      enabled: config.calendarSyncEnabled,
      interval: config.calendarSyncIntervalMs,
      webhook: config.googlePushWebhookUrl
    };
    applyBaseConfig();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    applyBaseConfig();
  });

  afterEach(() => {
    stopCalendarSyncScheduler();
  });

  afterAll(async () => {
    config.calendarEncryptionKey = original.key as string | null;
    config.googleClientId = original.clientId as string | null;
    config.googleClientSecret = original.clientSecret as string | null;
    config.googleRedirectUri = original.redirectUri as string;
    config.calendarSyncEnabled = original.enabled as boolean;
    config.calendarSyncIntervalMs = original.interval as number;
    config.googlePushWebhookUrl = original.webhook as string | null;
    resetCredentialCipherCache();
    await app?.close();
    await testDb?.close();
  });

  describe("Service: Persistenz, Secret, Vorrangkette", () => {
    it("legt das Client-Secret verschlüsselt ab und liefert es nie im Klartext", async () => {
      const admin = await getCurrentUser(testDb.db, 1);
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ googleClientSecret: "top-secret-xyz" }));

      const record = await settingsRepository.findByScope(testDb.db, CALENDAR_SYNC_CONFIG_KEY, CALENDAR_SYNC_CONFIG_SCOPE_TYPE, CALENDAR_SYNC_CONFIG_SCOPE_ID);
      expect(record).toBeDefined();
      expect(record?.valueJson).not.toContain("top-secret-xyz");

      // Serverintern ist der Klartext über die Entschlüsselung wieder verfügbar …
      const effective = await getEffectiveCalendarConfig(testDb.db);
      expect(effective.googleClientSecret).toBe("top-secret-xyz");

      // … die maskierte View meldet nur "gesetzt" und enthält den Klartext nirgends.
      const view = await getCalendarSyncConfigView(testDb.db);
      expect(view.googleClientSecretSet).toBe(true);
      expect(JSON.stringify(view)).not.toContain("top-secret-xyz");
    });

    it("behält ein hinterlegtes Secret bei leerem Feld und entfernt es bei \"\"", async () => {
      const admin = await getCurrentUser(testDb.db, 1);
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ googleClientSecret: "keep-me" }));

      // Ohne Secret-Feld (undefined) bleibt es erhalten.
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ googleClientId: "client-2", expectedVersion: 1 }));
      expect((await getEffectiveCalendarConfig(testDb.db)).googleClientSecret).toBe("keep-me");

      // Leerer String entfernt es.
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ googleClientId: "client-2", googleClientSecret: "", expectedVersion: 2 }));
      expect((await getEffectiveCalendarConfig(testDb.db)).googleClientSecret).toBeNull();
      expect((await getCalendarSyncConfigView(testDb.db)).googleClientSecretSet).toBe(false);
    });

    it("gibt DB-Werten Vorrang vor der .env", async () => {
      config.googleClientId = "env-client";
      const admin = await getCurrentUser(testDb.db, 1);
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ googleClientId: "db-client" }));

      expect((await getEffectiveCalendarConfig(testDb.db)).googleClientId).toBe("db-client");
    });

    it("fällt ohne DB-Zeile auf die .env zurück und meldet usingEnvFallback", async () => {
      config.googleClientId = "env-client";

      const effective = await getEffectiveCalendarConfig(testDb.db);
      expect(effective.googleClientId).toBe("env-client");

      const view = await getCalendarSyncConfigView(testDb.db);
      expect(view.usingEnvFallback).toBe(true);
      expect(view.googleClientId).toBe("env-client");
    });

    it("nutzt Defaults ohne DB und ohne .env", async () => {
      const effective = await getEffectiveCalendarConfig(testDb.db);
      expect(effective.googleClientId).toBeNull();
      expect(effective.syncEnabled).toBe(false);
      expect(effective.syncIntervalMs).toBe(900_000);
    });

    it("lehnt Nicht-Administratoren serverseitig ab", async () => {
      const readerId = await createReader(testDb.pool, "reader-service@calendar.test");
      const reader = await getCurrentUser(testDb.db, readerId);
      await expect(updateCalendarSyncConfig(testDb.db, reader, syncConfigInput())).rejects.toMatchObject({ statusCode: 403 });
    });

    it("erzwingt Optimistic Locking bei veralteter expectedVersion", async () => {
      const admin = await getCurrentUser(testDb.db, 1);
      await updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ expectedVersion: 0 }));

      await expect(updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ expectedVersion: 0 }))).rejects.toBeInstanceOf(VersionConflictError);
      // Mit aktueller Version klappt es.
      await expect(updateCalendarSyncConfig(testDb.db, admin, syncConfigInput({ expectedVersion: 1 }))).resolves.toMatchObject({ version: 2 });
    });
  });

  describe("HTTP-Route /calendar-settings: Guard, Maskierung, Scheduler", () => {
    it("weist Zugriff ohne Session ab (401)", async () => {
      await supertest(app.server).get("/api/calendar-settings").expect(401);
      await supertest(app.server).put("/api/calendar-settings").send(syncConfigInput()).expect(401);
    });

    it("liefert dem Admin die maskierte Konfiguration (200)", async () => {
      const agent = await login(app, "admin@local");
      const res = await agent.get("/api/calendar-settings").expect(200);
      expect(res.body).toMatchObject({ googleClientSecretSet: false, usingEnvFallback: true, version: 0 });
    });

    it("verweigert Readern das Schreiben (403), erlaubt aber Lesen", async () => {
      await createReader(testDb.pool, "reader-http@calendar.test");
      const agent = await login(app, "reader-http@calendar.test");
      await agent.get("/api/calendar-settings").expect(200);
      await agent.put("/api/calendar-settings").send(syncConfigInput()).expect(403);
    });

    it("speichert als Admin und maskiert das Secret in der Antwort", async () => {
      const agent = await login(app, "admin@local");
      const res = await agent.put("/api/calendar-settings").send(syncConfigInput({ googleClientSecret: "secret-http-123" })).expect(200);
      expect(res.body.googleClientSecretSet).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain("secret-http-123");

      const after = await agent.get("/api/calendar-settings").expect(200);
      expect(after.body.googleClientSecretSet).toBe(true);
      expect(after.body.usingEnvFallback).toBe(false);
      expect(JSON.stringify(after.body)).not.toContain("secret-http-123");
    });

    it("meldet Versionskonflikte als 409", async () => {
      const agent = await login(app, "admin@local");
      await agent.put("/api/calendar-settings").send(syncConfigInput({ expectedVersion: 0 })).expect(200);
      await agent.put("/api/calendar-settings").send(syncConfigInput({ expectedVersion: 0 })).expect(409);
    });

    it("weist ein zu kleines Intervall als 400 ab", async () => {
      const agent = await login(app, "admin@local");
      await agent.put("/api/calendar-settings").send(syncConfigInput({ syncIntervalMs: 1000 })).expect(400);
    });

    it("startet den Scheduler beim Aktivieren und stoppt ihn beim Deaktivieren", async () => {
      const agent = await login(app, "admin@local");
      expect(isCalendarSyncSchedulerRunning()).toBe(false);

      await agent.put("/api/calendar-settings").send(syncConfigInput({ syncEnabled: true, expectedVersion: 0 })).expect(200);
      expect(isCalendarSyncSchedulerRunning()).toBe(true);

      await agent.put("/api/calendar-settings").send(syncConfigInput({ syncEnabled: false, expectedVersion: 1 })).expect(200);
      expect(isCalendarSyncSchedulerRunning()).toBe(false);
    });
  });
});
