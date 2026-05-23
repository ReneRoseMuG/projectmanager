/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Geladene Task-Collections sind die Quelle für Projekt-Counter.
 * - Eine geladene leere Collection zählt als aktueller Zustand und fällt nicht auf alte Server-Counter zurück.
 *
 * Fehlerfälle:
 * - Alte Projekt-Counter dürfen nach dem Löschen der letzten Aufgabe nicht weiter angezeigt werden.
 *
 * Ziel:
 * Die Count-Ableitung für Projekt-Header und Tab-Counter gegen stale Fallbacks absichern.
 */
import { describe, expect, it } from "vitest";
import { deriveProjectTaskStats } from "../../../../apps/web/src/utils/projectTaskStats";
import type { CatalogEntry } from "@taskmanager/shared-types";

const staleProjectCounts = {
  openTaskCount: 1,
  doneTaskCount: 0,
  totalTaskCount: 1
};

const catalogEntries: CatalogEntry[] = [
  { id: 1, kind: "workStatus", key: "active", label: "Offen", sortOrder: 1, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "", updatedAt: "" },
  { id: 2, kind: "workStatus", key: "review_passed", label: "Abnahme passiert", sortOrder: 2, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "", updatedAt: "" }
];

describe("deriveProjectTaskStats", () => {
  it("nutzt geladene leere Task-Listen als aktuellen Zustand", () => {
    expect(deriveProjectTaskStats(staleProjectCounts, [], true)).toEqual({
      totalTasks: 0,
      doneTasks: 0,
      openTasks: 0,
      progress: 0
    });
  });

  it("nutzt Projekt-Counter nur solange Task-Daten nicht verfügbar sind", () => {
    expect(deriveProjectTaskStats(staleProjectCounts, [], false)).toEqual({
      totalTasks: 1,
      doneTasks: 0,
      openTasks: 1,
      progress: 0
    });
  });

  it("wertet geladene Aufgaben nach dem Katalog-Flag isClosed aus", () => {
    expect(deriveProjectTaskStats(staleProjectCounts, [{ status: "active" }, { status: "review_passed" }], true, catalogEntries)).toEqual({
      totalTasks: 2,
      doneTasks: 1,
      openTasks: 1,
      progress: 50
    });
  });
});
