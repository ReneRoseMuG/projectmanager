// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (Frontend-Komponente)
 *
 * Realitätsgrad:
 * - Echte WeekEventTile-Komponente in einem echten DndContext.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; nur Testdaten.
 *
 * Isolation:
 * - jsdom, keine DB/kein Netz.
 *
 * Abgedeckte Regeln:
 * - Importierte Termine (origin != local) tragen ein Herkunfts-Badge (NextCloud/Google)
 * - Lokale Termine tragen kein Herkunfts-Badge
 *
 * Ziel:
 * Absicherung der optischen Unterscheidbarkeit importierter Kalender-Termine.
 */

import "@testing-library/jest-dom/vitest";
import type { CalendarEvent } from "@taskmanager/shared-types";
import { DndContext } from "@dnd-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WeekEventTile, type EventContext } from "../../../../../apps/web/src/components/calendar/WeekEventTile";

const context: EventContext = { label: "Projekt X", accentColor: "#123456", ownerType: "project", status: null, responsibleName: null };

function makeEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 1,
    owners: [],
    title: "Termin",
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
    origin: "local",
    readonly: false,
    ...overrides
  };
}

function renderTile(event: CalendarEvent): void {
  render(
    <DndContext>
      <WeekEventTile event={event} context={context} timeLabel="10:00 – 11:00" />
    </DndContext>
  );
}

afterEach(() => cleanup());

describe("WeekEventTile Herkunftsmarkierung (AP-1.4)", () => {
  it("zeigt ein NextCloud-Badge für importierte NextCloud-Termine", () => {
    renderTile(makeEvent({ origin: "nextcloud", readonly: true }));
    expect(screen.getByText("NextCloud")).toBeInTheDocument();
  });

  it("zeigt ein Google-Badge für importierte Google-Termine", () => {
    renderTile(makeEvent({ origin: "google", readonly: true }));
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("zeigt kein Herkunfts-Badge für lokale Termine", () => {
    renderTile(makeEvent({ origin: "local", readonly: false }));
    expect(screen.queryByText("NextCloud")).not.toBeInTheDocument();
    expect(screen.queryByText("Google")).not.toBeInTheDocument();
  });
});
