// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - CalendarView rendert CalendarEvents über `owners` statt über direkte `projectId`-/`taskId`-Felder.
 * - Projekt-Owner können weiter für die Farblogik verwendet werden.
 *
 * Fehlerfälle:
 * - Ein Event ohne Legacy-Owner-Felder darf beim Rendern nicht fehlschlagen.
 *
 * Ziel:
 * Die Kalenderdarstellung gegen Rückfälle auf alte Event-DTO-Felder absichern.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent } from "@taskmanager/shared-types";
import { screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarView } from "../CalendarView";

vi.mock("@fullcalendar/react", () => ({
  default({ events }: { events: unknown[] }) {
    return <div data-testid="fullcalendar-events">{JSON.stringify(events)}</div>;
  }
}));

vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {} }));
vi.mock("@fullcalendar/core/locales/de", () => ({ default: {} }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CalendarView", () => {
  it("rendert Events mit Owner-DTO ohne direkte Owner-Felder", () => {
    const event: CalendarEvent = {
      id: 1,
      owners: [{ type: "project", id: 2 }],
      title: "Owner Termin",
      description: null,
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      isAllDay: false,
      color: null,
      version: 1,
      createdAt: "2026-05-19T08:00:00.000Z",
      updatedAt: "2026-05-19T08:00:00.000Z"
    };

    render(<CalendarView events={[event]} tasks={[]} onDateClick={vi.fn()} onEventClick={vi.fn()} onEventMove={vi.fn()} />);

    const payload = screen.getByTestId("fullcalendar-events").textContent ?? "";
    expect(payload).toContain("Owner Termin");
    expect(payload).toContain("var(--color-tangerine)");
    expect(payload).not.toContain("projectId");
    expect(payload).not.toContain("taskId");
  });
});
