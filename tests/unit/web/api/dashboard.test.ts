/**
 * Test Scope:
 * Dashboard API client
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - API-Client-Funktionen mit gemocktem ky-Client, ohne HTTP-Server.
 *
 * Mock-Entscheidung:
 * - Der ky-Client wird gemockt, weil nur die URL- und Widget-Fallback-Logik im Web-API-Modul geprüft wird.
 *
 * Isolation:
 * - Kein DB-, Datei- oder Netzwerkzugriff.
 *
 * Abgedeckte Regeln:
 * - Meilenstein-Widgets laden ohne Dashboard-Owner globale Meilensteine statt leerer Daten.
 * - Projektbezogene Meilenstein-Widgets bleiben auf den Projekt-Endpunkt eingegrenzt.
 * - taskList/taskBoard fordern geschlossene Aufgaben über includeClosed an, taskJournal nicht.
 *
 * Fehlerfälle:
 * - Ein no-owner Meilenstein-Widget würde sonst trotz vorhandener Meilensteine leer bleiben.
 * - Ohne includeClosed würde eine geschlossene Aufgabe aus Board-/Listen-Widgets verschwinden.
 *
 * Ziel:
 * Die Datenquelle der Meilenstein-Widgets auf Startseite und globalem Dashboard absichern.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMilestone } from "../../../fixtures/web/components/ui/factories";

const apiMocks = vi.hoisted(() => {
  const json = vi.fn();
  return {
    json,
    get: vi.fn(() => ({ json }))
  };
});

vi.mock("../../../../apps/web/src/api/client", () => ({
  api: {
    get: apiMocks.get
  }
}));

import { getDashboardWidgetData } from "../../../../apps/web/src/api/dashboard";

afterEach(() => {
  vi.clearAllMocks();
});

describe("dashboard api client", () => {
  it("lädt Meilenstein-Widgets ohne Owner aus der globalen Meilensteinliste", async () => {
    const milestones = [buildMilestone({ id: 1, name: "Global A" }), buildMilestone({ id: 2, name: "Global B" })];
    apiMocks.json.mockResolvedValue(milestones);

    const data = await getDashboardWidgetData("milestoneBoard", undefined, { limit: 1 });

    expect(apiMocks.get).toHaveBeenCalledWith("milestones");
    expect(data).toEqual([milestones[0]]);
  });

  it("lädt Meilenstein-Widgets mit Projekt-Owner aus der Projektliste", async () => {
    const milestones = [buildMilestone({ id: 3, name: "Projekt A" })];
    apiMocks.json.mockResolvedValue(milestones);

    const data = await getDashboardWidgetData("milestoneList", { type: "project", id: 7 }, { limit: 10 });

    expect(apiMocks.get).toHaveBeenCalledWith("projects/7/milestones");
    expect(data).toEqual(milestones);
  });

  it("fordert für taskList und taskBoard geschlossene Aufgaben mit includeClosed an", async () => {
    apiMocks.json.mockResolvedValue([]);

    await getDashboardWidgetData("taskList", { type: "dayPlan", id: 5 });
    await getDashboardWidgetData("taskBoard", { type: "dayPlan", id: 5 });

    for (const call of apiMocks.get.mock.calls) {
      expect(call[0]).toBe("tasks/recent");
      expect((call[1] as { searchParams: Record<string, unknown> }).searchParams).toMatchObject({ ownerType: "dayPlan", ownerId: 5, includeClosed: "true" });
    }
  });

  it("lädt taskJournal ohne includeClosed, sodass geschlossene Aufgaben ausgeblendet bleiben", async () => {
    apiMocks.json.mockResolvedValue([]);

    await getDashboardWidgetData("taskJournal", { type: "dayPlan", id: 5 });

    expect(apiMocks.get).toHaveBeenCalledWith("tasks/recent", { searchParams: { ownerType: "dayPlan", ownerId: 5 } });
    expect((apiMocks.get.mock.calls[0]![1] as { searchParams: Record<string, unknown> }).searchParams).not.toHaveProperty("includeClosed");
  });
});
