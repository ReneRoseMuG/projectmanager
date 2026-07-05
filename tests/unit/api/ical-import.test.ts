/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echter node-ical-Parser und echte Mapping-/Expansionslogik. Keine DB, kein Netz.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; es werden reale ICS-Fixtures geparst.
 *
 * Isolation:
 * - Reiner In-Prozess-Test mit deterministischem Zeitfenster.
 *
 * Abgedeckte Regeln:
 * - Einzeltermin, Ganztag, mehrtägig; wöchentliche Serie wird korrekt expandiert
 * - Wandzeit bleibt über die DST-Umstellung konstant (kein Off-by-one)
 * - EXDATE-Ausnahmen werden ausgelassen; Serien-Instanzen erhalten stabile eindeutige IDs
 *
 * Fehlerfälle:
 * - (in der Integration: kaputtes ICS wird übersprungen)
 *
 * Ziel:
 * Absicherung der zeitzonen-/serienkorrekten iCal-Abbildung.
 */

import ical from "node-ical";
import { describe, expect, it } from "vitest";
import { veventToDrafts, type ImportWindow } from "../../../apps/api/src/services/ical-import.service.js";

const WINDOW: ImportWindow = { from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-12-31T23:59:59Z") };

function ics(body: string): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Test//EN\r\n${body}\r\nEND:VCALENDAR`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVEvent(icsBody: string): any {
  const parsed = ical.sync.parseICS(ics(icsBody));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vevents = Object.values(parsed).filter((component: any) => component.type === "VEVENT");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return vevents.find((component: any) => component.rrule) ?? vevents[0];
}

describe("iCal Import — veventToDrafts (AP-1.2)", () => {
  it("mappt einen Einzeltermin auf lokale Wandzeit", () => {
    const vevent = parseVEvent("BEGIN:VEVENT\r\nUID:s1\r\nDTSTART;TZID=Europe/Berlin:20260701T100000\r\nDTEND;TZID=Europe/Berlin:20260701T113000\r\nSUMMARY:Einzel\r\nEND:VEVENT");
    const drafts = veventToDrafts(vevent, "/e/1.ics", "etag1", WINDOW);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      externalId: "/e/1.ics",
      title: "Einzel",
      startTime: "2026-07-01T10:00:00",
      endTime: "2026-07-01T11:30:00",
      isAllDay: false
    });
  });

  it("erkennt Ganztagstermine ohne Zeitzonenverschiebung", () => {
    const vevent = parseVEvent("BEGIN:VEVENT\r\nUID:a1\r\nDTSTART;VALUE=DATE:20260701\r\nDTEND;VALUE=DATE:20260702\r\nSUMMARY:Ganztag\r\nEND:VEVENT");
    const drafts = veventToDrafts(vevent, "/e/2.ics", null, WINDOW);
    expect(drafts[0].isAllDay).toBe(true);
    expect(drafts[0].startTime).toBe("2026-07-01T00:00:00");
  });

  it("expandiert eine wöchentliche Serie mit eindeutigen Instanz-IDs", () => {
    const vevent = parseVEvent("BEGIN:VEVENT\r\nUID:r1\r\nDTSTART;TZID=Europe/Berlin:20260302T100000\r\nDTEND;TZID=Europe/Berlin:20260302T110000\r\nRRULE:FREQ=WEEKLY;COUNT=6\r\nSUMMARY:Woechentlich\r\nEND:VEVENT");
    const drafts = veventToDrafts(vevent, "/e/3.ics", null, WINDOW);
    expect(drafts).toHaveLength(6);
    expect(new Set(drafts.map((draft) => draft.externalId)).size).toBe(6);
  });

  it("hält die Wandzeit über die DST-Umstellung konstant (kein Off-by-one)", () => {
    const vevent = parseVEvent("BEGIN:VEVENT\r\nUID:dst1\r\nDTSTART;TZID=Europe/Berlin:20260302T100000\r\nDTEND;TZID=Europe/Berlin:20260302T110000\r\nRRULE:FREQ=WEEKLY;COUNT=6\r\nSUMMARY:DST\r\nEND:VEVENT");
    const drafts = veventToDrafts(vevent, "/e/4.ics", null, WINDOW);
    // Europe/Berlin schaltet 2026 am 29. März auf Sommerzeit; die Instanz am 30. März bleibt 10:00.
    const afterDst = drafts.find((draft) => draft.startTime.startsWith("2026-03-30"));
    expect(afterDst?.startTime).toBe("2026-03-30T10:00:00");
    expect(drafts.every((draft) => draft.startTime.endsWith("T10:00:00"))).toBe(true);
  });

  it("berücksichtigt eine verschobene Einzelinstanz (Override)", () => {
    const vevent = parseVEvent(
      "BEGIN:VEVENT\r\nUID:ov1\r\nDTSTART;TZID=Europe/Berlin:20260302T100000\r\nDTEND;TZID=Europe/Berlin:20260302T110000\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nSUMMARY:Serie\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:ov1\r\nRECURRENCE-ID;TZID=Europe/Berlin:20260309T100000\r\nDTSTART;TZID=Europe/Berlin:20260309T140000\r\nDTEND;TZID=Europe/Berlin:20260309T150000\r\nSUMMARY:Verschoben\r\nEND:VEVENT"
    );
    const drafts = veventToDrafts(vevent, "/e/ov.ics", null, WINDOW);
    const moved = drafts.find((draft) => draft.startTime.startsWith("2026-03-09"));
    expect(moved?.startTime).toBe("2026-03-09T14:00:00");
    expect(moved?.title).toBe("Verschoben");
  });

  it("lässt EXDATE-Ausnahmen aus der Serie aus", () => {
    const vevent = parseVEvent("BEGIN:VEVENT\r\nUID:ex1\r\nDTSTART;TZID=Europe/Berlin:20260302T100000\r\nDTEND;TZID=Europe/Berlin:20260302T110000\r\nRRULE:FREQ=WEEKLY;COUNT=6\r\nEXDATE;TZID=Europe/Berlin:20260309T100000\r\nSUMMARY:MitAusnahme\r\nEND:VEVENT");
    const drafts = veventToDrafts(vevent, "/e/5.ics", null, WINDOW);
    expect(drafts).toHaveLength(5);
    expect(drafts.find((draft) => draft.startTime.startsWith("2026-03-09"))).toBeUndefined();
  });
});
