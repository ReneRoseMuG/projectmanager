// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - TaskDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Create-Modus überschreibt das Formular-Defaultschließen nicht.
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
import { TaskDetailPage } from "../../../../apps/web/src/pages/TaskDetailPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>,
  search: "returnTo=%2Fprojects",
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => router.navigate,
    useParams: () => router.params,
    useSearchParams: () => [new URLSearchParams(router.search), vi.fn()],
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}),
}));

vi.mock("../../../../apps/web/src/components/tasks/TaskForm", () => ({
  TaskForm({
    closeOnSubmit,
    onOpenInTab,
  }: {
    closeOnSubmit?: boolean;
    onOpenInTab?: () => void;
  }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div
        data-close-on-submit={
          closeOnSubmit === undefined ? "default" : String(closeOnSubmit)
        }
        data-testid="task-form"
      />
    );
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/hooks/useTasks", () => ({
  useTasks: () => ({
    createTask: vi.fn(),
    updateTask: vi.fn(),
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useTaskDetail", () => ({
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
          subtaskCount: 0,
        }
      : null,
    loading: false,
    reload: vi.fn(),
  }),
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
  it("nutzt die volle verfügbare Detailseitenbreite", () => {
    const { container } = render(<TaskDetailPage />);

    expect(container.firstElementChild).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "min-w-0",
      "flex-1",
      "flex-col",
    );
    expect(container.firstElementChild).not.toHaveClass("mx-auto", "max-w-7xl");
  });

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button", () => {
    render(<TaskDetailPage />);

    expect(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Aufgaben-URL und navigiert zurück", () => {
    render(<TaskDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/tasks/10?standalone=1", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/projects");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};
    router.search = "ownerType=project&ownerId=1&returnTo=%2Fprojects%2F1";

    render(<TaskDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });

  it("nutzt im Create-Modus das Formular-Defaultschließen", () => {
    router.params = {};
    router.search = "ownerType=project&ownerId=1&returnTo=%2Fprojects%2F1";

    render(<TaskDetailPage />);

    expect(screen.getByTestId("task-form")).toHaveAttribute(
      "data-close-on-submit",
      "default",
    );
  });
});
