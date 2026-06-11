// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte React-Hooks (useDayPlanTasks/useDayPlanEvents) mit echtem QueryClient; nur die ky-API-Schicht ist ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks: die api/day-plans-Funktionen (Netzwerk als externer Seiteneffekt). Hooks, QueryClient und Invalidierung laufen real.
 *
 * Isolation:
 * - jsdom ohne Netzwerk; eigener QueryClient pro Render.
 *
 * Abgedeckte Regeln:
 * - useDayPlanTasks lädt die datumsübergreifende Aufgabenliste über listDayPlanTasks.
 * - useDayPlanEvents lädt die datumsübergreifenden Termine über listDayPlanEvents.
 * - unlinkTask ruft die datumsunabhängige API und invalidiert den dayPlans-Scope (Refetch der Liste).
 *
 * Fehlerfälle:
 * - Gegenbeispiel: eine Query außerhalb des dayPlan-Scopes (tickets) wird nicht mit-invalidiert.
 *
 * Ziel:
 * Den datumsunabhängigen Persönliche-Planung-Datenfluss inkl. Invalidierung absichern.
 */

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dayPlanApi from "../../../../apps/web/src/api/day-plans";
import { useDayPlanEvents, useDayPlanTasks } from "../../../../apps/web/src/hooks/useDayPlan";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

vi.mock("../../../../apps/web/src/api/day-plans", () => ({
  getDayPlan: vi.fn(),
  updateDayPlan: vi.fn(),
  createDayPlanTask: vi.fn(),
  linkDayPlanTask: vi.fn(),
  unlinkDayPlanTask: vi.fn(),
  createDayPlanEvent: vi.fn(),
  linkDayPlanEvent: vi.fn(),
  unlinkDayPlanEvent: vi.fn(),
  updateDayPlanTask: vi.fn(),
  listDayPlanTasks: vi.fn(),
  listDayPlanEvents: vi.fn(),
  unlinkDayPlanTaskAnyDate: vi.fn(),
}));

const listTasksMock = vi.mocked(dayPlanApi.listDayPlanTasks);
const listEventsMock = vi.mocked(dayPlanApi.listDayPlanEvents);
const unlinkAnyDateMock = vi.mocked(dayPlanApi.unlinkDayPlanTaskAnyDate);
const ticketsQueryFn = vi.fn();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

function Harness() {
  const dayPlanTasks = useDayPlanTasks();
  const dayPlanEvents = useDayPlanEvents();
  // Gegenbeispiel-Query außerhalb des dayPlan-Scopes; darf bei unlink nicht invalidiert werden.
  const tickets = useQuery({ queryKey: queryKeys.tickets.list(), queryFn: ticketsQueryFn });

  return (
    <div>
      <span data-testid="task-count">{dayPlanTasks.tasks.length}</span>
      <span data-testid="event-count">{dayPlanEvents.events.length}</span>
      <span data-testid="tickets">{String(tickets.data ?? "")}</span>
      <button type="button" onClick={() => void dayPlanTasks.unlinkTask(5)}>
        unlink
      </button>
    </div>
  );
}

beforeEach(() => {
  listTasksMock.mockResolvedValue([{ id: 5 }] as never);
  listEventsMock.mockResolvedValue([{ id: 9 }] as never);
  unlinkAnyDateMock.mockResolvedValue(undefined as never);
  ticketsQueryFn.mockResolvedValue("ok");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useDayPlanTasks / useDayPlanEvents", () => {
  it("lädt datumsübergreifende Aufgaben und Termine über die dedizierten Endpunkte", async () => {
    render(
      <Wrapper>
        <Harness />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("task-count")).toHaveTextContent("1");
      expect(screen.getByTestId("event-count")).toHaveTextContent("1");
    });
    expect(listTasksMock).toHaveBeenCalledTimes(1);
    expect(listEventsMock).toHaveBeenCalledTimes(1);
  });

  it("löst datumsunabhängig und invalidiert den dayPlan-Scope, nicht aber fremde Queries", async () => {
    render(
      <Wrapper>
        <Harness />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("tickets")).toHaveTextContent("ok"));
    expect(listTasksMock).toHaveBeenCalledTimes(1);
    expect(ticketsQueryFn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "unlink" }));

    await waitFor(() => expect(unlinkAnyDateMock).toHaveBeenCalledWith(5));
    // Invalidierung des dayPlan-Scopes → Aufgabenliste wird neu geladen.
    await waitFor(() => expect(listTasksMock.mock.calls.length).toBeGreaterThanOrEqual(2));
    // Gegenbeispiel: tickets-Query liegt außerhalb des Scopes und wird nicht neu geladen.
    expect(ticketsQueryFn).toHaveBeenCalledTimes(1);
  });
});
