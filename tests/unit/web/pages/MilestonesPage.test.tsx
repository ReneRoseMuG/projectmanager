// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte MilestonesPage mit Component-Doubles für ListBoardView und Formulare.
 *
 * Mock-Entscheidung:
 * - Hooks und Kindkomponenten werden isoliert, damit Permission-Gating, Owner-Übergabe und Submit-Verdrahtung der Page geprüft werden.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Meilenstein-Kontext reicht Create-Aktionen nur mit write-Permissions durch.
 * - Task- und Ticket-Modals erhalten den Meilenstein-Owner.
 *
 * Fehlerfälle:
 * - Ohne write-Permission dürfen keine neuen Menüaktionen geöffnet werden.
 *
 * Ziel:
 * Den neuen Meilenstein-Menü-Create-Flow auf Page-Ebene gegen Permission- und Owner-Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Milestone, Project } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hookMocks = vi.hoisted(() => ({
  projects: [
    {
      id: 1,
      name: "Projekt Alpha",
      description: null,
      status: "active",
      color: null,
      startDate: null,
      dueDate: null,
      version: 1,
      createdAt: "2026-05-24T08:00:00.000Z",
      updatedAt: "2026-05-24T08:00:00.000Z",
      openTaskCount: 0,
      doneTaskCount: 0,
      totalTaskCount: 0,
      tags: [],
    },
  ],
  milestones: [
    {
      id: 10,
      projectId: 1,
      name: "Meilenstein Alpha",
      description: null,
      status: "active",
      color: null,
      startDate: null,
      dueDate: null,
      version: 1,
      createdAt: "2026-05-24T08:00:00.000Z",
      updatedAt: "2026-05-24T08:00:00.000Z",
      taskCount: 0,
      openTaskCount: 0,
      doneTaskCount: 0,
      totalTaskCount: 0,
      ticketCount: 0,
      featureCount: 0,
      tags: [],
    },
  ],
  createTask: vi.fn(),
  createTicket: vi.fn(),
  permissions: {
    tasks: true,
    tickets: true,
  } as Record<string, boolean>,
  showToast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return { entries: [] };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects() {
    return {
      projects: hookMocks.projects,
      loading: false,
      error: null,
    };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones() {
    return {
      milestones: hookMocks.milestones,
      loading: false,
      error: null,
      updateMilestone: vi.fn(),
      removeMilestone: vi.fn(),
    };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks() {
    return {
      createTask: hookMocks.createTask,
    };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useTickets", () => ({
  useTickets() {
    return {
      createTicket: hookMocks.createTicket,
    };
  },
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission(resource: string, action: string) {
    return action === "write" && hookMocks.permissions[resource] === true;
  },
}));

vi.mock("../../../../apps/web/src/hooks/useStandaloneView", () => ({
  useStandaloneView() {
    return false;
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast() {
    return { showToast: hookMocks.showToast };
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm() {
    return { confirm: hookMocks.confirm };
  },
}));

vi.mock("../../../../apps/web/src/components/milestones/MilestoneListBoardView", () => ({
  MilestoneListBoardView({
    milestones,
    onCreateTask,
    onCreateTicket,
  }: {
    milestones: Milestone[];
    onCreateTask?: (milestone: Milestone) => void;
    onCreateTicket?: (milestone: Milestone) => void;
  }) {
    const milestone = milestones[0];
    return (
      <div data-testid="milestone-list">
        <button type="button" data-enabled={String(Boolean(onCreateTask))} onClick={() => milestone && onCreateTask?.(milestone)}>
          Create Task
        </button>
        <button type="button" data-enabled={String(Boolean(onCreateTicket))} onClick={() => milestone && onCreateTicket?.(milestone)}>
          Create Ticket
        </button>
      </div>
    );
  },
}));

vi.mock("../../../../apps/web/src/components/tasks/TaskForm", () => ({
  TaskForm({
    open,
    owner,
    onSubmit,
  }: {
    open: boolean;
    owner?: { type: string; id: number };
    onSubmit: (input: { title: string }) => Promise<unknown> | unknown;
  }) {
    return open ? (
      <div data-testid="task-form" data-owner={owner ? `${owner.type}:${owner.id}` : ""}>
        <button type="button" onClick={() => void onSubmit({ title: "Aufgabe aus Meilenstein" })}>
          Save Task
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../../../../apps/web/src/components/tickets/TicketForm", () => ({
  TicketForm({
    open,
    owner,
    onSubmit,
  }: {
    open: boolean;
    owner?: { type: string; id: number };
    onSubmit: (input: { title: string }) => Promise<unknown> | unknown;
  }) {
    return open ? (
      <div data-testid="ticket-form" data-owner={owner ? `${owner.type}:${owner.id}` : ""}>
        <button type="button" onClick={() => void onSubmit({ title: "Ticket aus Meilenstein" })}>
          Save Ticket
        </button>
      </div>
    ) : null;
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ProjectMilestoneFilterBar", () => ({
  ProjectMilestoneFilterBar({ projects }: { projects: Project[] }) {
    return <div data-testid="project-filter">{projects.length}</div>;
  },
}));

import { MilestonesPage } from "../../../../apps/web/src/pages/MilestonesPage";

function renderMilestonesPage() {
  return render(
    <MemoryRouter initialEntries={["/milestones"]}>
      <MilestonesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hookMocks.permissions.tasks = true;
  hookMocks.permissions.tickets = true;
  hookMocks.createTask.mockResolvedValue({ id: 11 });
  hookMocks.createTicket.mockResolvedValue({ id: 12 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MilestonesPage", () => {
  it("öffnet Create-Modals mit Meilenstein-Owner und speichert über die passenden Mutations", async () => {
    renderMilestonesPage();

    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));
    expect(screen.getByTestId("task-form")).toHaveAttribute("data-owner", "milestone:10");
    fireEvent.click(screen.getByRole("button", { name: "Save Task" }));

    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(screen.getByTestId("ticket-form")).toHaveAttribute("data-owner", "milestone:10");
    fireEvent.click(screen.getByRole("button", { name: "Save Ticket" }));

    await waitFor(() => {
      expect(hookMocks.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Aufgabe aus Meilenstein" }));
      expect(hookMocks.createTicket).toHaveBeenCalledWith(expect.objectContaining({ title: "Ticket aus Meilenstein" }));
    });
  });

  it("blendet Create-Aktionen ohne write-Permissions aus", () => {
    hookMocks.permissions.tasks = false;
    hookMocks.permissions.tickets = false;

    renderMilestonesPage();

    expect(screen.getByRole("button", { name: "Create Task" })).toHaveAttribute("data-enabled", "false");
    expect(screen.getByRole("button", { name: "Create Ticket" })).toHaveAttribute("data-enabled", "false");
    expect(screen.queryByTestId("task-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ticket-form")).not.toBeInTheDocument();
  });
});
