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
 *
 * Fehlerfälle:
 * - Ein no-owner Meilenstein-Widget würde sonst trotz vorhandener Meilensteine leer bleiben.
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
});
