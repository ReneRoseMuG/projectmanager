// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Kalender-Datums- und Kontextlogik mit echten DTO-Objekten.
 *
 * Mock-Entscheidung:
 * - Keine Mocks, weil die getesteten Hilfsfunktionen keine externen Abhängigkeiten benötigen.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Wochenansicht gruppiert Events nach ISO-Wochentagen.
 * - Drag-Zieldaten bewahren Uhrzeit und Dauer des Termins.
 * - Explizite Event-Farbe überschreibt Kontextfarben; neutrale Standardfarben lassen Kontextfarben greifen.
 * - Task-Kontext zeigt Titel, Assignee-Avatar und die semantische Aufgabenfarbe.
 * - Task-Kacheln nutzen Statusfarben, Dreizonendarstellung und Kalender-Sortierung.
 * - Monatsansicht ordnet fällige Tasks dem korrekten Datum zu.
 * - Feiertagslookup liefert nationale deutsche Feiertage.
 *
 * Fehlerfälle:
 * - Termine außerhalb der Woche werden nicht einsortiert.
 * - Runtime-Owner `day_plan` bleibt als defensiver Legacy-/Transportfall verständlich.
 *
 * Ziel:
 * Die Wochenkalender-Logik unabhängig von Drag-and-drop-Rendering absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent, Project, Task } from "@taskmanager/shared-types";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { format, parseISO } from "date-fns";
import { describe, expect, it, vi } from "vitest";
import { MonthCalendar } from "../../../../../apps/web/src/components/calendar/MonthCalendar";
import { CalendarWidgetView } from "../../../../../apps/web/src/components/calendar/CalendarWidgetView";
import { eventsByDay, moveEventToDate, resolveEventContext, WeekCalendar } from "../../../../../apps/web/src/components/calendar/WeekCalendar";
import { WeekEventTile } from "../../../../../apps/web/src/components/calendar/WeekEventTile";
import { WeekTaskTile } from "../../../../../apps/web/src/components/calendar/WeekTaskTile";
import { getGermanHolidaysForDate } from "../../../../../apps/web/src/lib/german-holidays";
import { resolveTaskStatusColor } from "../../../../../apps/web/src/lib/task-status-color";

vi.mock("../../../../../apps/web/src/components/ui/StatusPill", () => ({
  StatusPill({ value }: { value: string }) {
    return <span>{value}</span>;
  }
}));

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    owners: [],
    title: "Termin",
    description: null,
    startTime: "2026-05-27T10:00:00",
    endTime: "2026-05-27T11:00:00",
    isAllDay: false,
    color: null,
    reminderMinutes: 60,
    version: 1,
    createdAt: "2026-05-20T08:00:00",
    updatedAt: "2026-05-20T08:00:00",
    ...overrides
  };
}

function project(overrides: Partial<Project>): Project {
  return {
    id: 1,
    name: "Projekt Alpha",
    description: null,
    status: "active",
    color: "var(--color-fern)",
    startDate: null,
    dueDate: null,
    responsibleUserId: null,
    responsibleUser: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-20T08:00:00",
    updatedAt: "2026-05-20T08:00:00",
    milestoneCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: [],
    ...overrides
  };
}

function task(overrides: Partial<Task>): Task {
  return {
    id: 1,
    parentId: null,
    title: "Aufgabe",
    description: null,
    status: "todo",
    priority: "medium",
    responsibleUserId: null,
    responsibleUser: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-20T08:00:00",
    updatedAt: "2026-05-20T08:00:00",
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    visibleParent: null,
    ...overrides
  };
}

describe("WeekCalendar helpers", () => {
  it("gruppiert Termine in die ISO-Woche und schließt Folgewoche aus", () => {
    const grouped = eventsByDay(
      [
        event({ id: 1, title: "Mittwoch", startTime: "2026-05-27T10:00:00", endTime: "2026-05-27T11:00:00" }),
        event({ id: 2, title: "Monatsende", startTime: "2026-05-31T09:00:00", endTime: "2026-05-31T10:00:00" }),
        event({ id: 3, title: "Folgewoche", startTime: "2026-06-01T09:00:00", endTime: "2026-06-01T10:00:00" })
      ],
      parseISO("2026-05-25")
    );

    expect(grouped["2026-05-27"]?.map((item) => item.title)).toEqual(["Mittwoch"]);
    expect(grouped["2026-05-31"]?.map((item) => item.title)).toEqual(["Monatsende"]);
    expect(Object.values(grouped).flat().map((item) => item.title)).not.toContain("Folgewoche");
  });

  it("verschiebt Termine auf ein neues Datum und bewahrt Uhrzeit und Dauer", () => {
    const moved = moveEventToDate(event({ startTime: "2026-05-27T10:15:00", endTime: "2026-05-27T11:45:00" }), "2026-06-03");

    expect(format(parseISO(moved.startTime), "yyyy-MM-dd HH:mm")).toBe("2026-06-03 10:15");
    expect(format(parseISO(moved.endTime), "yyyy-MM-dd HH:mm")).toBe("2026-06-03 11:45");
  });

  it("priorisiert Statusfarben vor Event-Farben und erkennt DayPlan-Owner defensiv", () => {
    const projectContext = resolveEventContext(
      event({ owners: [{ type: "project", id: 2 }], color: "var(--color-magenta)" }),
      [project({ id: 2, name: "Projekt Beta", color: "var(--color-teal)" })]
    );
    const dayPlanContext = resolveEventContext(event({ owners: [{ type: "day_plan" as "dayPlan", id: 5 }], color: "#6366f1" }));

    expect(projectContext).toMatchObject({ label: "Projekt Beta", accentColor: "var(--color-teal)", ownerType: "project", status: "active" });
    expect(dayPlanContext).toMatchObject({ label: "Persönliche Planung", accentColor: "var(--color-teal)", ownerType: "dayPlan" });
  });

  it("löst Aufgaben- und Meilenstein-Kontext mit korrekten Design-Tokens auf", () => {
    const taskContext = resolveEventContext(
      event({ owners: [{ type: "task", id: 5 }], color: "var(--color-steel-700)" }),
      [],
      [],
      [task({ id: 5, title: "Design prüfen", responsibleUserId: 1, responsibleUser: { id: 1, name: "ada.lovelace", fullName: "Ada Lovelace", email: "ada@example.test" } })]
    );
    const milestoneContext = resolveEventContext(event({ owners: [{ type: "milestone", id: 9 }], color: null }), [], []);

    expect(taskContext).toMatchObject({
      label: "Design prüfen",
      accentColor: "var(--color-steel-400)",
      ownerType: "task",
      status: "todo",
      responsibleName: "Ada Lovelace"
    });
    expect(milestoneContext).toMatchObject({
      label: "Meilenstein #9",
      accentColor: "var(--color-violet)",
      ownerType: "milestone",
      responsibleName: null
    });
  });

  it("rendert Terminkarten mit Board-Card-Akzent, Domain-Icon, Status und Assignee-Avatar", () => {
    render(
      <WeekEventTile
        event={event({ id: 12, title: "Review" })}
        context={{
          label: "Design prüfen",
          accentColor: "var(--color-tangerine)",
          ownerType: "task",
          status: "in_review",
          responsibleName: "Ada Lovelace"
        }}
        timeLabel="09:00 - 10:00"
        overlay
      />
    );

    const tile = screen.getByTestId("week-event-12");
    expect(tile.getAttribute("style")).toContain("--event-accent: var(--color-tangerine)");
    expect(tile).toHaveTextContent("in_review");
    expect(tile).toHaveTextContent("09:00 - 10:00");
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("löst Task-Statusfarben und nationale Feiertage auf", () => {
    expect(resolveTaskStatusColor("in_progress")).toBe("var(--color-teal)");
    expect(resolveTaskStatusColor("active")).toBe("var(--color-teal)");
    expect(resolveTaskStatusColor("completed")).toBe("var(--color-fern)");
    expect(resolveTaskStatusColor("unknown")).toBe("var(--color-steel-400)");
    expect(getGermanHolidaysForDate("2026-05-01")).toContain("Maifeiertag");
  });

  it("hebt Feiertags-Spalten rot und den heutigen Spaltenkopf dunkel hervor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T10:00:00"));

    try {
      render(<WeekCalendar events={[]} tasks={[]} initialDate="2026-05-25" />);

      expect(screen.getByTestId("week-day-2026-05-25")).toHaveClass("calendar-holiday-column");
      expect(screen.getByTestId("week-day-2026-05-25")).toHaveStyle({ backgroundColor: "color-mix(in srgb, var(--color-crimson) 14%, var(--color-white))" });
      expect(within(screen.getByTestId("week-day-2026-05-25")).getByText("Mo 25. Mai")).toBeInTheDocument();
      expect(within(screen.getByTestId("week-day-2026-05-25")).getByText("Pfingstmontag")).toBeInTheDocument();
      expect(screen.getByTestId("week-day-2026-05-25").querySelector("header")).not.toHaveClass("border-crimson");
      expect(screen.getByTestId("week-day-2026-05-31").querySelector("header")).toHaveClass("bg-steel-700");
    } finally {
      vi.useRealTimers();
    }
  });

  it("startet Create nur über den Plus-Button und nicht über die Tagesspalte", () => {
    const onDateClick = vi.fn();
    render(<WeekCalendar events={[]} tasks={[]} initialDate="2026-05-25" onDateClick={onDateClick} />);

    fireEvent.click(screen.getByTestId("week-day-2026-05-25"));
    expect(onDateClick).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByTestId("week-day-2026-05-25")).getByRole("button", { name: "Termin anlegen" }));
    expect(onDateClick).toHaveBeenCalledWith("2026-05-25");
  });

  it("hebt Feiertage im Monatskalender sichtbar rot hervor", () => {
    render(<MonthCalendar tasks={[]} initialDate="2026-05-01" />);
    expect(screen.getByTestId("month-day-2026-05-01")).toHaveClass("calendar-holiday-cell", "border-line");
    expect(screen.getByTestId("month-day-2026-05-01")).toHaveStyle({ backgroundColor: "color-mix(in srgb, var(--color-crimson) 14%, var(--color-white))" });
    expect(within(screen.getByTestId("month-day-2026-05-01")).getByText("Maifeiertag")).toBeInTheDocument();
  });

  it("rendert Task-Wochenkacheln im Board-Card-Stil ohne Datumsfooter", () => {
    const onClick = vi.fn();
    render(<WeekTaskTile task={task({ id: 21, title: "Kalender portieren", status: "in_review", dueDate: "2026-05-27" })} overlay onClick={onClick} />);

    const tile = screen.getByTestId("week-task-21");
    expect(tile.getAttribute("style")).toContain("--task-accent: var(--color-tangerine)");
    expect(tile).toHaveTextContent("Aufgabe");
    expect(tile).toHaveTextContent("in_review");
    expect(tile).toHaveTextContent("Kalender portieren");
    expect(tile).not.toHaveTextContent("Fällig 27.05.26");

    fireEvent.click(tile);
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 21 }));
  });

  it("sortiert fällige Tasks in der Woche nach Statuspriorität", () => {
    render(
      <WeekCalendar
        events={[]}
        tasks={[
          task({ id: 1, title: "Später erledigt", status: "done", dueDate: "2026-05-27" }),
          task({ id: 2, title: "Jetzt bauen", status: "in_progress", dueDate: "2026-05-27" }),
          task({ id: 3, title: "Review prüfen", status: "in_review", dueDate: "2026-05-27" })
        ]}
        initialDate="2026-05-27"
      />
    );

    const column = screen.getByTestId("week-day-2026-05-27");
    expect(within(column).getAllByTestId(/week-task-/).map((item) => item.textContent)).toEqual([
      expect.stringContaining("Jetzt bauen"),
      expect.stringContaining("Review prüfen"),
      expect.stringContaining("Später erledigt")
    ]);
  });

  it("ordnet Tasks im Monatskalender dem Due-Date zu und öffnet sie per Klick", () => {
    const onTaskClick = vi.fn();
    render(
      <MonthCalendar
        tasks={[
          task({ id: 31, title: "Monatsbalken", status: "open", dueDate: "2026-05-12" }),
          task({ id: 32, title: "Ohne Datum", status: "todo", dueDate: null })
        ]}
        initialDate="2026-05-15"
        onTaskClick={onTaskClick}
      />
    );

    const day = screen.getByTestId("month-day-2026-05-12");
    expect(within(day).getByTestId("month-task-31")).toHaveTextContent("Monatsbalken");
    expect(screen.queryByText("Ohne Datum")).not.toBeInTheDocument();

    fireEvent.click(within(day).getByTestId("month-task-31"));
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 31 }));
  });

  it("rendert Termine im Monatskalender nach Startdatum", () => {
    const onEventClick = vi.fn();
    render(
      <MonthCalendar
        events={[event({ id: 41, title: "Monatstermin", startTime: "2026-05-12T08:00:00", endTime: "2026-05-12T09:00:00" })]}
        tasks={[]}
        initialDate="2026-05-15"
        onEventClick={onEventClick}
      />
    );

    fireEvent.click(within(screen.getByTestId("month-day-2026-05-12")).getByTestId("month-event-41"));

    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: 41 }));
  });

  it("nutzt eine zentrale Kalenderkomponente für Woche und Monat ohne Datenverlust", () => {
    render(
      <CalendarWidgetView
        events={[event({ id: 51, title: "Zentraler Termin", startTime: "2026-05-27T08:00:00", endTime: "2026-05-27T09:00:00" })]}
        tasks={[task({ id: 52, title: "Zentrale Aufgabe", status: "todo", dueDate: "2026-05-27" })]}
        initialDate="2026-05-27"
        initialView="week"
        mode="interactive"
        onDateClick={vi.fn()}
      />
    );

    expect(screen.getByTestId("calendar-widget-view")).toHaveTextContent("Zentraler Termin");
    expect(screen.getAllByRole("button", { name: "Termin anlegen" }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Monat" }));

    expect(screen.getByTestId("calendar-widget-view")).toHaveTextContent("Zentraler Termin");
    expect(screen.getByTestId("calendar-widget-view")).toHaveTextContent("Zentrale Aufgabe");
  });

  it("blendet Create-Aktionen in der zentralen Read-only-Variante aus", () => {
    render(
      <CalendarWidgetView
        events={[event({ id: 61, title: "Nur Lesen", startTime: "2026-05-27T08:00:00", endTime: "2026-05-27T09:00:00" })]}
        tasks={[]}
        initialDate="2026-05-27"
        initialView="week"
        mode="readonly"
        onDateClick={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Termin anlegen" })).not.toBeInTheDocument();
    expect(screen.getByTestId("calendar-widget-view")).toHaveTextContent("Nur Lesen");
  });

  it("rendert keine Kalender-Footer-Zähler unter dem Widget", () => {
    render(
      <CalendarWidgetView
        events={[]}
        tasks={[]}
        initialDate="2026-05-27"
        initialView="week"
        mode="readonly"
      />
    );

    expect(screen.queryByText("0 Termine")).not.toBeInTheDocument();
    expect(screen.queryByText("0 fällige Aufgaben")).not.toBeInTheDocument();
  });
});
