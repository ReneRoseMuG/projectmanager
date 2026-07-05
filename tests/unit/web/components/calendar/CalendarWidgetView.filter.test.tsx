// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (Frontend-Komponente)
 *
 * Realitätsgrad:
 * - Echte CalendarWidgetView + WeekCalendar in einem echten DndContext.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; nur Testdaten.
 *
 * Isolation:
 * - jsdom, fester Bezugstag im sichtbaren Zeitraum.
 *
 * Abgedeckte Regeln:
 * - Herkunftsfilter erscheint nur bei mehreren Herkünften
 * - Auswahl einer Herkunft blendet fremde Termine aus (Gegenbeispiel: lokaler bleibt)
 *
 * Ziel:
 * Absicherung des Quellkalender-/Herkunftsfilters in der Kalenderansicht.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent } from "@taskmanager/shared-types";
import { DndContext } from "@dnd-kit/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CalendarWidgetView } from "../../../../../apps/web/src/components/calendar/CalendarWidgetView";

function makeEvent(id: number, origin: CalendarEvent["origin"], title: string): CalendarEvent {
  return {
    id,
    owners: [],
    title,
    description: null,
    startTime: "2026-07-01T10:00:00",
    endTime: "2026-07-01T11:00:00",
    isAllDay: false,
    color: null,
    reminderMinutes: 60,
    responsibleUserId: null,
    responsibleUser: null,
    version: 1,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    origin,
    readonly: origin !== "local"
  };
}

function renderView(events: CalendarEvent[]): void {
  render(
    <DndContext>
      <CalendarWidgetView events={events} tasks={[]} initialDate="2026-07-01" initialView="week" />
    </DndContext>
  );
}

afterEach(() => cleanup());

describe("CalendarWidgetView Herkunftsfilter (AP-1.4)", () => {
  it("zeigt den Herkunftsfilter, wenn importierte Termine vorhanden sind", () => {
    renderView([makeEvent(1, "local", "Lokal-Termin"), makeEvent(2, "nextcloud", "NC-Termin")]);
    expect(screen.getByTestId("calendar-origin-filter")).toBeInTheDocument();
  });

  it("blendet den Filter aus, wenn nur lokale Termine vorhanden sind", () => {
    renderView([makeEvent(1, "local", "Lokal-Termin")]);
    expect(screen.queryByTestId("calendar-origin-filter")).not.toBeInTheDocument();
  });

  it("filtert die angezeigten Termine nach Herkunft", () => {
    renderView([makeEvent(1, "local", "Lokal-Termin"), makeEvent(2, "nextcloud", "NC-Termin")]);
    expect(screen.getByTestId("week-event-1")).toBeInTheDocument();
    expect(screen.getByTestId("week-event-2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Lokal"));

    expect(screen.getByTestId("week-event-1")).toBeInTheDocument();
    expect(screen.queryByTestId("week-event-2")).not.toBeInTheDocument();
  });
});
