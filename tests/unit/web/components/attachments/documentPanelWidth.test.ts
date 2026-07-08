/**
 * Test Scope:
 * Inhaltsgesteuerte Breite der Verwaltungsspalte (Sammlungen + Kategorien) der Dokumente-Seite.
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Berechnungsfunktion mit injizierter Messfunktion.
 *
 * Mock-Entscheidung:
 * - Die Textmessung wird injiziert (externer Seiteneffekt: Canvas). Unter jsdom liefert
 *   `canvas.getContext("2d")` nichts; ein Test gegen die echte Messung würde nur beweisen,
 *   dass jsdom kein Canvas hat — also nichts. Die zu prüfende Logik (längster Eintrag,
 *   Aufschläge, Klemmen) bleibt echt.
 *
 * Isolation:
 * - Keine (reine Funktion).
 *
 * Abgedeckte Regeln:
 * - Der längste Eintrag bestimmt die Breite, nicht der erste oder letzte.
 * - Einrückung von Unter-Sammlungen und die Aktionsknöpfe (nur mit Schreibrecht) zählen mit.
 * - Das Ergebnis wird auf den Korridor [PANEL_MIN_WIDTH, PANEL_MAX_WIDTH] geklemmt.
 *
 * Fehlerfälle:
 * - Leere Liste (keine Sammlungen/Kategorien) fällt auf die Mindestbreite zurück.
 * - Ein extrem langer Name sprengt die Maximalbreite nicht.
 *
 * Ziel:
 * Absichern, dass lange Namen die Spalte verbreitern, aber die Bibliothek daneben nie erdrücken.
 */
import { describe, expect, it } from "vitest";
import {
  PANEL_MAX_WIDTH,
  PANEL_MIN_WIDTH,
  computePanelWidth,
} from "../../../../../apps/web/src/components/attachments/documentPanelWidth";

// Ein Zeichen = 10 px. Damit ist jede erwartete Breite von Hand nachrechenbar.
const measure = (text: string) => text.length * 10;

describe("computePanelWidth", () => {
  it("fällt ohne Einträge auf die Mindestbreite zurück", () => {
    expect(computePanelWidth([], true, measure)).toBe(PANEL_MIN_WIDTH);
  });

  it("hält die Mindestbreite, solange die Namen kurz sind", () => {
    expect(computePanelWidth([{ label: "Kurz" }], false, measure)).toBe(
      PANEL_MIN_WIDTH,
    );
  });

  it("richtet sich nach dem längsten Eintrag, nicht nach dem ersten", () => {
    const rows = [
      { label: "A" },
      { label: "X".repeat(25) }, // 250 px Text
      { label: "BB" },
    ];
    // 250 (Text) + 104 (Zeilen-Overhead) = 354, ohne Schreibrecht keine Aktionsknöpfe.
    expect(computePanelWidth(rows, false, measure)).toBe(354);
  });

  it("rechnet die Aktionsknöpfe nur mit Schreibrecht ein", () => {
    const rows = [{ label: "X".repeat(25) }];
    const withoutWrite = computePanelWidth(rows, false, measure);
    const withWrite = computePanelWidth(rows, true, measure);
    expect(withWrite - withoutWrite).toBe(52);
  });

  it("zählt die Einrückung von Unter-Sammlungen mit", () => {
    const flat = computePanelWidth([{ label: "X".repeat(25) }], false, measure);
    const nested = computePanelWidth(
      [{ label: "X".repeat(25), indent: 12 }],
      false,
      measure,
    );
    expect(nested - flat).toBe(12);
  });

  it("klemmt einen extrem langen Namen auf die Maximalbreite", () => {
    const rows = [{ label: "X".repeat(500) }];
    expect(computePanelWidth(rows, true, measure)).toBe(PANEL_MAX_WIDTH);
  });
});
