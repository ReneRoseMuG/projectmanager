/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte node:crypto-Primitive (AES-256-GCM, SHA-256). Keine DB, kein Netz.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. config wird für die config-gebundene Factory real mutiert und zurückgesetzt.
 *
 * Isolation:
 * - Reiner In-Prozess-Test; config-Cache wird pro Fall zurückgesetzt.
 *
 * Abgedeckte Regeln:
 * - encrypt→decrypt Roundtrip, zufälliger IV je Aufruf, 32-Byte-Schlüsselzwang
 * - redactSecret leakt nie Klartext; secretsEqual vergleicht korrekt
 * - getCredentialCipher liefert Cipher bei konfiguriertem Schlüssel
 *
 * Fehlerfälle:
 * - Manipulation am Chiffrat wird erkannt (auth tag)
 * - Falscher Schlüssel schlägt fehl statt Klartext zu liefern
 * - Ungültiger Payload wirft; fehlender config-Schlüssel wirft kontrolliert
 *
 * Ziel:
 * Nachweis der authentifizierten Verschlüsselung als Basis der sicheren Credential-Ablage.
 */

import { afterEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  CredentialCipher,
  deriveKey,
  getCredentialCipher,
  redactSecret,
  resetCredentialCipherCache,
  secretsEqual
} from "../../../apps/api/src/services/credential-cipher.js";

describe("CredentialCipher (AP-0.2)", () => {
  const cipher = new CredentialCipher(deriveKey("test-secret-key"));

  it("encrypt→decrypt Roundtrip stellt den Klartext wieder her", () => {
    const plaintext = JSON.stringify({ refreshToken: "1//abc.def", note: "äöü-ß" });
    const encrypted = cipher.encrypt(plaintext);
    expect(encrypted).not.toContain("refreshToken");
    expect(cipher.decrypt(encrypted)).toBe(plaintext);
  });

  it("erzeugt bei jedem Aufruf ein anderes Chiffrat (zufälliger IV)", () => {
    const a = cipher.encrypt("same");
    const b = cipher.encrypt("same");
    expect(a).not.toBe(b);
    expect(cipher.decrypt(a)).toBe("same");
    expect(cipher.decrypt(b)).toBe("same");
  });

  it("erkennt Manipulation am Chiffrat (auth tag)", () => {
    const encrypted = cipher.encrypt("secret");
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] ^= 0xff;
    const tampered = raw.toString("base64");
    expect(() => cipher.decrypt(tampered)).toThrow();
    expect(cipher.canDecrypt(tampered)).toBe(false);
  });

  it("schlägt mit falschem Schlüssel fehl (kein Klartext)", () => {
    const encrypted = cipher.encrypt("secret");
    const other = new CredentialCipher(deriveKey("different-key"));
    expect(() => other.decrypt(encrypted)).toThrow();
    expect(other.canDecrypt(encrypted)).toBe(false);
  });

  it("weist ungültige Payloads ab", () => {
    expect(() => cipher.decrypt("zz")).toThrow();
  });

  it("verlangt einen 32-Byte-Schlüssel", () => {
    expect(() => new CredentialCipher(Buffer.alloc(16))).toThrow();
  });

  it("redactSecret gibt niemals den Klartext zurück", () => {
    expect(redactSecret("supersecret")).not.toContain("supersecret");
    expect(redactSecret("supersecret")).toBe("[redacted:11]");
    expect(redactSecret(null)).toBe("[none]");
    expect(redactSecret("")).toBe("[none]");
  });

  it("secretsEqual vergleicht korrekt (Gleichheit, Ungleichheit, Längenunterschied)", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("abc", "abcd")).toBe(false);
  });

  describe("getCredentialCipher (config-gebunden)", () => {
    afterEach(() => {
      config.calendarEncryptionKey = null;
      resetCredentialCipherCache();
    });

    it("wirft kontrolliert, wenn kein Schlüssel konfiguriert ist", () => {
      config.calendarEncryptionKey = null;
      resetCredentialCipherCache();
      expect(() => getCredentialCipher()).toThrow(/CALENDAR_ENCRYPTION_KEY/);
    });

    it("liefert einen funktionsfähigen Cipher bei konfiguriertem Schlüssel", () => {
      config.calendarEncryptionKey = "configured-key";
      resetCredentialCipherCache();
      const configured = getCredentialCipher();
      const encrypted = configured.encrypt("x");
      expect(configured.decrypt(encrypted)).toBe("x");
    });
  });
});
