// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte ProjectsPage mit Component-Doubles für ListBoardView und Formulare.
 *
 * Mock-Entscheidung:
 * - Hooks und Kindkomponenten werden isoliert, damit Permission-Gating, Parent-Übergabe und Submit-Verdrahtung der Page geprüft werden.
 *
 * Isolation:
 * - Keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Projekt-Kontext reicht Create-Aktionen nur mit write-Permissions durch.
 * - Modals erhalten Projekt-Parent und Submit ruft die passende Create-Mutation auf.
 *
 * Fehlerfälle:
 * - Ohne write-Permission dürfen keine neuen Menüaktionen geöffnet werden.
 *
 * Ziel:
 * Den neuen Projekt-Menü-Create-Flow auf Page-Ebene gegen Permission- und Parent-Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import type { Project } from "@taskmanager/shared-types";
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
  createMilestone: vi.fn(),
  createTask: vi.fn(),
  createTicket: vi.fn(),
  permissions: {
    milestones: true,
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
      updateProject: vi.fn(),
      removeProject: vi.fn(),
    };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones() {
    return {
      createMilestone: hookMocks.createMilestone,
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

vi.mock("../../../../apps/web/src/components/projects/ProjectListBoardView", () => ({
  ProjectListBoardView({
    projects,
    onCreateMilestone,
    onCreateTask,
    onCreateTicket,
  }: {
    projects: Project[];
    onCreateMilestone?: (project: Project) => void;
    onCreateTask?: (project: Project) => void;
    onCreateTicket?: (project: Project) => void;
  }) {
    const project = projects[0];
    return (
      <div data-testid="project-list">
        <button type="button" data-enabled={String(Boolean(onCreateMilestone))} onClick={() => project && onCreateMilestone?.(project)}>
          Create Milestone
        </button>
        <button type="button" data-enabled={String(Boolean(onCreateTask))} onClick={() => project && onCreateTask?.(project)}>
          Create Task
        </button>
        <button type="button" data-enabled={String(Boolean(onCreateTicket))} onClick={() => project && onCreateTicket?.(project)}>
          Create Ticket
        </button>
      </div>
    );
  },
}));

vi.mock("../../../../apps/web/src/components/milestones/MilestoneForm", () => ({
  MilestoneForm({
    open,
    initialProjectId,
    lockProjectSelection,
    onSubmit,
  }: {
    open: boolean;
    initialProjectId?: number;
    lockProjectSelection?: boolean;
    onSubmit: (input: { projectId: number; name: string }, tagIds: number[]) => Promise<unknown> | unknown;
  }) {
    return open ? (
      <div data-testid="milestone-form" data-project-id={initialProjectId} data-locked={String(Boolean(lockProjectSelection))}>
        <button type="button" onClick={() => void onSubmit({ projectId: initialProjectId ?? 0, name: "Meilenstein aus Projekt" }, [])}>
          Save Milestone
        </button>
      </div>
    ) : null;
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
        <button type="button" onClick={() => void onSubmit({ title: "Aufgabe aus Projekt" })}>
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
        <button type="button" onClick={() => void onSubmit({ title: "Ticket aus Projekt" })}>
          Save Ticket
        </button>
      </div>
    ) : null;
  },
}));

import { ProjectsPage } from "../../../../apps/web/src/pages/ProjectsPage";

function renderProjectsPage() {
  return render(
    <MemoryRouter initialEntries={["/projects"]}>
      <ProjectsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hookMocks.permissions.milestones = true;
  hookMocks.permissions.tasks = true;
  hookMocks.permissions.tickets = true;
  hookMocks.createMilestone.mockResolvedValue({ id: 10 });
  hookMocks.createTask.mockResolvedValue({ id: 11 });
  hookMocks.createTicket.mockResolvedValue({ id: 12 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectsPage", () => {
  it("öffnet Create-Modals mit Projekt-Parent und speichert über die passenden Mutations", async () => {
    renderProjectsPage();

    fireEvent.click(screen.getByRole("button", { name: "Create Milestone" }));
    expect(screen.getByTestId("milestone-form")).toHaveAttribute("data-project-id", "1");
    expect(screen.getByTestId("milestone-form")).toHaveAttribute("data-locked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Save Milestone" }));

    fireEvent.click(screen.getByRole("button", { name: "Create Task" }));
    expect(screen.getByTestId("task-form")).toHaveAttribute("data-owner", "project:1");
    fireEvent.click(screen.getByRole("button", { name: "Save Task" }));

    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(screen.getByTestId("ticket-form")).toHaveAttribute("data-owner", "project:1");
    fireEvent.click(screen.getByRole("button", { name: "Save Ticket" }));

    await waitFor(() => {
      expect(hookMocks.createMilestone).toHaveBeenCalledWith(expect.objectContaining({ projectId: 1, name: "Meilenstein aus Projekt" }), []);
      expect(hookMocks.createTask).toHaveBeenCalledWith(expect.objectContaining({ title: "Aufgabe aus Projekt" }));
      expect(hookMocks.createTicket).toHaveBeenCalledWith(expect.objectContaining({ title: "Ticket aus Projekt" }));
    });
  });

  it("blendet Create-Aktionen ohne write-Permissions aus", () => {
    hookMocks.permissions.milestones = false;
    hookMocks.permissions.tasks = false;
    hookMocks.permissions.tickets = false;

    renderProjectsPage();

    expect(screen.getByRole("button", { name: "Create Milestone" })).toHaveAttribute("data-enabled", "false");
    expect(screen.getByRole("button", { name: "Create Task" })).toHaveAttribute("data-enabled", "false");
    expect(screen.getByRole("button", { name: "Create Ticket" })).toHaveAttribute("data-enabled", "false");
    expect(screen.queryByTestId("milestone-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("task-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ticket-form")).not.toBeInTheDocument();
  });
});
