// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DashboardPicker-Komponente mit DOM-Interaktion und localStorage in jsdom.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Callbacks werden als Vitest-Spies beobachtet.
 *
 * Isolation:
 * - jsdom ohne API- oder Dateisystemzugriff; localStorage wird je Test geleert.
 *
 * Abgedeckte Regeln:
 * - Schreibberechtigte Nutzer sehen Standard-Stern, Bearbeiten, neue Ansicht und einklappbare Details.
 * - Der eingeklappte Zustand wird im localStorage gespeichert.
 * - Ohne Schreibrecht bleibt nur die Ansichtsauswahl sichtbar.
 *
 * Fehlerfälle:
 * - Versehentlich sichtbare Bearbeitungsaktionen für reine Leser und verlorene Picker-Persistenz.
 *
 * Ziel:
 * Den dauerhaften DashboardPicker der persönlichen Planung gegen UI-Regressions absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { Dashboard } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPicker } from "../../../../../apps/web/src/components/dashboard/DashboardPicker";

const dashboards: Dashboard[] = [
  {
    id: 1,
    name: "Standard",
    context: "dayPlan",
    isSystem: true,
    templateKey: "system.dayPlan.default",
    ownerId: null,
    widgets: [],
    version: 1,
    createdAt: "2026-05-28T07:00:00.000Z",
    updatedAt: "2026-05-28T07:00:00.000Z",
    isGlobalDefault: true,
    isUserDefault: false,
  },
  {
    id: 2,
    name: "Meine Ansicht",
    context: "dayPlan",
    isSystem: false,
    templateKey: null,
    ownerId: 5,
    widgets: [],
    version: 3,
    createdAt: "2026-05-28T07:00:00.000Z",
    updatedAt: "2026-05-28T07:00:00.000Z",
    isGlobalDefault: false,
    isUserDefault: true,
  },
];

function renderPicker(canWrite = true) {
  const callbacks = {
    onChange: vi.fn(),
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onSetDefault: vi.fn(async () => undefined),
  };

  render(
    <DashboardPicker
      dashboards={dashboards}
      selectedDashboard={dashboards[1]}
      selectedDashboardId={2}
      canWrite={canWrite}
      collapsedStorageKey="test:dashboard-picker"
      {...callbacks}
    />,
  );

  return callbacks;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("DashboardPicker", () => {
  it("zeigt Schreibaktionen und persistiert die Detailzeile", () => {
    const callbacks = renderPicker(true);

    fireEvent.click(screen.getByLabelText("Aktiver Standard"));
    expect(callbacks.onSetDefault).toHaveBeenCalledWith(dashboards[1]);

    fireEvent.click(screen.getByLabelText("Ansicht bearbeiten"));
    expect(callbacks.onEdit).toHaveBeenCalledWith(dashboards[1]);

    fireEvent.click(screen.getByLabelText("Neue Ansicht"));
    expect(callbacks.onCreate).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Eigene Ansicht")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Details ausblenden"));

    expect(window.localStorage.getItem("test:dashboard-picker")).toBe("collapsed");
    expect(screen.queryByText("Eigene Ansicht")).not.toBeInTheDocument();
  });

  it("blendet Schreibaktionen ohne Schreibrecht aus", () => {
    renderPicker(false);

    expect(screen.getByLabelText("Ansicht")).toBeInTheDocument();
    expect(screen.queryByLabelText("Neue Ansicht")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ansicht bearbeiten")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Aktiver Standard")).not.toBeInTheDocument();
  });
});
