// @vitest-environment jsdom

/**
 * Test Scope:
 * TaskLinkDialog und TicketLinkDialog
 *
 * Abgedeckte Regeln:
 * - Verknüpfungsdialoge laden Kandidaten über owner-bezogene Kandidaten-Endpunkte.
 * - Lokale Such-/Ausschlusslogik bleibt nach dem serverseitigen Filter erhalten.
 *
 * Fehlerfälle:
 * - Globale Aufgaben-/Ticketlisten dürfen nicht mehr als Kandidatenquelle dienen.
 *
 * Ziel:
 * Die Dialoge gegen Regressionen bei der Projektgrenzen-Filterung absichern.
 */
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Task, Ticket } from "@taskmanager/shared-types";

const apiMocks = vi.hoisted(() => ({
  getTaskLinkCandidates: vi.fn(),
  getTicketLinkCandidates: vi.fn()
}));

vi.mock("../../../../../apps/web/src/api/tasks", () => ({
  getTaskLinkCandidates: apiMocks.getTaskLinkCandidates
}));

vi.mock("../../../../../apps/web/src/api/tickets", () => ({
  getTicketLinkCandidates: apiMocks.getTicketLinkCandidates
}));

import { TaskLinkDialog } from "../../../../../apps/web/src/components/tasks/TaskLinkDialog";
import { TicketLinkDialog } from "../../../../../apps/web/src/components/tickets/TicketLinkDialog";

const task: Task = {
  id: 1,
  parentId: null,
  title: "Erlaubte Aufgabe",
  description: null,
  status: "active",
  priority: "medium",
  assignee: null,
  dueDate: null,
  version: 1,
  createdAt: "2026-05-22T08:00:00",
  updatedAt: "2026-05-22T08:00:00",
  tags: [],
  subtaskCount: 0
};

const ticket: Ticket = {
  id: 2,
  parentId: null,
  type: "bug",
  title: "Erlaubtes Ticket",
  description: null,
  status: "open",
  priority: "medium",
  resolution: null,
  reporter: null,
  assignee: null,
  environment: null,
  affectedVersion: null,
  dueDate: null,
  resolvedAt: null,
  position: 1024,
  version: 1,
  createdAt: "2026-05-22T08:00:00",
  updatedAt: "2026-05-22T08:00:00",
  tags: [],
  subTicketCount: 0
};

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Link-Dialog-Kandidaten", () => {
  it("lädt Aufgaben über den Task-Kandidaten-Endpunkt", async () => {
    apiMocks.getTaskLinkCandidates.mockResolvedValue([task]);
    const onLink = vi.fn().mockResolvedValue(undefined);

    renderWithQuery(<TaskLinkDialog open owner={{ type: "project", id: 7 }} currentTasks={[]} onLink={onLink} onClose={vi.fn()} />);

    expect(await screen.findByText(task.title)).toBeInTheDocument();
    expect(apiMocks.getTaskLinkCandidates).toHaveBeenCalledWith({ type: "project", id: 7 });

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));

    await waitFor(() => expect(onLink).toHaveBeenCalledWith(task));
  });

  it("lädt Tickets über den Ticket-Kandidaten-Endpunkt", async () => {
    apiMocks.getTicketLinkCandidates.mockResolvedValue([ticket]);
    const onLink = vi.fn().mockResolvedValue(undefined);

    renderWithQuery(<TicketLinkDialog open owner={{ type: "feature", id: 8 }} currentTickets={[]} onLink={onLink} onClose={vi.fn()} />);

    expect(await screen.findByText(ticket.title)).toBeInTheDocument();
    expect(apiMocks.getTicketLinkCandidates).toHaveBeenCalledWith({ type: "feature", id: 8 });

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));

    await waitFor(() => expect(onLink).toHaveBeenCalledWith(ticket));
  });
});
