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
 * - Event-Farbe überschreibt Kontextfarben; DayPlan-Owner werden erkannt.
 *
 * Fehlerfälle:
 * - Termine außerhalb der Woche werden nicht einsortiert.
 * - Runtime-Owner `day_plan` bleibt als defensiver Legacy-/Transportfall verständlich.
 *
 * Ziel:
 * Die Wochenkalender-Logik unabhängig von Drag-and-drop-Rendering absichern.
 */

import type { CalendarEvent, Project } from "@taskmanager/shared-types";
import { format, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { eventsByDay, moveEventToDate, resolveEventContext } from "../../../../../apps/web/src/components/calendar/WeekCalendar";

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
    const dayPlanContext = resolveEventContext(event({ owners: [{ type: "day_plan" as "dayPlan", id: 5 }], color: null }));

    expect(projectContext).toMatchObject({ label: "Projekt Beta", accentColor: "var(--color-magenta)", ownerType: "project" });
    expect(dayPlanContext).toMatchObject({ label: "Tagesplan", accentColor: "var(--color-teal)", ownerType: "dayPlan" });
  });
});
