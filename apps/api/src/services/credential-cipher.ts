import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

// Authenticated encryption: AES-256-GCM erkennt jede Manipulation am Chiffrat (auth tag),
// sodass entschlüsselte Zugangsdaten nur bei intaktem, mit dem richtigen Schlüssel erstellten
// Payload zurückgegeben werden. Der Schlüssel stammt ausschließlich aus der Server-Umgebung.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/** Leitet einen 32-Byte-Schlüssel aus einem beliebigen Secret-String ab (SHA-256). */
export function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export class CredentialCipher {
  private readonly key: Buffer;

  public constructor(key: Buffer) {
    if (key.length !== KEY_LENGTH) {
      throw new Error(`CredentialCipher requires a ${KEY_LENGTH}-byte key`);
    }
    this.key = key;
  }

  /** Verschlüsselt Klartext zu einem base64-Payload (iv | authTag | ciphertext). */
  public encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  /** Entschlüsselt einen base64-Payload. Wirft bei Manipulation oder falschem Schlüssel. */
  public decrypt(payload: string): string {
    const raw = Buffer.from(payload, "base64");
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid credential ciphertext");
    }
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  /** Prüft, ob ein Payload mit diesem Schlüssel entschlüsselbar (also authentisch) ist. */
  public canDecrypt(payload: string): boolean {
    try {
      this.decrypt(payload);
      return true;
    } catch {
      return false;
    }
  }
}

let cachedCipher: CredentialCipher | null = null;
let cachedKeySource: string | null = null;

/**
 * Config-basierte Singleton-Instanz. Wirft einen kontrollierten Fehler (kein Klartext-Fallback),
 * wenn CALENDAR_ENCRYPTION_KEY nicht konfiguriert ist.
 */
export function getCredentialCipher(): CredentialCipher {
  const source = config.calendarEncryptionKey;
  if (!source) {
    throw new Error("CALENDAR_ENCRYPTION_KEY is not configured — refusing to handle calendar credentials in plaintext");
  }
  if (!cachedCipher || cachedKeySource !== source) {
    cachedCipher = new CredentialCipher(deriveKey(source));
    cachedKeySource = source;
  }
  return cachedCipher;
}

/** Für Tests: erzwingt Neuaufbau der Singleton-Instanz nach einer Konfig-Änderung. */
export function resetCredentialCipherCache(): void {
  cachedCipher = null;
  cachedKeySource = null;
}

/**
 * Maskiert ein Secret für Log-/Fehlerausgaben. Gibt nie den Klartext zurück — nur eine
 * längen-erhaltende, aber inhaltslose Kennung, damit Logs auswertbar bleiben ohne zu leaken.
 */
export function redactSecret(value: string | null | undefined): string {
  if (!value) {
    return "[none]";
  }
  return `[redacted:${value.length}]`;
}

/** Konstante-Zeit-Vergleich zweier Secrets (Timing-neutral). */
export function secretsEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
