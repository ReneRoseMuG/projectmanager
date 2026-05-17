/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Query-Hooks refetchen Collections nach Mutationen über TanStack Query.
 * - Join-Tabellen-Änderungen werden über Relations-Hooks in der angezeigten UI-Liste sichtbar.
 * - Task-Feature-Relationen bereinigen abhängige Use-Case-Relationen und aktualisieren den Cache.
 *
 * Fehlerfälle:
 * - Mutationen dürfen nicht nur die API aufrufen, sondern müssen abhängige Query-Daten sichtbar aktualisieren.
 *
 * Ziel:
 * Hook-, QueryClient- und API-Schicht im Zusammenspiel gegen stale Collection- und Relationsdaten absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Feature, Task, UseCase } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteTask, getProjectTasks, getTasks, updateTask, updateTaskPosition, createTask } from "../../api/tasks";
import {
  getFeatureTasks,
  getProjectFeatures,
  getTaskFeatures,
  getTaskUseCases,
  getUseCaseTasks,
  setFeatureTasks,
  setProjectFeatures,
  setTaskFeatures,
  setTaskUseCases,
  setUseCaseTasks
} from "../../api/doc-links";
import { getUseCases } from "../../api/use-cases";
import { useProjectFeatureLinks, useTaskDocLinks } from "../useDocLinks";
import { useTasks } from "../useTasks";

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getProjectTasks: vi.fn(),
  getTasks: vi.fn(),
  updateTask: vi.fn(),
  updateTaskPosition: vi.fn()
}));

vi.mock("../../api/doc-links", () => ({
  getFeatureTasks: vi.fn(),
  getProjectFeatures: vi.fn(),
  getTaskFeatures: vi.fn(),
  getTaskUseCases: vi.fn(),
  getUseCaseTasks: vi.fn(),
  setFeatureTasks: vi.fn(),
  setProjectFeatures: vi.fn(),
  setTaskFeatures: vi.fn(),
  setTaskUseCases: vi.fn(),
  setUseCaseTasks: vi.fn()
}));

vi.mock("../../api/projects", () => ({
  getProjects: vi.fn()
}));

vi.mock("../../api/use-cases", () => ({
  getUseCases: vi.fn()
}));

const taskApi = vi.mocked({ createTask, deleteTask, getProjectTasks, getTasks, updateTask, updateTaskPosition });
const docLinkApi = vi.mocked({
  getFeatureTasks,
  getProjectFeatures,
  getTaskFeatures,
  getTaskUseCases,
  getUseCaseTasks,
  setFeatureTasks,
  setProjectFeatures,
  setTaskFeatures,
  setTaskUseCases,
  setUseCaseTasks
});
const useCaseApi = vi.mocked({ getUseCases });

const projectId = 7;
const taskId = 13;
const featureId = 19;
const now = "2026-05-17T12:00:00.000Z";

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: taskId,
    projectId,
    parentId: null,
    title: "Aktuelle Aufgabe",
    description: null,
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    position: 0,
    createdAt: now,
    updatedAt: now,
    tags: [],
    subtaskCount: 0,
    ...overrides
  };
}

function featureFixture(overrides: Partial<Feature> = {}): Feature {
  return {
    id: featureId,
    title: "Aktuelles Feature",
    slug: "aktuelles-feature",
    status: "active",
    description: null,
    contentPath: null,
    sortOrder: 0,
    useCaseCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function useCaseFixture(overrides: Partial<UseCase> = {}): UseCase {
  return {
    id: 23,
    featureId,
    title: "Aktueller Use Case",
    slug: "aktueller-use-case",
    status: "active",
    description: null,
    contentPath: null,
    sortOrder: 0,
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

function TaskCollectionHarness() {
  const tasks = useTasks(projectId);

  if (tasks.loading) {
    return <p>Lädt Aufgaben</p>;
  }

  return (
    <section>
      <output aria-label="Task count">{tasks.tasks.length}</output>
      {tasks.tasks.map((task) => (
        <p key={task.id}>{task.title}</p>
      ))}
      <button type="button" onClick={() => void tasks.removeTask(taskId)}>
        Task löschen
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

function TaskDocLinksHarness() {
  const links = useTaskDocLinks(taskId);

  if (links.loading) {
    return <p>Lädt Task-Relationen</p>;
  }

  return (
    <section>
      <output aria-label="Task feature count">{links.features.length}</output>
      {links.features.map((feature) => (
        <p key={feature.id}>{feature.title}</p>
      ))}
      <button type="button" onClick={() => void links.setFeaturesForTask([featureId])}>
        Task-Feature verknüpfen
      </button>
    </section>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Query hook mutation integration", () => {
  it("refetcht Task-Collections nach Delete-Mutation", async () => {
    let projectTasks = [taskFixture()];
    taskApi.getProjectTasks.mockImplementation(async () => projectTasks);
    taskApi.deleteTask.mockImplementation(async (id) => {
      projectTasks = projectTasks.filter((task) => task.id !== id);
    });

    renderWithQueryClient(<TaskCollectionHarness />);

    await screen.findByText("Aktuelle Aufgabe");
    fireEvent.click(screen.getByRole("button", { name: "Task löschen" }));

    await waitFor(() => expect(screen.getByLabelText("Task count")).toHaveTextContent("0"));
    expect(screen.queryByText("Aktuelle Aufgabe")).not.toBeInTheDocument();
    expect(taskApi.deleteTask.mock.calls[0]?.[0]).toBe(taskId);
    expect(taskApi.getProjectTasks.mock.calls.length).toBeGreaterThanOrEqual(2);
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

  it("refetcht Task-Feature-Relationen und entfernt nicht mehr erlaubte Use-Case-Links", async () => {
    const linkedFeature = featureFixture();
    const staleUseCase = useCaseFixture({ id: 99, featureId: 99, title: "Alter Use Case" });
    let taskFeatures: Feature[] = [];
    let taskUseCases: UseCase[] = [staleUseCase];
    docLinkApi.getTaskFeatures.mockImplementation(async () => taskFeatures);
    docLinkApi.getTaskUseCases.mockImplementation(async () => taskUseCases);
    docLinkApi.setTaskFeatures.mockImplementation(async (_taskId, featureIds) => {
      taskFeatures = featureIds.includes(linkedFeature.id) ? [linkedFeature] : [];
      return taskFeatures;
    });
    docLinkApi.setTaskUseCases.mockImplementation(async (_taskId, useCaseIds) => {
      taskUseCases = taskUseCases.filter((useCase) => useCaseIds.includes(useCase.id));
      return taskUseCases;
    });
    useCaseApi.getUseCases.mockImplementation(async (requestedFeatureId) => (requestedFeatureId === linkedFeature.id ? [useCaseFixture()] : []));

    renderWithQueryClient(<TaskDocLinksHarness />);

    await waitFor(() => expect(docLinkApi.getTaskUseCases).toHaveBeenCalledWith(taskId));
    await waitFor(() => expect(screen.getByLabelText("Task feature count")).toHaveTextContent("0"));
    fireEvent.click(screen.getByRole("button", { name: "Task-Feature verknüpfen" }));

    await waitFor(() => expect(screen.getByLabelText("Task feature count")).toHaveTextContent("1"));
    expect(screen.getByText("Aktuelles Feature")).toBeInTheDocument();
    expect(docLinkApi.setTaskUseCases).toHaveBeenCalledWith(taskId, []);
  });
});
