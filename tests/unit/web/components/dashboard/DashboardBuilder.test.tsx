// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - DashboardBuilder aktualisiert persönliche Dashboards versioniert.
 * - Kalender-Dashboards starten mit interaktivem Kalender und passenden Zusatzwidgets.
 * - Nicht-Admins speichern System-Dashboards nur als persönliche Kopie.
 * - Widget-Auswahl und Layoutparameter werden in den Save-Payload übernommen.
 *
 * Fehlerfälle:
 * - Systemdashboard-Schreibzugriff ohne Adminrecht und verlorene Widgetkonfiguration.
 *
 * Ziel:
 * Die UI-Verdrahtung des Dashboard-Editors gegen falsche Save-Pfade und Layoutverluste absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { Dashboard } from "@taskmanager/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialogProvider } from "../../../../../apps/web/src/components/ui/ConfirmDialogProvider";
import { ToastProvider } from "../../../../../apps/web/src/components/ui/ToastProvider";
import { DashboardBuilder } from "../../../../../apps/web/src/components/dashboard/DashboardBuilder";

function renderWithProviders(ui: ReactElement) {
  return render(
    <ToastProvider>
      <ConfirmDialogProvider>{ui}</ConfirmDialogProvider>
    </ToastProvider>
  );
}

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 7,
    name: "Meine Übersicht",
    context: "project",
    isSystem: false,
    templateKey: null,
    ownerId: 1,
    widgets: [{ widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1, params: { limit: 10, sort: "updatedAt" } }],
    version: 3,
    createdAt: "2026-05-22T10:00:00.000Z",
    updatedAt: "2026-05-22T10:00:00.000Z",
    isGlobalDefault: false,
    isUserDefault: false,
    ...overrides
  };
}

describe("DashboardBuilder", () => {
  it("speichert persönliche Dashboards mit expectedVersion und neuem Widget", async () => {
    const onUpdate = vi.fn().mockResolvedValue(dashboard({ version: 4 }));
    const onSaved = vi.fn();

    renderWithProviders(
      <DashboardBuilder
        open
        context="project"
        dashboard={dashboard()}
        canAdmin={false}
        saving={false}
        userDefaultVersion={0}
        globalDefaultVersion={1}
        onClose={vi.fn()}
        onSaved={onSaved}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Meine Übersicht"), { target: { value: "Meine Lage" } });
    fireEvent.click(screen.getByRole("button", { name: "Tickets nach Status" }));
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        name: "Meine Lage",
        context: "project",
        isSystem: false,
        expectedVersion: 3,
        widgets: expect.arrayContaining([
          expect.objectContaining({ widgetId: "taskStatusReport", row: 0, col: 0 }),
          expect.objectContaining({ widgetId: "ticketStatusReport", row: 1, col: 0, colSpan: 2 })
        ])
      })
    );
    expect(onSaved).toHaveBeenCalledWith(7);
  });

  it("legt für System-Dashboards ohne Adminrecht eine persönliche Kopie an", async () => {
    const onCreate = vi.fn().mockResolvedValue(dashboard({ id: 9, isSystem: false, name: "Standard Kopie" }));

    renderWithProviders(
      <DashboardBuilder
        open
        context="project"
        dashboard={dashboard({ isSystem: true, ownerId: null, name: "Standard" })}
        canAdmin={false}
        saving={false}
        userDefaultVersion={0}
        globalDefaultVersion={1}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Standard Kopie")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Als eigenes Dashboard speichern" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Standard Kopie", isSystem: false }));
  });

  it("initialisiert Kalender-Dashboards mit Kalender, nächsten Terminen und überfälligen Aufgaben", () => {
    renderWithProviders(
      <DashboardBuilder
        open
        context="calendar"
        dashboard={null}
        canAdmin={false}
        saving={false}
        userDefaultVersion={0}
        globalDefaultVersion={1}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onSetDefault={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Mein Kalender")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-builder-widget-calendar")).toHaveTextContent("Kalender");
    expect(screen.getByTestId("dashboard-builder-widget-upcomingEvents")).toHaveTextContent("Nächste Termine");
    expect(screen.getByTestId("dashboard-builder-widget-overdueTasks")).toHaveTextContent("Überfällige Aufgaben");
  });
});
