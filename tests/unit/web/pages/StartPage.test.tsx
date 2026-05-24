// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit, jsdom mit echter StartPage und MemoryRouter.
 *
 * Realitätsgrad:
 * - Echte Permission-Entscheidung über Hook-Double; Dashboard- und Kalenderkinder als Komponenten-Doubles.
 *
 * Mock-Entscheidung:
 * - Server-State-Hooks und schwere Kalender-/Dashboard-Komponenten werden isoliert, weil diese Datei die Seitenverdrahtung prüft.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Die Startseite rendert Home-Dashboard und Kalender-Vorschau mit vorhandenen Leserechten.
 * - Ohne dashboards:read wird ein Forbidden-Zustand angezeigt.
 * - Ohne Kalender- und Aufgabenrechte bleiben die Queries deaktiviert.
 *
 * Fehlerfälle:
 * - Ungeschützter Root-Zugriff, unnötige Kalenderqueries ohne Rechte und fehlende Startseitenbereiche.
 *
 * Ziel:
 * Die neue Root-Seite gegen Permission- und Render-Regressions absichern.
 */

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StartPage } from "../../../../apps/web/src/pages/StartPage";

const testState = vi.hoisted(() => ({
  permissions: {
    dashboards: true,
    events: true,
    tasks: true,
  } as Record<string, boolean>,
  useEvents: vi.fn(),
  useCalendarTasks: vi.fn(),
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission(resource: string) {
    return testState.permissions[resource] ?? false;
  },
}));

vi.mock("../../../../apps/web/src/hooks/useEvents", () => ({
  useEvents: testState.useEvents,
}));

vi.mock("../../../../apps/web/src/hooks/useCalendarTasks", () => ({
  useCalendarTasks: testState.useCalendarTasks,
}));

vi.mock("../../../../apps/web/src/components/dashboard/DashboardView", () => ({
  HomeDashboard() {
    return <div data-testid="home-dashboard" />;
  },
}));

vi.mock("../../../../apps/web/src/components/calendar/CalendarView", () => ({
  CalendarView({ events, tasks, compact }: { events: unknown[]; tasks: unknown[]; compact?: boolean }) {
    return <div data-testid="calendar-view">{`${compact ? "compact" : "full"}:${events.length}:${tasks.length}`}</div>;
  },
}));

vi.mock("../../../../apps/web/src/components/calendar/UpcomingEvents", () => ({
  UpcomingEvents({ events }: { events: unknown[] }) {
    return <div data-testid="upcoming-events">{events.length}</div>;
  },
}));

function renderStartPage() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <StartPage />
    </MemoryRouter>,
  );
}

describe("StartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(testState.permissions, {
      dashboards: true,
      events: true,
      tasks: true,
    });
    testState.useEvents.mockReturnValue({
      events: [{ id: 1, title: "Starttermin" }],
      loading: false,
      error: null,
    });
    testState.useCalendarTasks.mockReturnValue({
      tasks: [{ id: 2, title: "Startaufgabe" }],
      loading: false,
      error: null,
    });
  });

  it("rendert Home-Dashboard und kompakte Kalender-Vorschau mit Leserechten", () => {
    renderStartPage();

    expect(screen.getByRole("heading", { name: "Startseite" })).toBeInTheDocument();
    expect(screen.getByTestId("home-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-view")).toHaveTextContent("compact:1:1");
    expect(screen.getByTestId("upcoming-events")).toHaveTextContent("1");
  });

  it("zeigt ohne Dashboard-Leserecht den Forbidden-Zustand", () => {
    testState.permissions.dashboards = false;

    renderStartPage();

    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.queryByTestId("home-dashboard")).not.toBeInTheDocument();
  });

  it("deaktiviert Kalenderqueries ohne Event- und Aufgabenrechte", () => {
    testState.permissions.events = false;
    testState.permissions.tasks = false;

    renderStartPage();

    expect(testState.useEvents).toHaveBeenCalledWith(undefined, false);
    expect(testState.useCalendarTasks).toHaveBeenCalledWith(false);
    expect(screen.getByText("Kalender nicht verfügbar")).toBeInTheDocument();
  });
});
