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
import { render, screen } from "@testing-library/react";
import { format, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { eventsByDay, moveEventToDate, resolveEventContext } from "../../../../../apps/web/src/components/calendar/WeekCalendar";
import { WeekEventTile } from "../../../../../apps/web/src/components/calendar/WeekEventTile";

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
    assignee: null,
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

  it("priorisiert Event-Farbe vor Kontextfarbe und erkennt DayPlan-Owner defensiv", () => {
    const projectContext = resolveEventContext(
      event({ owners: [{ type: "project", id: 2 }], color: "var(--color-magenta)" }),
      [project({ id: 2, name: "Projekt Beta", color: "var(--color-teal)" })]
    );
    const dayPlanContext = resolveEventContext(event({ owners: [{ type: "day_plan" as "dayPlan", id: 5 }], color: "#6366f1" }));

    expect(projectContext).toMatchObject({ label: "Projekt Beta", accentColor: "var(--color-magenta)", ownerType: "project" });
    expect(dayPlanContext).toMatchObject({ label: "Tagesplan", accentColor: "var(--color-teal)", ownerType: "dayPlan" });
  });

  it("löst Aufgaben- und Meilenstein-Kontext mit korrekten Design-Tokens auf", () => {
    const taskContext = resolveEventContext(
      event({ owners: [{ type: "task", id: 5 }], color: "var(--color-steel-700)" }),
      [],
      [],
      [task({ id: 5, title: "Design prüfen", assignee: "Ada Lovelace" })]
    );
    const milestoneContext = resolveEventContext(event({ owners: [{ type: "milestone", id: 9 }], color: null }), [], []);

    expect(taskContext).toMatchObject({
      label: "Design prüfen",
      accentColor: "var(--color-tangerine)",
      ownerType: "task",
      assignee: "Ada Lovelace"
    });
    expect(milestoneContext).toMatchObject({
      label: "Meilenstein #9",
      accentColor: "var(--color-violet)",
      ownerType: "milestone",
      assignee: null
    });
  });

  it("rendert Wochenkacheln mit Akzentrand, Tint und Assignee-Avatar", () => {
    render(
      <WeekEventTile
        event={event({ id: 12, title: "Review" })}
        context={{
          label: "Design prüfen",
          accentColor: "var(--color-tangerine)",
          ownerType: "task",
          assignee: "Ada Lovelace"
        }}
        timeLabel="09:00 - 10:00"
        overlay
      />
    );

    const tile = screen.getByTestId("week-event-12");
    expect(tile.getAttribute("style")).toContain("border-left: 4px solid var(--color-tangerine)");
    expect(tile.getAttribute("style")).toContain("background-color: color-mix(in srgb, var(--color-tangerine) 10%, var(--color-white))");
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
