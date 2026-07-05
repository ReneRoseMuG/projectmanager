import { XMLParser } from "fast-xml-parser";

/**
 * Schlanker CalDAV-Client (RFC 4791) für NextCloud. Bewusst mit injizierbarem `fetch`, damit
 * Tests gegen aufgezeichnete/gemockte CalDAV-Antworten laufen können, ohne echte Instanz.
 * Nur HTTPS + Basic Auth (App-Passwort, 2FA-tauglich).
 */

export interface NextCloudCredentials {
  baseUrl: string;
  username: string;
  appPassword: string;
}

export interface DiscoveredCalendar {
  /** CalDAV-href des Kalenders — dient als stabile externe ID. */
  href: string;
  displayName: string | null;
  color: string | null;
}

export type CalDavErrorKind = "protocol" | "auth" | "not_found" | "network" | "timeout" | "parse";

export class CalDavError extends Error {
  public constructor(
    public readonly kind: CalDavErrorKind,
    message: string
  ) {
    super(message);
    this.name = "CalDavError";
  }
}

export interface CalDavResponse {
  status: number;
  text(): Promise<string>;
}

export type CalDavFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }
) => Promise<CalDavResponse>;

const defaultFetch: CalDavFetch = async (url, init) => {
  const response = await fetch(url, init);
  return { status: response.status, text: () => response.text() };
};

const PROPFIND_BODY =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">' +
  "<d:prop><d:displayname/><d:resourcetype/><ic:calendar-color/></d:prop></d:propfind>";

function normalizeBaseUrl(baseUrl: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new CalDavError("protocol", "Die NextCloud-URL ist ungültig.");
  }
  if (url.protocol !== "https:") {
    throw new CalDavError("protocol", "Nur HTTPS-Verbindungen sind erlaubt.");
  }
  return url;
}

function calendarHome(baseUrl: string, username: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/remote.php/dav/calendars/${encodeURIComponent(username)}/`;
}

function basicAuthHeader(username: string, appPassword: string): string {
  return "Basic " + Buffer.from(`${username}:${appPassword}`, "utf8").toString("base64");
}

async function fetchWithTimeout(fetchImpl: CalDavFetch, url: string, init: Parameters<CalDavFetch>[1], timeoutMs: number): Promise<CalDavResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new CalDavError("timeout", "Zeitüberschreitung bei der Verbindung zu NextCloud.");
    }
    throw new CalDavError("network", `NextCloud ist nicht erreichbar: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
  } finally {
    clearTimeout(timer);
  }
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function coerceText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

/** Parst eine CalDAV-`multistatus`-Antwort und liefert nur echte Kalender (resourcetype enthält calendar). */
export function parseCalendarsFromMultistatus(xml: string): DiscoveredCalendar[] {
  const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, trimValues: true });
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new CalDavError("parse", "Die CalDAV-Antwort konnte nicht gelesen werden.");
  }
  const multistatus = (parsed.multistatus ?? {}) as Record<string, unknown>;
  const responses = toArray(multistatus.response as unknown);
  const calendars: DiscoveredCalendar[] = [];

  for (const response of responses) {
    const entry = response as Record<string, unknown>;
    const href = coerceText(entry.href);
    if (!href) {
      continue;
    }
    for (const propstat of toArray(entry.propstat as unknown)) {
      const prop = (propstat as Record<string, unknown>).prop as Record<string, unknown> | undefined;
      const resourcetype = prop?.resourcetype as Record<string, unknown> | undefined;
      const isCalendar = resourcetype !== undefined && resourcetype !== null && Object.prototype.hasOwnProperty.call(resourcetype, "calendar");
      if (!isCalendar) {
        continue;
      }
      calendars.push({
        href,
        displayName: coerceText(prop?.displayname),
        color: coerceText(prop?.["calendar-color"])
      });
    }
  }
  return calendars;
}

/**
 * Verbindungstest + Kalender-Discovery in einem Schritt. Wirft eine CalDavError mit klar
 * unterscheidbarer `kind` (auth vs. network/timeout/not_found/protocol/parse).
 */
export async function discoverCalendars(credentials: NextCloudCredentials, fetchImpl: CalDavFetch = defaultFetch, timeoutMs = 15000): Promise<DiscoveredCalendar[]> {
  normalizeBaseUrl(credentials.baseUrl);
  const endpoint = calendarHome(credentials.baseUrl, credentials.username);
  const response = await fetchWithTimeout(
    fetchImpl,
    endpoint,
    {
      method: "PROPFIND",
      headers: {
        Authorization: basicAuthHeader(credentials.username, credentials.appPassword),
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8"
      },
      body: PROPFIND_BODY
    },
    timeoutMs
  );

  if (response.status === 401 || response.status === 403) {
    throw new CalDavError("auth", "Anmeldung bei NextCloud fehlgeschlagen — Benutzername oder App-Passwort ist falsch.");
  }
  if (response.status === 404) {
    throw new CalDavError("not_found", "CalDAV-Endpunkt nicht gefunden — prüfe die NextCloud-URL.");
  }
  if (response.status < 200 || response.status >= 300) {
    throw new CalDavError("network", `NextCloud antwortete mit HTTP ${response.status}.`);
  }

  return parseCalendarsFromMultistatus(await response.text());
}

export interface RawCalendarEvent {
  /** href des einzelnen VEVENT-Objekts (nicht des Kalenders). */
  href: string;
  etag: string | null;
  ics: string;
}

const CALENDAR_QUERY_BODY =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
  "<d:prop><d:getetag/><c:calendar-data/></d:prop>" +
  '<c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter>' +
  "</c:calendar-query>";

function assertResponseOk(status: number): void {
  if (status === 401 || status === 403) {
    throw new CalDavError("auth", "Anmeldung bei NextCloud fehlgeschlagen.");
  }
  if (status === 404) {
    throw new CalDavError("not_found", "Kalender nicht gefunden.");
  }
  if (status < 200 || status >= 300) {
    throw new CalDavError("network", `NextCloud antwortete mit HTTP ${status}.`);
  }
}

/** Parst eine calendar-query-`multistatus`-Antwort in rohe VEVENT-Objekte (href, etag, iCal-Daten). */
export function parseEventsFromMultistatus(xml: string): RawCalendarEvent[] {
  const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, trimValues: true });
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new CalDavError("parse", "Die CalDAV-Antwort konnte nicht gelesen werden.");
  }
  const multistatus = (parsed.multistatus ?? {}) as Record<string, unknown>;
  const events: RawCalendarEvent[] = [];
  for (const response of toArray(multistatus.response as unknown)) {
    const entry = response as Record<string, unknown>;
    const href = coerceText(entry.href);
    if (!href) {
      continue;
    }
    for (const propstat of toArray(entry.propstat as unknown)) {
      const prop = (propstat as Record<string, unknown>).prop as Record<string, unknown> | undefined;
      const ics = coerceText(prop?.["calendar-data"]);
      if (ics) {
        events.push({ href, etag: coerceText(prop?.getetag), ics });
      }
    }
  }
  return events;
}

/** Ruft alle VEVENTs eines Kalenders per calendar-query REPORT ab. */
export async function fetchCalendarEvents(
  credentials: NextCloudCredentials,
  calendarHref: string,
  fetchImpl: CalDavFetch = defaultFetch,
  timeoutMs = 30000
): Promise<RawCalendarEvent[]> {
  const url = new URL(calendarHref, normalizeBaseUrl(credentials.baseUrl)).toString();
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: "REPORT",
      headers: {
        Authorization: basicAuthHeader(credentials.username, credentials.appPassword),
        Depth: "1",
        "Content-Type": "application/xml; charset=utf-8"
      },
      body: CALENDAR_QUERY_BODY
    },
    timeoutMs
  );
  assertResponseOk(response.status);
  return parseEventsFromMultistatus(await response.text());
}

export interface SyncChange {
  href: string;
  etag: string | null;
  /** true, wenn das Objekt serverseitig gelöscht wurde (Status 404/410 im sync-report). */
  deleted: boolean;
}

export interface SyncCollectionResult {
  changes: SyncChange[];
  syncToken: string | null;
  /** true, wenn der übergebene sync-token ungültig war und ein Full-Resync nötig ist. */
  invalidToken: boolean;
}

/** Delta-Abgleich per sync-collection REPORT (RFC 6578). Leerer Token = Initialabgleich. */
export async function syncCollection(
  credentials: NextCloudCredentials,
  calendarHref: string,
  syncToken: string | null,
  fetchImpl: CalDavFetch = defaultFetch,
  timeoutMs = 30000
): Promise<SyncCollectionResult> {
  const url = new URL(calendarHref, normalizeBaseUrl(credentials.baseUrl)).toString();
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<d:sync-collection xmlns:d="DAV:">' +
    `<d:sync-token>${syncToken ?? ""}</d:sync-token>` +
    "<d:sync-level>1</d:sync-level>" +
    "<d:prop><d:getetag/></d:prop></d:sync-collection>";
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    { method: "REPORT", headers: { Authorization: basicAuthHeader(credentials.username, credentials.appPassword), Depth: "1", "Content-Type": "application/xml; charset=utf-8" }, body },
    timeoutMs
  );
  const text = await response.text();
  if (text.includes("valid-sync-token") || response.status === 409) {
    return { changes: [], syncToken: null, invalidToken: true };
  }
  assertResponseOk(response.status);
  return parseSyncCollection(text);
}

/** Parst eine sync-collection-Antwort in Änderungen (neu/geändert/gelöscht) + neuen sync-token. */
export function parseSyncCollection(xml: string): SyncCollectionResult {
  const parser = new XMLParser({ removeNSPrefix: true, ignoreAttributes: true, trimValues: true });
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new CalDavError("parse", "Die sync-collection-Antwort konnte nicht gelesen werden.");
  }
  const multistatus = (parsed.multistatus ?? {}) as Record<string, unknown>;
  const changes: SyncChange[] = [];
  for (const response of toArray(multistatus.response as unknown)) {
    const entry = response as Record<string, unknown>;
    const href = coerceText(entry.href);
    if (!href) {
      continue;
    }
    const statusText = collectStatuses(entry);
    const deleted = statusText.includes(" 404 ") || statusText.includes(" 410 ");
    let etag: string | null = null;
    for (const propstat of toArray(entry.propstat as unknown)) {
      const prop = (propstat as Record<string, unknown>).prop as Record<string, unknown> | undefined;
      etag = etag ?? coerceText(prop?.getetag);
    }
    changes.push({ href, etag, deleted });
  }
  return { changes, syncToken: coerceText(multistatus["sync-token"]), invalidToken: false };
}

function collectStatuses(entry: Record<string, unknown>): string {
  const parts: string[] = [];
  const push = (value: unknown): void => {
    const text = coerceText(value);
    if (text) {
      parts.push(` ${text} `);
    }
  };
  push(entry.status);
  for (const propstat of toArray(entry.propstat as unknown)) {
    push((propstat as Record<string, unknown>).status);
  }
  return parts.join(" ");
}

/** Lädt die vollständigen iCal-Daten gezielt für bestimmte hrefs (calendar-multiget REPORT). */
export async function calendarMultiget(
  credentials: NextCloudCredentials,
  calendarHref: string,
  hrefs: string[],
  fetchImpl: CalDavFetch = defaultFetch,
  timeoutMs = 30000
): Promise<RawCalendarEvent[]> {
  if (hrefs.length === 0) {
    return [];
  }
  const url = new URL(calendarHref, normalizeBaseUrl(credentials.baseUrl)).toString();
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<c:calendar-multiget xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
    "<d:prop><d:getetag/><c:calendar-data/></d:prop>" +
    hrefs.map((href) => `<d:href>${href}</d:href>`).join("") +
    "</c:calendar-multiget>";
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    { method: "REPORT", headers: { Authorization: basicAuthHeader(credentials.username, credentials.appPassword), Depth: "1", "Content-Type": "application/xml; charset=utf-8" }, body },
    timeoutMs
  );
  assertResponseOk(response.status);
  return parseEventsFromMultistatus(await response.text());
}
