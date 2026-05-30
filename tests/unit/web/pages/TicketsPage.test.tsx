// @vitest-environment jsdom

/**
 * Test Scope:
 * TicketsPage
 *
 * Abgedeckte Regeln:
 * - Ohne Projekt- oder Meilensteinfilter lädt die Hauptansicht die globale Ticketliste.
 * - Mit Meilensteinfilter lädt die Hauptansicht den passenden Owner-Scope.
 * - Ein Projektfilter ersetzt den Meilensteinfilter in der URL.
 *
 * Fehlerfälle:
 * - Der globale Ticket-Hook darf nicht versehentlich deaktiviert werden.
 *
 * Ziel:
 * Die neue Hauptansicht für Tickets gegen Regressionsfehler bei Filter- und Owner-Auswahl absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { Milestone, Project } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hookMocks = vi.hoisted(() => ({
  useTickets: vi.fn(),
  useProjects: vi.fn(),
  useMilestones: vi.fn(),
  useStandaloneView: vi.fn(),
  useViewMode: vi.fn(),
  showToast: vi.fn(),
  confirm: vi.fn()
}));

vi.mock("../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets: hookMocks.useTickets
}));

vi.mock("../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects: hookMocks.useProjects
}));

vi.mock("../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones: hookMocks.useMilestones
}));

vi.mock("../../../../apps/web/src/hooks/useStandaloneView", () => ({
  useStandaloneView: hookMocks.useStandaloneView
}));

vi.mock("../../../../apps/web/src/hooks/useViewMode", () => ({
  useViewMode: hookMocks.useViewMode
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: hookMocks.showToast })
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: hookMocks.confirm })
}));

vi.mock("../../../../apps/web/src/components/tickets/TicketListBoardView", () => ({
  TicketListBoardView: ({ filters }: { filters?: ReactNode }) => (
    <div data-testid="ticket-board">{filters}</div>
  )
}));

import { TicketsPage } from "../../../../apps/web/src/pages/TicketsPage";

const projects: Project[] = [
  {
    id: 1,
    name: "Alpha",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    milestoneCount: 1,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  }
];

const milestones: Milestone[] = [
  {
    id: 10,
    projectId: 1,
    name: "Alpha M1",
    description: null,
    status: "active",
    color: null,
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: "2026-05-22T08:00:00",
    updatedAt: "2026-05-22T08:00:00",
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: []
  }
];

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderTicketsPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <TicketsPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  hookMocks.useTickets.mockReturnValue({
    tickets: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    removeTicket: vi.fn(),
    updateTicket: vi.fn()
  });
  hookMocks.useProjects.mockReturnValue({
    projects,
    loading: false,
    error: null,
    reload: vi.fn()
  });
  hookMocks.useMilestones.mockReturnValue({
    milestones,
    loading: false,
    error: null,
    reload: vi.fn()
  });
  hookMocks.useStandaloneView.mockReturnValue(false);
  hookMocks.useViewMode.mockReturnValue({ viewMode: "kanban", setViewMode: vi.fn() });
  hookMocks.confirm.mockResolvedValue(false);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TicketsPage", () => {
  it("lädt ohne Filter die globale Ticketliste", () => {
    renderTicketsPage("/tickets");

    expect(hookMocks.useTickets).toHaveBeenCalledWith(undefined);
  });

  it("lädt mit Meilensteinfilter den Meilenstein-Scope", () => {
    renderTicketsPage("/tickets?milestoneId=10");

    expect(hookMocks.useTickets).toHaveBeenCalledWith({ type: "milestone", id: 10 });
    expect(screen.getByRole("combobox", { name: "Meilensteinfilter" })).toHaveValue("10");
  });

  it("ersetzt beim Projektwechsel den Meilensteinfilter", async () => {
    renderTicketsPage("/tickets?milestoneId=10");

    fireEvent.change(screen.getByRole("combobox", { name: "Projektfilter" }), {
      target: { value: "1" }
    });

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/tickets?projectId=1");
    });
  });
});
