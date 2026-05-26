/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Owner-Task-Hooks refetchen Board-Collections nach Join-Mutationen über TanStack Query.
 * - Owner-Task-Statuswechsel aktualisieren den Cache optimistisch und rollen bei API-Fehlern zurück.
 * - Projekt-Feature-Join-Änderungen bleiben über Relations-Hooks in der angezeigten UI-Liste sichtbar.
 *
 * Fehlerfälle:
 * - Mutationen dürfen nicht nur die API aufrufen, sondern müssen abhängige Query-Daten sichtbar aktualisieren.
 * - Fehlgeschlagene optimistische Status-Mutationen dürfen keinen falschen Cache-Zustand behalten.
 *
 * Ziel:
 * Hook-, QueryClient- und API-Schicht im Zusammenspiel gegen stale Collection- und Relationsdaten absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Feature, TaskBoardItem } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOwnerTask, deleteTask, getOwnerTasks, getTasks, linkOwnerTask, unlinkOwnerTask, updateOwnerTaskBoard, updateTask } from "../../../../apps/web/src/api/tasks";
import { getProjectFeatures, setProjectFeatures } from "../../../../apps/web/src/api/doc-links";
import { useProjectFeatureLinks } from "../../../../apps/web/src/hooks/useDocLinks";
import { useTasks } from "../../../../apps/web/src/hooks/useTasks";

vi.mock("../../../../apps/web/src/api/tasks", () => ({
  createOwnerTask: vi.fn(),
  deleteTask: vi.fn(),
  getOwnerTasks: vi.fn(),
  getTasks: vi.fn(),
  linkOwnerTask: vi.fn(),
  unlinkOwnerTask: vi.fn(),
  updateOwnerTaskBoard: vi.fn(),
  updateTask: vi.fn()
}));

vi.mock("../../../../apps/web/src/api/doc-links", () => ({
  getProjectFeatures: vi.fn(),
  setProjectFeatures: vi.fn()
}));

const taskApi = vi.mocked({ createOwnerTask, deleteTask, getOwnerTasks, getTasks, linkOwnerTask, unlinkOwnerTask, updateOwnerTaskBoard, updateTask });
const docLinkApi = vi.mocked({ getProjectFeatures, setProjectFeatures });

const projectId = 7;
const taskId = 13;
const featureId = 19;
const taskOwner = { type: "project" as const, id: projectId };
const now = "2026-05-17T12:00:00.000Z";

function taskFixture(overrides: Partial<TaskBoardItem> = {}): TaskBoardItem {
  return {
    id: taskId,
    parentId: null,
    title: "Aktuelle Aufgabe",
    description: null,
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    boardPosition: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    tags: [],
    subtaskCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    ...overrides
  };
}

function featureFixture(overrides: Partial<Feature> = {}): Feature {
  return {
    id: featureId,
    title: "Aktuelles Feature",
    status: "active",
    description: null,
    contentPath: null,
    sortOrder: 0,
    useCaseCount: 0,
    attachmentCount: 0,
    noteCount: 0,
    commentCount: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function TaskCollectionHarness() {
  const tasks = useTasks(taskOwner);

  if (tasks.loading) {
    return <p>Lädt Aufgaben</p>;
  }

  return (
    <section>
      <output aria-label="Task count">{tasks.tasks.length}</output>
      <output aria-label="Task status">{tasks.tasks[0]?.status ?? "none"}</output>
      <output aria-label="Task version">{tasks.tasks[0]?.version ?? "none"}</output>
      {tasks.tasks.map((task) => (
        <p key={task.id}>{task.title}</p>
      ))}
      <button type="button" onClick={() => void tasks.unlinkTask(taskId)}>
        Task entfernen
      </button>
      <button type="button" onClick={() => void tasks.linkTask(taskId + 1)}>
        Task verknüpfen
      </button>
      <button
        type="button"
        onClick={() => {
          const task = tasks.tasks[0];
          if (task) {
            void tasks.updateTaskStatus(task.id, "done", task.version).catch(() => undefined);
          }
        }}
      >
        Status ändern
      </button>
    </section>
  );
}

function ProjectFeatureLinksHarness() {
  const links = useProjectFeatureLinks(projectId);

  if (links.loading) {
    return <p>Lädt Features</p>;
  }

  return (
    <section>
      <output aria-label="Project feature count">{links.features.length}</output>
      {links.features.map((feature) => (
        <p key={feature.id}>{feature.title}</p>
      ))}
      <button type="button" onClick={() => void links.setFeaturesForProject([featureId])}>
        Feature verknüpfen
      </button>
      <button type="button" onClick={() => void links.setFeaturesForProject([])}>
        Feature entfernen
      </button>
    </section>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Query hook mutation integration", () => {
  it("refetcht Owner-Task-Collections nach Unlink-Mutation", async () => {
    let ownerTasks = [taskFixture()];
    taskApi.getOwnerTasks.mockImplementation(async () => ownerTasks);
    taskApi.unlinkOwnerTask.mockImplementation(async (_owner, id) => {
      ownerTasks = ownerTasks.filter((task) => task.id !== id);
    });

    renderWithQueryClient(<TaskCollectionHarness />);

    await screen.findByText("Aktuelle Aufgabe");
    fireEvent.click(screen.getByRole("button", { name: "Task entfernen" }));

    await waitFor(() => expect(screen.getByLabelText("Task count")).toHaveTextContent("0"));
    expect(screen.queryByText("Aktuelle Aufgabe")).not.toBeInTheDocument();
    expect(taskApi.unlinkOwnerTask).toHaveBeenCalledWith(taskOwner, taskId);
    expect(taskApi.getOwnerTasks.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("refetcht Owner-Task-Collections nach Link-Mutation", async () => {
    const linkedTask = taskFixture({ id: taskId + 1, title: "Verknüpfte Aufgabe", boardPosition: 1024 });
    let ownerTasks: TaskBoardItem[] = [];
    taskApi.getOwnerTasks.mockImplementation(async () => ownerTasks);
    taskApi.linkOwnerTask.mockImplementation(async (_owner, id) => {
      ownerTasks = id === linkedTask.id ? [linkedTask] : ownerTasks;
      return linkedTask;
    });

    renderWithQueryClient(<TaskCollectionHarness />);

    await waitFor(() => expect(screen.getByLabelText("Task count")).toHaveTextContent("0"));
    fireEvent.click(screen.getByRole("button", { name: "Task verknüpfen" }));

    await waitFor(() => expect(screen.getByLabelText("Task count")).toHaveTextContent("1"));
    expect(screen.getByText("Verknüpfte Aufgabe")).toBeInTheDocument();
    expect(taskApi.linkOwnerTask).toHaveBeenCalledWith(taskOwner, linkedTask.id);
  });

  it("aktualisiert Owner-Task-Status optimistisch und invalidiert nach Erfolg", async () => {
    const updateDeferred = deferred<TaskBoardItem>();
    const updatedTask = taskFixture({ status: "done", version: 2 });
    let ownerTasks = [taskFixture()];
    taskApi.getOwnerTasks.mockImplementation(async () => ownerTasks);
    taskApi.updateTask.mockImplementation(async () => updateDeferred.promise);

    renderWithQueryClient(<TaskCollectionHarness />);

    await screen.findByText("Aktuelle Aufgabe");
    fireEvent.click(screen.getByRole("button", { name: "Status ändern" }));

    await waitFor(() => expect(screen.getByLabelText("Task status")).toHaveTextContent("done"));
    await waitFor(() => expect(screen.getByLabelText("Task version")).toHaveTextContent("2"));
    expect(taskApi.updateTask).toHaveBeenCalledWith(taskId, { status: "done", expectedVersion: 1 });

    ownerTasks = [updatedTask];
    updateDeferred.resolve(updatedTask);

    await waitFor(() => expect(taskApi.getOwnerTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("rollt den optimistischen Owner-Task-Status bei API-Fehler zurück", async () => {
    const updateDeferred = deferred<TaskBoardItem>();
    const originalTask = taskFixture();
    taskApi.getOwnerTasks.mockImplementation(async () => [originalTask]);
    taskApi.updateTask.mockImplementation(async () => updateDeferred.promise);

    renderWithQueryClient(<TaskCollectionHarness />);

    await screen.findByText("Aktuelle Aufgabe");
    fireEvent.click(screen.getByRole("button", { name: "Status ändern" }));

    await waitFor(() => expect(screen.getByLabelText("Task status")).toHaveTextContent("done"));
    updateDeferred.reject(new Error("Conflict"));

    await waitFor(() => expect(screen.getByLabelText("Task status")).toHaveTextContent("todo"));
    await waitFor(() => expect(screen.getByLabelText("Task version")).toHaveTextContent("1"));
  });

  it("refetcht Projekt-Feature-Join-Daten nach Relation-Mutation", async () => {
    const linkedFeature = featureFixture();
    let linkedFeatures: Feature[] = [];
    docLinkApi.getProjectFeatures.mockImplementation(async () => linkedFeatures);
    docLinkApi.setProjectFeatures.mockImplementation(async (_projectId, featureIds) => {
      linkedFeatures = featureIds.includes(linkedFeature.id) ? [linkedFeature] : [];
      return linkedFeatures;
    });

    renderWithQueryClient(<ProjectFeatureLinksHarness />);

    await waitFor(() => expect(screen.getByLabelText("Project feature count")).toHaveTextContent("0"));
    fireEvent.click(screen.getByRole("button", { name: "Feature verknüpfen" }));

    await waitFor(() => expect(screen.getByLabelText("Project feature count")).toHaveTextContent("1"));
    expect(screen.getByText("Aktuelles Feature")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Feature entfernen" }));

    await waitFor(() => expect(screen.getByLabelText("Project feature count")).toHaveTextContent("0"));
    expect(screen.queryByText("Aktuelles Feature")).not.toBeInTheDocument();
    expect(docLinkApi.setProjectFeatures).toHaveBeenLastCalledWith(projectId, []);
  });
});
