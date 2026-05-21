/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Journal-Änderungen enthalten sprechende Feldlabels und menschenlesbare Werte.
 * - Einzelfeld-Updates erzeugen konkrete Zusammenfassungen statt generischer Änderungsmeldungen.
 *
 * Fehlerfälle:
 * - Unveränderte Felder werden nicht als Journal-Änderung ausgegeben.
 *
 * Ziel:
 * Die fachliche Lesbarkeit der Journal-Formatierung unabhängig von Datenbank und API absichern.
 */

import { describe, expect, it } from "vitest";
import { buildJournalChanges, buildUpdateSummary, makeJournalObject, type JournalFieldDefinition } from "../../../../apps/api/src/services/journal.service.js";

interface AppointmentRecord extends Record<string, unknown> {
  title: string;
  dueDate: string | null;
  status: string;
}

const fields: Array<JournalFieldDefinition<AppointmentRecord>> = [
  { key: "title", label: "Titel" },
  { key: "dueDate", label: "Enddatum" },
  { key: "status", label: "Status" }
];

describe("journal.service", () => {
  it("formatiert Datumsänderungen mit konkretem Feld und dd.MM.yy", () => {
    const before: AppointmentRecord = { title: "Termin A", dueDate: "2026-05-31", status: "open" };
    const after: AppointmentRecord = { title: "Termin A", dueDate: "2026-06-15", status: "open" };

    const changes = buildJournalChanges(before, after, fields);
    const summary = buildUpdateSummary(makeJournalObject("event", 7, "Termin A"), changes);

    expect(changes).toEqual([
      expect.objectContaining({
        fieldKey: "dueDate",
        fieldLabel: "Enddatum",
        oldValueLabel: "31.05.26",
        newValueLabel: "15.06.26",
        summary: "Enddatum: 31.05.26 → 15.06.26"
      })
    ]);
    expect(summary).toBe('Termin "Termin A" hat ein neues Enddatum: 31.05.26 → 15.06.26.');
  });

  it("ignoriert unveränderte Felder und übersetzt bekannte Statuswerte", () => {
    const changes = buildJournalChanges({ title: "Aufgabe", dueDate: null, status: "open" }, { title: "Aufgabe", dueDate: null, status: "done" }, fields);

    expect(changes).toEqual([
      expect.objectContaining({
        fieldKey: "status",
        oldValueLabel: "Offen",
        newValueLabel: "Erledigt"
      })
    ]);
  });
});
