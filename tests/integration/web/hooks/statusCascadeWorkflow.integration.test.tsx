// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echter useStatusCascadeWorkflow mit QueryClient, Dialog und realen Hook-Mutationen; API-Grenzen werden durch kontrollierte Testdoubles ersetzt.
 *
 * Mock-Entscheidung:
 * - API-Funktionen, Permissions, Kataloge und Toasts werden gedoubelt, damit der clientseitige Workflow ohne Netzwerk reproduzierbar geprüft wird.
 *
 * Isolation:
 * - Keine DB-, Netzwerk- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Projekt-Statuskaskade öffnet nur bei Statuserhöhung und erzeugt Schritte für mutierbare direkte Kindobjekte.
 * - Übersprungene oder abgewählte Objekte werden nicht geändert.
 * - Fehlende write-Permissions blenden Objektgruppen aus.
 *
 * Fehlerfälle:
 * - Statusreduzierungen lösen keine Kindobjektprüfung aus.
 *
 * Ziel:
 * Den Post-Save-Kaskadenworkflow mit Dialogauswahl und bestehenden PATCH-Mutationen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CatalogEntry, Milestone, Project, TaskBoardItem, Ticket } from "@taskmanager/shared-types";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMilestone, getMilestones, getProjectMilestones, updateMilestone } from "../../../../apps/web/src/api/milestones";
import { getOwnerTasks, updateTask } from "../../../../apps/web/src/api/tasks";
import { getOwnerTickets, updateTicket } from "../../../../apps/web/src/api/tickets";
import { useStatusCascadeWorkflow } from "../../../../apps/web/src/hooks/useStatusCascadeWorkflow";

const hookMocks = vi.hoisted(() => ({
  catalogEntries: [
    { id: 1, kind: "workStatus", key: "open", label: "Offen", sortOrder: 100, isClosed: false, color: "var(--color-fern)", version: 1, createdAt: "2026-05-26T12:00:00.000Z", updatedAt: "2026-05-26T12:00:00.000Z" },
    { id: 2, kind: "workStatus", key: "in_progress", label: "In Arbeit", sortOrder: 200, isClosed: false, color: "var(--color-tangerine)", version: 1, createdAt: "2026-05-26T12:00:00.000Z", updatedAt: "2026-05-26T12:00:00.000Z" },
    { id: 3, kind: "workStatus", key: "closed", label: "Geschlossen", sortOrder: 300, isClosed: true, color: "var(--color-steel-500)", version: 1, createdAt: "2026-05-26T12:00:00.000Z", updatedAt: "2026-05-26T12:00:00.000Z" },
  ] as CatalogEntry[],
  permissions: {
    milestones: true,
    tasks: true,
    tickets: true,
  } as Record<string, boolean>,
  showToast: vi.fn(),
}));

vi.mock("../../../../apps/web/src/hooks/useCatalogs", () => ({
  useCatalogs() {
    return { entries: hookMocks.catalogEntries };
  },
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission(resource: string, action: string) {
    return action === "write" && hookMocks.permissions[resource] === true;
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast() {
    return { showToast: hookMocks.showToast };
  },
}));

vi.mock("../../../../apps/web/src/api/milestones", () => ({
  createMilestone: vi.fn(),
  createProjectMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
  getMilestone: vi.fn(),
  getMilestones: vi.fn(),
  getProjectMilestones: vi.fn(),
  setMilestoneTags: vi.fn(),
  updateMilestone: vi.fn(),
}));

vi.mock("../../../../apps/web/src/api/tasks", () => ({
  createOwnerTask: vi.fn(),
  deleteTask: vi.fn(),
  getOwnerTasks: vi.fn(),
  getTasks: vi.fn(),
  linkOwnerTask: vi.fn(),
  unlinkOwnerTask: vi.fn(),
  updateOwnerTaskBoard: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../../../../apps/web/src/api/tickets", () => ({
  createOwnerTicket: vi.fn(),
  createTicket: vi.fn(),
  deleteTicket: vi.fn(),
  getOwnerTickets: vi.fn(),
  getTickets: vi.fn(),
  linkOwnerTicket: vi.fn(),
  setTicketTags: vi.fn(),
  unlinkOwnerTicket: vi.fn(),
  updateTicket: vi.fn(),
  updateTicketPosition: vi.fn(),
}));

const milestoneApi = vi.mocked({ getMilestone, getMilestones, getProjectMilestones, updateMilestone });
const taskApi = vi.mocked({ getOwnerTasks, updateTask });
const ticketApi = vi.mocked({ getOwnerTickets, updateTicket });

const now = "2026-05-26T12:00:00.000Z";

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "Projekt Alpha",
    description: null,
    status: "open",
    color: null,
    startDate: null,
    dueDate: null,
    wikiPageId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: [],
    ...overrides,
  };
}

function milestoneFixture(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 10,
    projectId: 1,
    name: "Meilenstein Alpha",
    description: null,
    status: "open",
    color: null,
    startDate: null,
    dueDate: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    taskCount: 0,
    openTaskCount: 0,
    doneTaskCount: 0,
    totalTaskCount: 0,
    ticketCount: 0,
    featureCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    tags: [],
    ...overrides,
  };
}

function taskFixture(overrides: Partial<TaskBoardItem> = {}): TaskBoardItem {
  return {
    id: 20,
    parentId: null,
    title: "Aufgabe Alpha",
    description: null,
    status: "open",
    priority: "medium",
    assignee: null,
    dueDate: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    boardPosition: 1024,
    ...overrides,
  };
}

function ticketFixture(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 30,
    parentId: null,
    type: "bug",
    title: "Ticket Alpha",
    description: null,
    status: "in_progress",
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
    createdAt: now,
    updatedAt: now,
    tags: [],
    subTicketCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    ...overrides,
  };
}

function Harness() {
  const cascade = useStatusCascadeWorkflow();
  const previousProject = projectFixture({ status: "open", version: 1 });
  const updatedProject = projectFixture({ status: "closed", version: 2 });
  const previousMilestone = milestoneFixture({ status: "closed", version: 1 });
  const reducedMilestone = milestoneFixture({ status: "open", version: 2 });

  return (
    <section>
      <button type="button" onClick={() => void cascade.startProjectCascade(previousProject, updatedProject)}>
        Projektkaskade starten
      </button>
      <button type="button" onClick={() => void cascade.startMilestoneCascade(previousMilestone, reducedMilestone)}>
        Meilenstein reduzieren
      </button>
      {cascade.dialog}
    </section>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  hookMocks.permissions.milestones = true;
  hookMocks.permissions.tasks = true;
  hookMocks.permissions.tickets = true;
  milestoneApi.getMilestones.mockResolvedValue([]);
  milestoneApi.getMilestone.mockResolvedValue(milestoneFixture());
  milestoneApi.getProjectMilestones.mockResolvedValue([
    milestoneFixture({ id: 10, name: "Meilenstein Alpha", status: "open", version: 1 }),
    milestoneFixture({ id: 11, name: "Meilenstein Beta", status: "closed", version: 1 }),
  ]);
  taskApi.getOwnerTasks.mockResolvedValue([
    taskFixture({ id: 20, title: "Aufgabe Alpha", status: "open", version: 3 }),
    taskFixture({ id: 21, title: "Aufgabe Beta", status: "closed", version: 1 }),
  ]);
  ticketApi.getOwnerTickets.mockResolvedValue([ticketFixture({ id: 30, title: "Ticket Alpha", status: "in_progress", version: 4 })]);
  milestoneApi.updateMilestone.mockResolvedValue(milestoneFixture({ id: 10, status: "closed", version: 2 }));
  taskApi.updateTask.mockResolvedValue(taskFixture({ id: 20, status: "closed", version: 4 }));
  ticketApi.updateTicket.mockResolvedValue(ticketFixture({ id: 30, status: "closed", version: 5 }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useStatusCascadeWorkflow", () => {
  it("öffnet für Projekt-Statuserhöhung Schritte und aktualisiert nur ausgewählte direkte Kinder", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Projektkaskade starten" }));

    await screen.findByRole("heading", { name: "Meilensteine" });
    expect(screen.getByText("Meilenstein Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Meilenstein Beta")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByRole("heading", { name: "Aufgaben" });
    fireEvent.click(screen.getByLabelText(/Aufgabe Alpha/));

    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await screen.findByRole("heading", { name: "Tickets" });
    fireEvent.click(screen.getByRole("button", { name: "Änderungen übernehmen" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Tickets" })).not.toBeInTheDocument());
    expect(milestoneApi.updateMilestone).toHaveBeenCalledWith(10, { status: "closed", expectedVersion: 1 });
    expect(taskApi.updateTask).not.toHaveBeenCalled();
    expect(ticketApi.updateTicket).toHaveBeenCalledWith(30, { status: "closed", expectedVersion: 4 });
  });

  it("überspringt alle Schritte ohne Kindobjekte zu ändern", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Projektkaskade starten" }));

    await screen.findByRole("heading", { name: "Meilensteine" });
    fireEvent.click(screen.getByRole("button", { name: "Überspringen" }));
    await screen.findByRole("heading", { name: "Aufgaben" });
    fireEvent.click(screen.getByRole("button", { name: "Überspringen" }));
    await screen.findByRole("heading", { name: "Tickets" });
    fireEvent.click(screen.getByRole("button", { name: "Überspringen" }));
    fireEvent.click(screen.getByRole("button", { name: "Änderungen übernehmen" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Tickets" })).not.toBeInTheDocument());
    expect(milestoneApi.updateMilestone).not.toHaveBeenCalled();
    expect(taskApi.updateTask).not.toHaveBeenCalled();
    expect(ticketApi.updateTicket).not.toHaveBeenCalled();
  });

  it("blendet Gruppen ohne write-Permission aus", async () => {
    hookMocks.permissions.milestones = false;

    renderHarness();
    fireEvent.click(screen.getByRole("button", { name: "Projektkaskade starten" }));

    await screen.findByRole("heading", { name: "Aufgaben" });
    expect(milestoneApi.getProjectMilestones).not.toHaveBeenCalled();
    expect(screen.queryByText("Meilenstein Alpha")).not.toBeInTheDocument();
  });

  it("löst bei Statusreduzierung keine Kindobjektprüfung aus", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Meilenstein reduzieren" }));

    await waitFor(() => expect(screen.queryByText("Status für Unterobjekte übernehmen")).not.toBeInTheDocument());
    expect(taskApi.getOwnerTasks).not.toHaveBeenCalled();
    expect(ticketApi.getOwnerTickets).not.toHaveBeenCalled();
  });
});
