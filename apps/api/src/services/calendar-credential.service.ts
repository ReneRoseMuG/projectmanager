import type { DbSession } from "../db/client.js";
import { calendarConnectionRepository } from "../repositories/calendar.repository.js";
import { getCredentialCipher } from "./credential-cipher.js";

/**
 * Provider-spezifische Zugangsdaten als flaches String-Objekt, z. B.
 * Google: { refreshToken }, NextCloud: { baseUrl, username, appPassword }.
 * Sie werden ausschließlich verschlüsselt (AP-0.2) in calendar_connections.encrypted_credentials
 * abgelegt und nie im Klartext geloggt.
 */
export type CalendarCredentialData = Record<string, string>;

/**
 * Gekapselte Schnittstelle zum Speichern/Lesen/Rotieren/Löschen der Kalender-Zugangsdaten.
 * Kapselt Ver-/Entschlüsselung und die Anbindung an das Verbindungs-Repository, sodass
 * aufrufender Code niemals mit Chiffrat oder Rohschlüssel hantiert.
 */
export const calendarCredentialService = {
  /** Verschlüsselt und persistiert die Zugangsdaten an der Verbindung. */
  async store(database: DbSession, connectionId: number, credentials: CalendarCredentialData): Promise<void> {
    const ciphertext = getCredentialCipher().encrypt(JSON.stringify(credentials));
    await calendarConnectionRepository.setEncryptedCredentials(database, connectionId, ciphertext);
  },

  /** Lädt und entschlüsselt die Zugangsdaten; null, wenn keine hinterlegt sind. */
  async load(database: DbSession, connectionId: number): Promise<CalendarCredentialData | null> {
    const connection = await calendarConnectionRepository.findById(database, connectionId);
    if (!connection?.encryptedCredentials) {
      return null;
    }
    const plaintext = getCredentialCipher().decrypt(connection.encryptedCredentials);
    return JSON.parse(plaintext) as CalendarCredentialData;
  },

  /** Ersetzt die hinterlegten Zugangsdaten (z. B. nach Token-Refresh/Re-Auth). */
  async rotate(database: DbSession, connectionId: number, credentials: CalendarCredentialData): Promise<void> {
    await this.store(database, connectionId, credentials);
  },

  /** Entfernt die Zugangsdaten (z. B. beim Trennen der Verbindung). */
  async clear(database: DbSession, connectionId: number): Promise<void> {
    await calendarConnectionRepository.setEncryptedCredentials(database, connectionId, null);
  }
};
