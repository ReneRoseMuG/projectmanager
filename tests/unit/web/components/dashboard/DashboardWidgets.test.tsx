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
 * - Kommentar-Widgets verlinken auch Wiki-, Backlog- und DayPlan-Träger korrekt.
 * - noteList rendert persönliche Notizen read-only mit Vorschau.
 * - Das neue Milestone-Listenwidget ist als „Meilensteinliste“ im Widget-Katalog benannt.
 *
 * Fehlerfälle:
 * - Read-only Widget-Karten mit No-op onOpen oder falscher Detailroute.
 *
 * Ziel:
 * Die Dashboard-Widget-Verdrahtung gegen verlorene Detailnavigation absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent, DashboardContext, DashboardOwner, DashboardWidgetId, DashboardWidgetLayout, Milestone, Note, Project, RecentComment, Task, Ticket } from "@taskmanager/shared-types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardWidgetCard } from "../../../../../apps/web/src/components/dashboard/DashboardWidgets";
import { dashboardWidgetRegistry } from "../../../../../apps/web/src/components/dashboard/widgetRegistry";
import { buildMilestone, buildProject, buildTask, buildTicket } from "../../../../fixtures/web/components/ui/factories";

const widgetData = vi.hoisted(() => new Map<string, unknown>());
const calendarEvents = vi.hoisted(() => ({ value: [] as CalendarEvent[] }));
const permissions = vi.hoisted(() => new Map<string, boolean>());
const createNoteMock = vi.hoisted(() => vi.fn());

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

vi.mock("../../../../../apps/web/src/hooks/useDayPlan", () => ({
  useDayPlan: () => ({
    createTask: vi.fn(),
    createEvent: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useNotes", () => ({
  useNotes: () => ({
    createNote: createNoteMock,
    updateNote: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useEntityComments", () => ({
  useEntityComments: () => ({
    createComment: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
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
  useHasPermission: (resource: string, action: string) => permissions.get(`${resource}:${action}`) ?? true,
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

vi.mock("../../../../../apps/web/src/components/calendar/CalendarDashboardProvider", () => ({
  useOptionalCalendarDashboard: () => ({
    events: [],
    tasks: [],
    projects: [],
    milestones: [],
    loading: false,
    error: null,
    canWriteEvents: true,
    canWriteTasks: true,
    openCreate: vi.fn(),
    openEvent: vi.fn(),
    openTask: vi.fn(),
    moveEvent: vi.fn(),
    moveTask: vi.fn(),
  }),
}));

vi.mock("../../../../../apps/web/src/hooks/useEvents", () => ({
  useEvents: () => ({ events: calendarEvents.value, loading: false }),
}));

vi.mock("../../../../../apps/web/src/components/calendar/CalendarSkeleton", () => ({
  CalendarSkeleton: () => <div data-testid="calendar-skeleton" />,
}));

vi.mock("../../../../../apps/web/src/components/calendar/CalendarWidgetView", () => ({
  CalendarWidgetView: ({ events, mode, compact }: { events: CalendarEvent[]; mode: string; compact?: boolean }) => (
    <div data-testid="calendar-widget-view" data-mode={mode} data-compact={compact ? "true" : "false"}>
      {events.map((event) => (
        <span key={event.id}>{event.title}</span>
      ))}
    </div>
  ),
}));

vi.mock("../../../../../apps/web/src/components/calendar/UpcomingEvents", () => ({
  UpcomingEvents: () => <div data-testid="upcoming-events" />,
}));

vi.mock("../../../../../apps/web/src/components/tasks/TaskForm", () => ({
  TaskForm: ({ open }: { open: boolean }) => (open ? <div role="dialog" data-testid="task-form" /> : null),
}));

vi.mock("../../../../../apps/web/src/components/calendar/EventForm", () => ({
  EventForm: ({ open }: { open: boolean }) => (open ? <div role="dialog" data-testid="event-form" /> : null),
}));

vi.mock("../../../../../apps/web/src/components/notes/NoteEditor", () => ({
  NoteEditor: ({ open }: { open: boolean }) => (open ? <div role="dialog" data-testid="note-editor" /> : null),
}));

vi.mock("../../../../../apps/web/src/components/ui/CommentBodyModal", () => ({
  CommentBodyModal: ({ open }: { open: boolean }) => (open ? <div role="dialog" data-testid="comment-modal" /> : null),
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

interface RenderOptions {
  context?: DashboardContext;
  owner?: DashboardOwner;
  dayPlanDate?: string;
}

function renderWithRouter(widgetId: DashboardWidgetId, data: unknown, options: RenderOptions = {}): void {
  const widget: DashboardWidgetLayout = {
    widgetId,
    col: 0,
    row: 0,
    colSpan: 1,
    params: { limit: 10, sort: "updatedAt" },
  };

  widgetData.set(widgetId, data);
  const owner = options.owner ?? { type: "project", id: 99 };

  render(
    <MemoryRouter initialEntries={["/projects/99?tab=overview"]}>
      <DashboardWidgetCard widget={widget} owner={owner} context={options.context} dayPlanDate={options.dayPlanDate} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function buildCalendarEvent(id: number, title: string, owners: CalendarEvent["owners"]): CalendarEvent {
  return {
    id,
    title,
    owners,
    description: null,
    startTime: "2026-05-31T08:00:00.000Z",
    endTime: "2026-05-31T09:00:00.000Z",
    isAllDay: false,
    color: null,
    reminderMinutes: 0,
    responsibleUserId: null,
    responsibleUser: null,
    version: 1,
    createdAt: "2026-05-30T08:00:00.000Z",
    updatedAt: "2026-05-30T08:00:00.000Z",
  };
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
  calendarEvents.value = [];
  permissions.clear();
  createNoteMock.mockReset();
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

  it("rendert das Kalender-Widget im Kalender-Kontext über die zentrale Kalenderkomponente", () => {
    renderWithRouter("calendar", undefined, { context: "calendar" });

    expect(screen.getByTestId("calendar-widget-view")).toHaveAttribute("data-mode", "interactive");
    expect(screen.getByTestId("calendar-widget-view")).toHaveAttribute("data-compact", "false");
  });

  it("filtert das Kalender-Widget im DayPlan-Kalender strikt auf Termine des DayPlan-Kontexts", () => {
    calendarEvents.value = [
      buildCalendarEvent(1, "Persönlicher Termin", [{ type: "dayPlan", id: 7 }]),
      buildCalendarEvent(2, "Globaler Termin", [{ type: "project", id: 99 }]),
      buildCalendarEvent(3, "Anderer Tagesplan", [{ type: "dayPlan", id: 8 }]),
    ];

    renderWithRouter("calendar", undefined, {
      context: "dayPlanCalendar",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    expect(screen.getByTestId("calendar-widget-view")).toHaveAttribute("data-mode", "interactive");
    expect(screen.getByTestId("calendar-widget-view")).toHaveAttribute("data-compact", "true");
    expect(screen.getByTestId("calendar-widget-view")).toHaveTextContent("Persönlicher Termin");
    expect(screen.getByTestId("calendar-widget-view")).not.toHaveTextContent("Globaler Termin");
    expect(screen.getByTestId("calendar-widget-view")).not.toHaveTextContent("Anderer Tagesplan");
  });

  it("rendert noteList als read-only Notizvorschau", () => {
    const notes: Note[] = [
      {
        id: 1,
        title: "Fokus",
        contentJson: { markdown: "**Heute** Review abschließen" },
        version: 1,
        createdAt: "2026-05-28T06:00:00.000Z",
        updatedAt: "2026-05-28T07:00:00.000Z",
      },
    ];

    renderWithRouter("noteList", notes);

    expect(screen.getByText("Fokus")).toBeInTheDocument();
    expect(screen.getByText("Heute Review abschließen")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*Heute\*\*/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fokus/i })).not.toBeInTheDocument();
  });

  it("verlinkt Wiki-, Backlog- und DayPlan-Kommentare zur passenden Detailseite", () => {
    const comments: RecentComment[] = [
      {
        id: 1,
        body: "Wiki-Kommentar",
        createdAt: "2026-05-27T06:00:00.000Z",
        updatedAt: "2026-05-27T06:05:00.000Z",
        authorName: "Admin",
        entityType: "wikiPage",
        entityId: 51,
        entityLabel: "Wiki Seite"
      },
      {
        id: 2,
        body: "Backlog-Kommentar",
        createdAt: "2026-05-27T06:00:00.000Z",
        updatedAt: "2026-05-27T06:05:00.000Z",
        authorName: "Admin",
        entityType: "backlogItem",
        entityId: 61,
        entityLabel: "Backlog Eintrag"
      },
      {
        id: 3,
        body: "Planungs-Kommentar",
        createdAt: "2026-05-27T06:00:00.000Z",
        updatedAt: "2026-05-27T06:05:00.000Z",
        authorName: "Admin",
        entityType: "dayPlan",
        entityId: 71,
        entityLabel: "Persönliche Planung 2026-05-27"
      }
    ];

    renderWithRouter("commentJournal", comments);

    expect(screen.getByText("Wiki Seite").closest("a")).toHaveAttribute("href", "/wiki/51");
    expect(screen.getByText("Backlog Eintrag").closest("a")).toHaveAttribute("href", "/backlog/61");
    expect(screen.getByText("Persönliche Planung 2026-05-27").closest("a")).toHaveAttribute("href", "/day-plan");
  });

  it("rendert Kommentarvorschauen ohne rohe HTML-Tags", () => {
    const comments: RecentComment[] = [
      {
        id: 4,
        body: "<p><strong>HTML</strong> Kommentar</p>",
        createdAt: "2026-05-27T06:00:00.000Z",
        updatedAt: "2026-05-27T06:05:00.000Z",
        authorName: "Admin",
        entityType: "task",
        entityId: 81,
        entityLabel: "Aufgabe"
      }
    ];

    renderWithRouter("commentJournal", comments);

    expect(screen.getByText("HTML Kommentar")).toBeInTheDocument();
    expect(screen.queryByText(/<p>|<\/p>|<strong>/)).not.toBeInTheDocument();
  });

  it("rendert Kommentarvorschauen ohne rohe Markdown-Marker", () => {
    const comments: RecentComment[] = [
      {
        id: 5,
        body: "**Fetter** Kommentar",
        createdAt: "2026-05-27T06:00:00.000Z",
        updatedAt: "2026-05-27T06:05:00.000Z",
        authorName: "Admin",
        entityType: "task",
        entityId: 81,
        entityLabel: "Aufgabe"
      }
    ];

    renderWithRouter("commentJournal", comments);

    expect(screen.getByText("Fetter Kommentar")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*Fetter\*\*/)).not.toBeInTheDocument();
  });

  it("öffnet im DayPlan-Kontext den Aufgaben-Create-Dialog aus dem Widget-Header", () => {
    renderWithRouter("taskList", [], {
      context: "dayPlan",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    fireEvent.click(screen.getByRole("button", { name: "Aufgabenliste: neu anlegen" }));

    expect(screen.getByTestId("task-form")).toBeInTheDocument();
  });

  it("öffnet im DayPlan-Kontext den Kommentar-Create-Dialog aus dem Widget-Header", () => {
    renderWithRouter("commentJournal", [], {
      context: "dayPlan",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    fireEvent.click(screen.getByRole("button", { name: "Kommentare: neu anlegen" }));

    expect(screen.getByTestId("comment-modal")).toBeInTheDocument();
  });

  it("öffnet im DayPlan-Kontext den Termin-Create-Dialog aus dem Widget-Header", () => {
    renderWithRouter("upcomingEvents", undefined, {
      context: "dayPlan",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    fireEvent.click(screen.getByRole("button", { name: "Nächste Termine: neu anlegen" }));

    expect(screen.getByTestId("event-form")).toBeInTheDocument();
  });

  it("legt im DayPlan-Kontext eine Notiz an und öffnet den Editor", async () => {
    createNoteMock.mockResolvedValue({
      id: 9,
      title: "Neue Notiz",
      contentJson: {},
      version: 1,
      createdAt: "2026-05-31T08:00:00.000Z",
      updatedAt: "2026-05-31T08:00:00.000Z",
    });

    renderWithRouter("noteList", [], {
      context: "dayPlan",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    fireEvent.click(screen.getByRole("button", { name: "Notizen: neu anlegen" }));

    await waitFor(() => expect(screen.getByTestId("note-editor")).toBeInTheDocument());
    expect(createNoteMock).toHaveBeenCalledWith({ title: "Neue Notiz", contentJson: {} });
  });

  it("blendet Widget-Create-Aktionen außerhalb des DayPlan-Kontexts und ohne Berechtigung aus", () => {
    renderWithRouter("upcomingEvents", undefined, {
      context: "project",
      owner: { type: "project", id: 99 },
      dayPlanDate: "2026-05-31",
    });

    expect(screen.queryByRole("button", { name: "Nächste Termine: neu anlegen" })).not.toBeInTheDocument();

    cleanup();
    widgetData.clear();
    permissions.set("events:write", false);

    renderWithRouter("upcomingEvents", undefined, {
      context: "dayPlan",
      owner: { type: "dayPlan", id: 7 },
      dayPlanDate: "2026-05-31",
    });

    expect(screen.queryByRole("button", { name: "Nächste Termine: neu anlegen" })).not.toBeInTheDocument();
  });
});
