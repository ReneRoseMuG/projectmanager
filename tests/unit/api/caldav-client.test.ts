/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter XML-Parser und echte Client-Logik. Der HTTP-Zugriff (Netzwerk) wird über den
 *   injizierbaren fetch durch aufgezeichnete CalDAV-Antworten ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock nur für den Netzwerk-Seiteneffekt (fetch) — erlaubt für Unit-Tests.
 *
 * Isolation:
 * - Reiner In-Prozess-Test, keine DB, kein echtes Netz.
 *
 * Abgedeckte Regeln:
 * - PROPFIND-Antwort wird korrekt geparst (Name, Farbe, href); Root-Collection wird gefiltert
 * - Kalender ohne Name/Farbe liefern null; Einzel-Kalender (Nicht-Array) wird korrekt behandelt
 * - Basic-Auth-Header + PROPFIND-Methode werden gesendet; nur HTTPS zulässig
 *
 * Fehlerfälle:
 * - 401/403 → auth, 404 → not_found, 5xx → network, Netzwerkfehler → network,
 *   Timeout → timeout, http:// → protocol, kaputtes XML → parse
 *
 * Ziel:
 * Absicherung des CalDAV-Discovery-Clients inkl. klarer Fehlerunterscheidung.
 */

import { describe, expect, it } from "vitest";
import { CalDavError, discoverCalendars, fetchCalendarEvents, parseCalendarsFromMultistatus, type CalDavFetch } from "../../../apps/api/src/services/caldav/caldav-client.js";

const MULTISTATUS =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:ic="http://apple.com/ns/ical/">' +
  "<d:response><d:href>/remote.php/dav/calendars/rene/</d:href>" +
  "<d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "<d:response><d:href>/remote.php/dav/calendars/rene/personal/</d:href>" +
  "<d:propstat><d:prop><d:displayname>Privat</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype><ic:calendar-color>#FF0000</ic:calendar-color></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "<d:response><d:href>/remote.php/dav/calendars/rene/work/</d:href>" +
  "<d:propstat><d:prop><d:displayname>Arbeit</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "</d:multistatus>";

const SINGLE =
  '<?xml version="1.0"?>' +
  '<d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">' +
  "<d:response><d:href>/dav/calendars/rene/only/</d:href>" +
  "<d:propstat><d:prop><d:displayname>Einzig</d:displayname><d:resourcetype><d:collection/><cal:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
  "</d:multistatus>";

function jsonFetch(status: number, body = ""): CalDavFetch {
  return async () => ({ status, text: async () => body });
}

const CREDS = { baseUrl: "https://cloud.example.com", username: "rene", appPassword: "app-pw" };

describe("CalDAV Client (AP-1.1)", () => {
  describe("parseCalendarsFromMultistatus", () => {
    it("extrahiert Kalender mit Name/Farbe und filtert die Root-Collection", () => {
      expect(parseCalendarsFromMultistatus(MULTISTATUS)).toEqual([
        { href: "/remote.php/dav/calendars/rene/personal/", displayName: "Privat", color: "#FF0000" },
        { href: "/remote.php/dav/calendars/rene/work/", displayName: "Arbeit", color: null }
      ]);
    });

    it("behandelt einen einzelnen Kalender (Nicht-Array-Antwort)", () => {
      expect(parseCalendarsFromMultistatus(SINGLE)).toEqual([{ href: "/dav/calendars/rene/only/", displayName: "Einzig", color: null }]);
    });

    it("wirft einen parse-Fehler bei kaputtem XML", () => {
      expect(() => parseCalendarsFromMultistatus("<<<kein xml")).toThrow(CalDavError);
    });

    it("liefert null für einen Kalender ohne Namen", () => {
      const xml =
        '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">' +
        "<d:response><d:href>/c/</d:href><d:propstat><d:prop><d:displayname></d:displayname>" +
        "<d:resourcetype><d:collection/><cal:calendar/></d:resourcetype></d:prop></d:propstat></d:response></d:multistatus>";
      expect(parseCalendarsFromMultistatus(xml)).toEqual([{ href: "/c/", displayName: null, color: null }]);
    });
  });

  describe("discoverCalendars", () => {
    it("liefert die Kalenderliste bei Multi-Status (207)", async () => {
      expect(await discoverCalendars(CREDS, jsonFetch(207, MULTISTATUS))).toHaveLength(2);
    });

    it("unterscheidet 401 (auth) von 404 (not_found) und 5xx (network)", async () => {
      await expect(discoverCalendars(CREDS, jsonFetch(401))).rejects.toMatchObject({ kind: "auth" });
      await expect(discoverCalendars(CREDS, jsonFetch(404))).rejects.toMatchObject({ kind: "not_found" });
      await expect(discoverCalendars(CREDS, jsonFetch(503))).rejects.toMatchObject({ kind: "network" });
    });

    it("lehnt http:// ab (nur HTTPS)", async () => {
      await expect(discoverCalendars({ ...CREDS, baseUrl: "http://cloud.example.com" }, jsonFetch(207, MULTISTATUS))).rejects.toMatchObject({ kind: "protocol" });
    });

    it("lehnt eine ungültige URL ab (protocol)", async () => {
      await expect(discoverCalendars({ ...CREDS, baseUrl: "keine-gueltige-url" }, jsonFetch(207, MULTISTATUS))).rejects.toMatchObject({ kind: "protocol" });
    });

    it("meldet Netzwerkfehler als network", async () => {
      const failing: CalDavFetch = async () => {
        throw new Error("ECONNREFUSED");
      };
      await expect(discoverCalendars(CREDS, failing)).rejects.toMatchObject({ kind: "network" });
    });

    it("meldet Zeitüberschreitung als timeout", async () => {
      const hanging: CalDavFetch = (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      await expect(discoverCalendars(CREDS, hanging, 20)).rejects.toMatchObject({ kind: "timeout" });
    });

    it("sendet PROPFIND mit Basic-Auth-Header", async () => {
      let captured: { method: string; headers: Record<string, string> } | undefined;
      const capturing: CalDavFetch = async (_url, init) => {
        captured = init;
        return { status: 207, text: async () => MULTISTATUS };
      };
      await discoverCalendars(CREDS, capturing);
      expect(captured?.method).toBe("PROPFIND");
      expect(captured?.headers.Authorization).toBe("Basic " + Buffer.from("rene:app-pw", "utf8").toString("base64"));
      expect(captured?.headers.Depth).toBe("1");
    });
  });

  describe("fetchCalendarEvents", () => {
    const EVENTS_MULTISTATUS =
      '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      "<d:response><d:href>/e/1.ics</d:href><d:propstat><d:prop>" +
      '<d:getetag>"etag-1"</d:getetag><c:calendar-data>BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:x\nEND:VEVENT\nEND:VCALENDAR</c:calendar-data>' +
      "</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>";

    it("parst VEVENT-Rohdaten (href, etag, ics) aus der calendar-query-Antwort", async () => {
      const events = await fetchCalendarEvents(CREDS, "/remote.php/dav/calendars/rene/personal/", jsonFetch(207, EVENTS_MULTISTATUS));
      expect(events).toHaveLength(1);
      expect(events[0].href).toBe("/e/1.ics");
      expect(events[0].ics).toContain("BEGIN:VEVENT");
    });

    it("unterscheidet Fehler (401 auth, 404 not_found, 5xx network)", async () => {
      await expect(fetchCalendarEvents(CREDS, "/cal/", jsonFetch(401))).rejects.toMatchObject({ kind: "auth" });
      await expect(fetchCalendarEvents(CREDS, "/cal/", jsonFetch(404))).rejects.toMatchObject({ kind: "not_found" });
      await expect(fetchCalendarEvents(CREDS, "/cal/", jsonFetch(500))).rejects.toMatchObject({ kind: "network" });
    });
  });
});
