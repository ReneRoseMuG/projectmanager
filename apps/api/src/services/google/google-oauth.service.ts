import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CalendarConnection } from "@taskmanager/shared-types";
import { config } from "../../config.js";
import type { DbClient, DbSession } from "../../db/client.js";
import { calendarConnectionRepository } from "../../repositories/calendar.repository.js";
import { calendarCredentialService } from "../calendar-credential.service.js";
import { mapCalendarConnection } from "../calendar-connection.service.js";

/**
 * Google OAuth 2.0 Authorization Code Flow (AP-2.1), serverseitig. Refresh-Token liegen
 * verschlüsselt (AP-0.2). Der CSRF-State ist HMAC-signiert (zustandslos, zeitlich begrenzt).
 * Der Token-Endpunkt ist injizierbar, damit Tests ohne echtes Google laufen.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const STATE_TTL_MS = 10 * 60 * 1000;

export type GoogleAuthErrorReason = "config" | "state" | "invalid_grant" | "exchange";

export class GoogleAuthError extends Error {
  public constructor(
    public readonly reason: GoogleAuthErrorReason,
    message: string
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

export interface GoogleTokenResponse {
  status: number;
  json(): Promise<Record<string, unknown>>;
}

export type GoogleTokenFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<GoogleTokenResponse>;

export const defaultGoogleFetch: GoogleTokenFetch = async (url, init) => {
  const response = await fetch(url, init);
  return { status: response.status, json: () => response.json() as Promise<Record<string, unknown>> };
};

function requireClientCredentials(): { clientId: string; clientSecret: string } {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new GoogleAuthError("config", "Google ist nicht konfiguriert (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET fehlen).");
  }
  return { clientId: config.googleClientId, clientSecret: config.googleClientSecret };
}

// -------------------------------------------------------------------------
// CSRF-State
// -------------------------------------------------------------------------
function signState(userId: number): string {
  const payload = `${userId}.${randomBytes(9).toString("hex")}.${Date.now()}`;
  const signature = createHmac("sha256", config.sessionSecret).update(payload).digest();
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature.toString("base64url")}`;
}

export function verifyState(state: string): number {
  const [payloadB64, signatureB64] = state.split(".");
  if (!payloadB64 || !signatureB64) {
    throw new GoogleAuthError("state", "Ungültiger State-Parameter.");
  }
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const expected = createHmac("sha256", config.sessionSecret).update(payload).digest();
  const actual = Buffer.from(signatureB64, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new GoogleAuthError("state", "State-Signatur stimmt nicht (möglicher CSRF-Versuch).");
  }
  const [userIdRaw, , timestampRaw] = payload.split(".");
  const userId = Number(userIdRaw);
  if (!Number.isInteger(userId) || Date.now() - Number(timestampRaw) > STATE_TTL_MS) {
    throw new GoogleAuthError("state", "State ist abgelaufen oder ungültig.");
  }
  return userId;
}

/** Baut die Google-Zustimmungs-URL (offline access + consent, damit ein Refresh-Token kommt). */
export function buildGoogleAuthUrl(userId: number): string {
  const { clientId } = requireClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: config.googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(userId)
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function exchangeCode(code: string, fetchImpl: GoogleTokenFetch): Promise<GoogleTokens> {
  const { clientId, clientSecret } = requireClientCredentials();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: "authorization_code"
  }).toString();
  const response = await fetchImpl(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (response.status !== 200 || typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
    throw new GoogleAuthError("exchange", `Google-Token-Tausch fehlgeschlagen: ${String(data.error ?? response.status)}`);
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
}

async function refresh(refreshToken: string, fetchImpl: GoogleTokenFetch): Promise<{ accessToken: string; expiresAt: number }> {
  const { clientId, clientSecret } = requireClientCredentials();
  const body = new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token" }).toString();
  const response = await fetchImpl(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (data.error === "invalid_grant") {
    throw new GoogleAuthError("invalid_grant", "Das Google-Refresh-Token wurde widerrufen — erneute Anmeldung nötig.");
  }
  if (response.status !== 200 || typeof data.access_token !== "string") {
    throw new GoogleAuthError("exchange", `Google-Token-Refresh fehlgeschlagen: ${String(data.error ?? response.status)}`);
  }
  return { accessToken: data.access_token, expiresAt: Date.now() + Number(data.expires_in ?? 3600) * 1000 };
}

/** Callback nach der Google-Zustimmung: State prüfen, Code eintauschen, Verbindung + verschlüsselte Tokens anlegen. */
export async function handleGoogleCallback(database: DbClient, code: string, state: string, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<CalendarConnection> {
  const userId = verifyState(state);
  const tokens = await exchangeCode(code, fetchImpl);
  const connection = await database.transaction(async (tx) => {
    const txDb = tx as unknown as DbSession;
    const created = await calendarConnectionRepository.create(txDb, { userId, provider: "google", displayName: "Google Kalender", status: "active" }, userId);
    await calendarCredentialService.store(txDb, created.id, {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: String(tokens.expiresAt)
    });
    return created;
  });
  return mapCalendarConnection(connection);
}

/**
 * Liefert ein gültiges Access-Token für eine Google-Verbindung; erneuert es bei Bedarf über das
 * Refresh-Token. Bei widerrufenem Token (invalid_grant) wird die Verbindung auf "reauth_required"
 * gesetzt und der Fehler weitergereicht.
 */
export async function ensureGoogleAccessToken(database: DbClient, connectionId: number, fetchImpl: GoogleTokenFetch = defaultGoogleFetch): Promise<string> {
  const credentials = await calendarCredentialService.load(database, connectionId);
  if (!credentials?.refreshToken) {
    throw new GoogleAuthError("config", "Für diese Google-Verbindung sind keine Zugangsdaten hinterlegt.");
  }
  const expiresAt = Number(credentials.expiresAt ?? 0);
  if (credentials.accessToken && expiresAt > Date.now() + 60_000) {
    return credentials.accessToken;
  }
  try {
    const refreshed = await refresh(credentials.refreshToken, fetchImpl);
    await calendarCredentialService.store(database, connectionId, { ...credentials, accessToken: refreshed.accessToken, expiresAt: String(refreshed.expiresAt) });
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof GoogleAuthError && error.reason === "invalid_grant") {
      await calendarConnectionRepository.recordSyncResult(database, connectionId, { status: "reauth_required", lastError: "Google-Autorisierung abgelaufen — bitte neu anmelden." });
    }
    throw error;
  }
}
