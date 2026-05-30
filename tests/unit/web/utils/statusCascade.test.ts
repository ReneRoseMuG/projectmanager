/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Status-Kaskaden-Hilfsfunktionen mit echten CatalogEntry-Strukturen.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Tests prüfen deterministische Datenlogik.
 *
 * Isolation:
 * - Keine DB-, API- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Betroffene Objekte werden ausschließlich über kleinere workStatus-sortOrder-Werte ermittelt.
 * - Dialogschritte entstehen in der Reihenfolge Meilensteine, Aufgaben, Tickets.
 *
 * Fehlerfälle:
 * - Gleiche, höhere und unbekannte Statuswerte werden nicht als betroffen behandelt.
 *
 * Ziel:
 * Die Kaskaden-Grundlogik unabhängig von React gegen Status- und Step-Regressionen absichern.
 */
import type { CatalogEntry } from "@taskmanager/shared-types";
import { describe, expect, it } from "vitest";
import { buildDialogSteps, filterAffectedObjects, isStatusIncrease, workStatusSortOrder } from "../../../../apps/web/src/utils/statusCascade";

const now = "2026-05-26T12:00:00.000Z";

const entries: CatalogEntry[] = [
  { id: 1, kind: "workStatus", key: "open", label: "Offen", sortOrder: 100, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: now, updatedAt: now },
  { id: 2, kind: "workStatus", key: "in_progress", label: "In Arbeit", sortOrder: 200, isClosed: false, color: "var(--color-tangerine)", version: 1, createdAt: now, updatedAt: now },
  { id: 3, kind: "workStatus", key: "closed", label: "Geschlossen", sortOrder: 300, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: now, updatedAt: now },
];

describe("status cascade utils", () => {
  it("ermittelt Statuserhöhungen über workStatus-sortOrder", () => {
    expect(isStatusIncrease(entries, "open", "closed")).toEqual({ increased: true, newSortOrder: 300 });
    expect(isStatusIncrease(entries, "closed", "open")).toEqual({ increased: false, newSortOrder: 100 });
    expect(isStatusIncrease(entries, "open", "open")).toEqual({ increased: false, newSortOrder: 100 });
    expect(isStatusIncrease(entries, "open", "missing")).toEqual({ increased: false, newSortOrder: null });
    expect(workStatusSortOrder(entries, "in_progress")).toBe(200);
  });

  it("filtert nur Objekte mit niedrigerem Status-sortOrder", () => {
    const items = [
      { id: 1, statusSortOrder: 100 },
      { id: 2, statusSortOrder: 200 },
      { id: 3, statusSortOrder: 300 },
      { id: 4, statusSortOrder: null },
    ];

    expect(filterAffectedObjects(items, 300).map((item) => item.id)).toEqual([1, 2]);
  });

  it("baut Dialogschritte in fester Reihenfolge und ohne leere Gruppen", () => {
    const task = { id: 2, title: "Aufgabe", status: "open", statusLabel: "Offen", version: 1 };
    const ticket = { id: 3, title: "Ticket", status: "in_progress", statusLabel: "In Arbeit", version: 1 };

    expect(buildDialogSteps([], [task], [ticket])).toEqual([
      { type: "task", title: "Aufgaben", singularTitle: "Aufgabe", items: [task] },
      { type: "ticket", title: "Tickets", singularTitle: "Ticket", items: [ticket] },
    ]);
  });
});
