/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Connection-Repository, echte AES-256-GCM-Verschlüsselung, echte
 *   HMAC-State-Signatur. Der Google-Token-Endpunkt wird über den injizierten fetch ersetzt.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks; nur der Netzwerk-Fetcher zum Google-Token-Endpunkt wird injiziert.
 *   config.google* und calendarEncryptionKey werden für die Suite gesetzt und zurückgesetzt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Auth-URL trägt offline access + consent + Scope + signierten State
 * - Callback tauscht Code, legt Verbindung an, speichert Refresh-Token verschlüsselt (kein Klartext)
 * - Abgelaufenes Access-Token wird per Refresh erneuert
 *
 * Fehlerfälle:
 * - Gefälschter/ungültiger State wird abgewiesen (CSRF); invalid_grant setzt reauth_required
 *
 * Ziel:
 * Absicherung des Google-OAuth-Flows inkl. sicherer Token-Persistenz.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { buildGoogleAuthUrl, ensureGoogleAccessToken, GoogleAuthError, handleGoogleCallback, verifyState, type GoogleTokenFetch } from "../../../apps/api/src/services/google/google-oauth.service.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

function tokenFetch(status: number, body: Record<string, unknown>): GoogleTokenFetch {
  return async () => ({ status, json: async () => body });
}

function extractState(url: string): string {
  const state = new URL(url).searchParams.get("state");
  if (!state) {
    throw new Error("no state");
  }
  return state;
}

describe("Google OAuth (AP-2.1)", () => {
  let testDb: TestDb;
  let original: { key: string | null; clientId: string | null; clientSecret: string | null };

  beforeAll(async () => {
    testDb = await createTestDb();
    original = { key: config.calendarEncryptionKey, clientId: config.googleClientId, clientSecret: config.googleClientSecret };
    config.calendarEncryptionKey = "google-oauth-test-key";
    config.googleClientId = "test-client-id";
    config.googleClientSecret = "test-client-secret";
    resetCredentialCipherCache();
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.calendarEncryptionKey = original.key;
    config.googleClientId = original.clientId;
    config.googleClientSecret = original.clientSecret;
    resetCredentialCipherCache();
    await testDb?.close();
  });

  it("buildGoogleAuthUrl trägt offline access, consent, Scope und einen gültigen State", () => {
    const url = buildGoogleAuthUrl(1);
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(url).toContain("calendar");
    expect(verifyState(extractState(url))).toBe(1);
  });

  it("weist einen gefälschten State ab (CSRF)", () => {
    expect(() => verifyState("gefaelscht.signatur")).toThrow(GoogleAuthError);
  });

  it("Callback tauscht Code, legt Verbindung an und speichert das Refresh-Token verschlüsselt", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    const connection = await handleGoogleCallback(testDb.db, "auth-code-1", state, tokenFetch(200, { access_token: "at-1", refresh_token: "rt-secret-1", expires_in: 3600 }));

    expect(connection.provider).toBe("google");
    expect(connection).not.toHaveProperty("encryptedCredentials");

    const [rows] = await testDb.pool.query("SELECT encrypted_credentials FROM calendar_connections WHERE id = ?", [connection.id]);
    const cipher = (rows as Array<{ encrypted_credentials: string | null }>)[0].encrypted_credentials;
    expect(cipher).toBeTruthy();
    expect(cipher).not.toContain("rt-secret-1");

    const credentials = await calendarCredentialService.load(testDb.db, connection.id);
    expect(credentials?.refreshToken).toBe("rt-secret-1");
  });

  it("lehnt den Callback bei ungültigem State ab, ohne eine Verbindung anzulegen", async () => {
    await expect(handleGoogleCallback(testDb.db, "code", "ungueltig", tokenFetch(200, { access_token: "a", refresh_token: "b", expires_in: 3600 }))).rejects.toBeInstanceOf(GoogleAuthError);
    expect(await calendarConnectionRepository.listByUser(testDb.db, 1)).toHaveLength(0);
  });

  it("erneuert ein abgelaufenes Access-Token per Refresh", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    await handleGoogleCallback(testDb.db, "c", state, tokenFetch(200, { access_token: "old", refresh_token: "rt", expires_in: -10 }));
    const connection = (await calendarConnectionRepository.listByUser(testDb.db, 1))[0];

    const token = await ensureGoogleAccessToken(testDb.db, connection.id, tokenFetch(200, { access_token: "new-token", expires_in: 3600 }));
    expect(token).toBe("new-token");
  });

  it("setzt bei invalid_grant den Status auf reauth_required und meldet den Fehler", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    await handleGoogleCallback(testDb.db, "c", state, tokenFetch(200, { access_token: "old", refresh_token: "rt", expires_in: -10 }));
    const connection = (await calendarConnectionRepository.listByUser(testDb.db, 1))[0];

    await expect(ensureGoogleAccessToken(testDb.db, connection.id, tokenFetch(400, { error: "invalid_grant" }))).rejects.toMatchObject({ reason: "invalid_grant" });

    const updated = await calendarConnectionRepository.findById(testDb.db, connection.id);
    expect(updated?.status).toBe("reauth_required");
  });

  it("gibt ein noch gültiges Access-Token ohne Refresh zurück", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    await handleGoogleCallback(testDb.db, "c", state, tokenFetch(200, { access_token: "still-valid", refresh_token: "rt", expires_in: 3600 }));
    const connection = (await calendarConnectionRepository.listByUser(testDb.db, 1))[0];
    let called = false;
    const failingFetch: GoogleTokenFetch = async () => {
      called = true;
      return { status: 500, json: async () => ({}) };
    };
    expect(await ensureGoogleAccessToken(testDb.db, connection.id, failingFetch)).toBe("still-valid");
    expect(called).toBe(false);
  });

  it("meldet einen fehlgeschlagenen Code-Tausch als Fehler", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    await expect(handleGoogleCallback(testDb.db, "bad", state, tokenFetch(400, { error: "invalid_request" }))).rejects.toMatchObject({ reason: "exchange" });
    expect(await calendarConnectionRepository.listByUser(testDb.db, 1)).toHaveLength(0);
  });

  it("meldet einen fehlgeschlagenen Refresh (nicht invalid_grant) als Fehler", async () => {
    const state = extractState(buildGoogleAuthUrl(1));
    await handleGoogleCallback(testDb.db, "c", state, tokenFetch(200, { access_token: "old", refresh_token: "rt", expires_in: -10 }));
    const connection = (await calendarConnectionRepository.listByUser(testDb.db, 1))[0];
    await expect(ensureGoogleAccessToken(testDb.db, connection.id, tokenFetch(500, { error: "server_error" }))).rejects.toMatchObject({ reason: "exchange" });
  });

  it("verlangt konfigurierte Client-Credentials", () => {
    const previous = config.googleClientId;
    config.googleClientId = null;
    try {
      expect(() => buildGoogleAuthUrl(1)).toThrow(GoogleAuthError);
    } finally {
      config.googleClientId = previous;
    }
  });
});
