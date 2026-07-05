/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Test-MySQL, echtes Connection-Repository, echte AES-256-GCM-Verschlüsselung.
 *
 * Mock-Entscheidung:
 * - Keine fachlichen Mocks. Für den Log-Redaktions-Nachweis werden console-Methoden per Spy
 *   beobachtet (technische Beigabe ohne Einfluss auf die geprüfte Speicher-/Krypto-Funktion).
 *   config.calendarEncryptionKey wird für die Suite real gesetzt und danach zurückgesetzt.
 *
 * Isolation:
 * - Temp-DB (createTestDb), truncateAll vor jedem Test, Admin-User id=1 aus Seed.
 *
 * Abgedeckte Regeln:
 * - store legt ausschließlich Chiffrat in der DB ab (kein Klartext-Muster auffindbar)
 * - load stellt Klartext wieder her; rotate ersetzt; clear entfernt (kein verwaistes Chiffrat)
 *
 * Fehlerfälle:
 * - load ohne hinterlegte Credentials liefert null
 * - Klartext-Secret erscheint nicht in Log-Ausgaben (Canary)
 *
 * Ziel:
 * Nachweis, dass Kalender-Zugangsdaten nur verschlüsselt persistiert und nie geleakt werden.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { calendarConnectionRepository } from "../../../apps/api/src/repositories/calendar.repository.js";
import { calendarCredentialService } from "../../../apps/api/src/services/calendar-credential.service.js";
import { resetCredentialCipherCache } from "../../../apps/api/src/services/credential-cipher.js";
import { createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Calendar Credential Service (AP-0.2)", () => {
  let testDb: TestDb;
  let originalKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalKey = config.calendarEncryptionKey;
    config.calendarEncryptionKey = "integration-test-encryption-key";
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

  async function makeConnection(): Promise<number> {
    const conn = await calendarConnectionRepository.create(testDb.db, { userId: 1, provider: "nextcloud", displayName: "C" }, 1);
    return conn.id;
  }

  async function readRawCredentials(connectionId: number): Promise<string | null> {
    const [rows] = await testDb.pool.query("SELECT encrypted_credentials FROM calendar_connections WHERE id = ?", [connectionId]);
    return (rows as Array<{ encrypted_credentials: string | null }>)[0].encrypted_credentials;
  }

  it("store legt in der DB nur Chiffrat ab (kein Klartext)", async () => {
    const connectionId = await makeConnection();
    const secret = { baseUrl: "https://cloud.example", username: "rene", appPassword: "SUPER-SECRET-APP-PW" };
    await calendarCredentialService.store(testDb.db, connectionId, secret);

    const stored = await readRawCredentials(connectionId);
    expect(stored).toBeTruthy();
    expect(stored).not.toContain("SUPER-SECRET-APP-PW");
    expect(stored).not.toContain("rene");
    expect(stored).not.toContain("cloud.example");
  });

  it("load stellt die Klartext-Zugangsdaten wieder her", async () => {
    const connectionId = await makeConnection();
    const secret = { refreshToken: "1//refresh.token.value" };
    await calendarCredentialService.store(testDb.db, connectionId, secret);
    expect(await calendarCredentialService.load(testDb.db, connectionId)).toEqual(secret);
  });

  it("load liefert null ohne hinterlegte Credentials", async () => {
    const connectionId = await makeConnection();
    expect(await calendarCredentialService.load(testDb.db, connectionId)).toBeNull();
  });

  it("rotate ersetzt die Zugangsdaten", async () => {
    const connectionId = await makeConnection();
    await calendarCredentialService.store(testDb.db, connectionId, { refreshToken: "old" });
    await calendarCredentialService.rotate(testDb.db, connectionId, { refreshToken: "new" });
    expect(await calendarCredentialService.load(testDb.db, connectionId)).toEqual({ refreshToken: "new" });
  });

  it("clear entfernt die Zugangsdaten (kein verwaistes Chiffrat)", async () => {
    const connectionId = await makeConnection();
    await calendarCredentialService.store(testDb.db, connectionId, { refreshToken: "x" });
    await calendarCredentialService.clear(testDb.db, connectionId);
    expect(await calendarCredentialService.load(testDb.db, connectionId)).toBeNull();
    expect(await readRawCredentials(connectionId)).toBeNull();
  });

  it("store/load geben das Klartext-Secret nicht in Logs aus", async () => {
    const connectionId = await makeConnection();
    const secret = { appPassword: "LOG-LEAK-CANARY-PW" };
    const logs: string[] = [];
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map((arg) => String(arg)).join(" "));
      })
    );
    try {
      await calendarCredentialService.store(testDb.db, connectionId, secret);
      await calendarCredentialService.load(testDb.db, connectionId);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    expect(logs.join("\n")).not.toContain("LOG-LEAK-CANARY-PW");
  });
});
