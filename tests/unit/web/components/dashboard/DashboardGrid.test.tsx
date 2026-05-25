// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - DashboardGrid rendert Widgets stabil nach Row/Column.
 * - Full-width-Widgets erhalten die zweispaltige Layoutklasse.
 * - Widget-Zellen strecken sich auf die Zeilenhöhe.
 *
 * Fehlerfälle:
 * - Unscharfe Reihenfolge durch ungeordnete Widgetarrays.
 *
 * Ziel:
 * Die grundlegende Layoutverdrahtung der Dashboard-Anzeige absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { Dashboard } from "@taskmanager/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardGrid } from "../../../../../apps/web/src/components/dashboard/DashboardGrid";

vi.mock("../../../../../apps/web/src/components/dashboard/DashboardWidgets", () => ({
  DashboardWidgetCard({ widget }: { widget: { widgetId: string } }) {
    return <div data-testid="mock-dashboard-widget">{widget.widgetId}</div>;
  }
}));

const dashboard: Dashboard = {
  id: 1,
  name: "Test-Dashboard",
  context: "project",
  isSystem: false,
  templateKey: null,
  ownerId: 1,
  version: 1,
  createdAt: "2026-05-22T10:00:00.000Z",
  updatedAt: "2026-05-22T10:00:00.000Z",
  isGlobalDefault: false,
  isUserDefault: true,
  widgets: [
    { widgetId: "globalJournal", col: 0, row: 2, colSpan: 2 },
    { widgetId: "ticketStatusReport", col: 1, row: 0, colSpan: 1 },
    { widgetId: "taskStatusReport", col: 0, row: 0, colSpan: 1 }
  ]
};

describe("DashboardGrid", () => {
  it("ordnet Widgets nach Layoutposition und markiert volle Breite", () => {
    render(<DashboardGrid dashboard={dashboard} owner={{ type: "project", id: 10 }} />);

    expect(screen.getAllByTestId("mock-dashboard-widget").map((item) => item.textContent)).toEqual([
      "taskStatusReport",
      "ticketStatusReport",
      "globalJournal"
    ]);
    expect(screen.getByText("globalJournal").parentElement).toHaveClass("xl:col-span-2");
    for (const item of screen.getAllByTestId("mock-dashboard-widget")) {
      expect(item.parentElement).toHaveClass("h-full");
    }
  });
});
