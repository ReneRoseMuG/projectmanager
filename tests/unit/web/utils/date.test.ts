/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Datums-/Zeit-Formatierungsfunktionen mit echten ISO-Strings.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Funktionen haben keine externen Abhängigkeiten. Die
 *   Eingaben sind bewusst zeitzonenlos (kein "Z"), damit parseISO sie als
 *   lokale Zeit interpretiert und die HH:mm-Ausgabe unabhängig von der
 *   Zeitzone der Testumgebung deterministisch bleibt.
 *
 * Isolation:
 * - Keine DB-, API- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - formatEventTimeRange kapselt die isAllDay-Regel: ganztägige Termine ergeben
 *   "Ganztägig", sonst die Zeitspanne "HH:mm - HH:mm".
 * - formatHumanTime liefert "HH:mm".
 * - formatHumanDateTime liefert "dd.MM.yy HH:mm".
 *
 * Fehlerfälle:
 * - Leerer String, null und undefined ergeben einen leeren String, statt zu werfen.
 *
 * Ziel:
 * Die zentrale Zeitformatierung — insbesondere die geteilte isAllDay-Kapselung
 * der Terminansichten — gegen Regressionen absichern.
 */
import { describe, expect, it } from "vitest";
import { formatEventTimeRange, formatHumanDateTime, formatHumanTime } from "../../../../apps/web/src/utils/date";

describe("formatEventTimeRange", () => {
  it("zeigt die Zeitspanne für Termine mit Uhrzeit", () => {
    expect(formatEventTimeRange("2026-07-03T09:00:00", "2026-07-03T10:30:00", false)).toBe("09:00 - 10:30");
  });

  it("zeigt 'Ganztägig' für ganztägige Termine und ignoriert die Uhrzeiten", () => {
    expect(formatEventTimeRange("2026-07-03T00:00:00", "2026-07-03T23:59:59", true)).toBe("Ganztägig");
  });
});

describe("formatHumanTime", () => {
  it("formatiert die Uhrzeit als HH:mm", () => {
    expect(formatHumanTime("2026-07-03T09:05:00")).toBe("09:05");
  });

  it("liefert einen leeren String für leere Eingaben", () => {
    expect(formatHumanTime("")).toBe("");
    expect(formatHumanTime(null)).toBe("");
    expect(formatHumanTime(undefined)).toBe("");
  });
});

describe("formatHumanDateTime", () => {
  it("formatiert Datum und Uhrzeit als dd.MM.yy HH:mm", () => {
    expect(formatHumanDateTime("2026-07-03T09:05:00")).toBe("03.07.26 09:05");
  });

  it("liefert einen leeren String für leere Eingaben", () => {
    expect(formatHumanDateTime(null)).toBe("");
    expect(formatHumanDateTime(undefined)).toBe("");
  });
});
