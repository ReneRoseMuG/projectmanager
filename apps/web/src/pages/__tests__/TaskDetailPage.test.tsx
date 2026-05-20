// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TaskDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Aufgaben-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Aufgaben absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskDetailPage } from "../TaskDetailPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>,
  search: "returnTo=%2Fprojects"
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => router.navigate,
    useParams: () => router.params,
    useSearchParams: () => [new URLSearchParams(router.search), vi.fn()]
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({})
}));

vi.mock("../../components/tasks/TaskForm", () => ({
  TaskForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="task-form" />
    );
  }
}));

vi.mock("../../components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock("../../hooks/useTasks", () => ({
  useTasks: () => ({
    createTask: vi.fn(),
    updateTask: vi.fn()
  })
}));

vi.mock("../../hooks/useTaskDetail", () => ({
  useTaskDetail: () => ({
    task: router.params.id
      ? {
          id: 10,
          projectId: 1,
          parentId: null,
          title: "Aufgabe Alpha",
          description: null,
          status: "todo",
          priority: "medium",
          assignee: null,
          dueDate: null,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z",
          tags: [],
          subtaskCount: 0
        }
      : null,
    loading: false,
    reload: vi.fn()
  })
}));

beforeEach(() => {
  router.params = { id: "10" };
  router.search = "returnTo=%2Fprojects";
  router.navigate.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TaskDetailPage openInTab", () => {
  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button", () => {
    render(<TaskDetailPage />);

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("öffnet die Aufgaben-URL und navigiert zurück", () => {
    render(<TaskDetailPage />);

    fireEvent.click(screen.getByRole("button", { name: "In neuem Tab öffnen" }));

    expect(window.open).toHaveBeenCalledWith("/tasks/10", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/projects");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<TaskDetailPage />);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
