// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DashboardWidgetCard mit echten Board/List-Adaptern und echten DOM-Doppelklicks in jsdom.
 *
 * Mock-Entscheidung:
 * - Dashboard-Query-Hook, Katalog-Hook und Kalender-Imports werden gemockt, weil nur die Widget-Navigationsverdrahtung geprüft wird.
 *
 * Isolation:
 * - jsdom ohne DB-, API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - Alle Dashboard-Board/List-Widgets navigieren per Doppelklick zur passenden Detailroute.
 * - Das neue Milestone-Listenwidget ist als „Meilensteinliste“ im Widget-Katalog benannt.
 *
 * Fehlerfälle:
 * - Read-only Widget-Karten mit No-op onOpen oder falscher Detailroute.
 *
 * Ziel:
 * Die Dashboard-Widget-Verdrahtung gegen verlorene Detailnavigation absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { DashboardWidgetId, DashboardWidgetLayout, Milestone, Project, Task, Ticket } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardWidgetCard } from "../../../../../apps/web/src/components/dashboard/DashboardWidgets";
import { dashboardWidgetRegistry } from "../../../../../apps/web/src/components/dashboard/widgetRegistry";
import { buildMilestone, buildProject, buildTask, buildTicket } from "../../../../fixtures/web/components/ui/factories";

const widgetData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../../../../../apps/web/src/hooks/useDashboards", () => ({
  useDashboardWidgetData(widget: { widgetId: string }) {
    return {
      data: widgetData.get(widget.widgetId),
      loading: false,
      error: null,
      reload: async () => undefined,
    };
  },
}));

vi.mock("../../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return {
      entries: [],
      workStatuses: [],
      featureStatuses: [],
      priorities: [],
      loading: false,
      error: null,
      reload: async () => undefined,
      createEntry: async () => undefined,
      updateEntry: async () => undefined,
      deleteEntry: async () => undefined,
    };
  },
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({
    tags: [],
    loading: false,
    error: null,
    reload: async () => undefined,
    createTag: async () => undefined,
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useCalendarTasks", () => ({
  useCalendarTasks: () => ({ tasks: [], loading: false }),
}));

vi.mock("../../../../../apps/web/src/hooks/useEvents", () => ({
  useEvents: () => ({ events: [], loading: false }),
}));

vi.mock("../../../../../apps/web/src/components/calendar/CalendarSkeleton", () => ({
  CalendarSkeleton: () => <div data-testid="calendar-skeleton" />,
}));

vi.mock("../../../../../apps/web/src/components/calendar/CalendarView", () => ({
  CalendarView: () => <div data-testid="calendar-view" />,
}));

vi.mock("../../../../../apps/web/src/components/calendar/UpcomingEvents", () => ({
  UpcomingEvents: () => <div data-testid="upcoming-events" />,
}));

interface NavigationCase {
  widgetId: Extract<DashboardWidgetId, "taskBoard" | "taskList" | "ticketBoard" | "ticketList" | "milestoneBoard" | "milestoneList" | "milestoneListView" | "projectBoard" | "projectList">;
  data: Task[] | Ticket[] | Milestone[] | Project[];
  itemLabel: string;
  expectedPath: string;
}

const navigationCases: NavigationCase[] = [
  {
    widgetId: "taskBoard",
    data: [buildTask({ id: 11, title: "Board Aufgabe" })],
    itemLabel: "Board Aufgabe",
    expectedPath: "/tasks/11",
  },
  {
    widgetId: "taskList",
    data: [buildTask({ id: 12, title: "Listen Aufgabe" })],
    itemLabel: "Listen Aufgabe",
    expectedPath: "/tasks/12",
  },
  {
    widgetId: "ticketBoard",
    data: [buildTicket({ id: 21, title: "Board Ticket" })],
    itemLabel: "Board Ticket",
    expectedPath: "/tickets/21",
  },
  {
    widgetId: "ticketList",
    data: [buildTicket({ id: 22, title: "Listen Ticket" })],
    itemLabel: "Listen Ticket",
    expectedPath: "/tickets/22",
  },
  {
    widgetId: "milestoneBoard",
    data: [buildMilestone({ id: 31, name: "Board Meilenstein" })],
    itemLabel: "Board Meilenstein",
    expectedPath: "/milestones/31",
  },
  {
    widgetId: "milestoneList",
    data: [buildMilestone({ id: 32, name: "Listen Meilenstein" })],
    itemLabel: "Listen Meilenstein",
    expectedPath: "/milestones/32",
  },
  {
    widgetId: "milestoneListView",
    data: [buildMilestone({ id: 33, name: "ListView Meilenstein" })],
    itemLabel: "ListView Meilenstein",
    expectedPath: "/milestones/33",
  },
  {
    widgetId: "projectBoard",
    data: [buildProject({ id: 41, name: "Board Projekt" })],
    itemLabel: "Board Projekt",
    expectedPath: "/projects/41",
  },
  {
    widgetId: "projectList",
    data: [buildProject({ id: 42, name: "Listen Projekt" })],
    itemLabel: "Listen Projekt",
    expectedPath: "/projects/42",
  },
];

function LocationProbe() {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get("returnTo") ?? "";

  return <div data-testid="location">{`${location.pathname}|${returnTo}`}</div>;
}

function renderWithRouter(widgetId: DashboardWidgetId, data: unknown): void {
  const widget: DashboardWidgetLayout = {
    widgetId,
    col: 0,
    row: 0,
    colSpan: 1,
    params: { limit: 10, sort: "updatedAt" },
  };

  widgetData.set(widgetId, data);

  render(
    <MemoryRouter initialEntries={["/projects/99?tab=overview"]}>
      <DashboardWidgetCard widget={widget} owner={{ type: "project", id: 99 }} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function findItemArticle(label: string): HTMLElement {
  const article = screen
    .getAllByText(label)
    .map((element) => element.closest("article"))
    .find((element): element is HTMLElement => element !== null);

  if (!article) {
    throw new Error(`No item article found for ${label}`);
  }
  return article;
}

afterEach(() => {
  cleanup();
  widgetData.clear();
});

describe("DashboardWidgetCard", () => {
  it.each(navigationCases)("$widgetId navigiert per Doppelklick zur Detailseite", ({ widgetId, data, itemLabel, expectedPath }) => {
    renderWithRouter(widgetId, data);

    fireEvent.doubleClick(findItemArticle(itemLabel));

    expect(screen.getByTestId("location")).toHaveTextContent(`${expectedPath}|/projects/99?tab=overview`);
  });

  it("trennt die bestehende Meilensteinkarte vom neuen Meilensteinlisten-Widget", () => {
    expect(dashboardWidgetRegistry.milestoneList.label).toBe("Meilensteinkarte");
    expect(dashboardWidgetRegistry.milestoneListView.label).toBe("Meilensteinliste");
  });
});
