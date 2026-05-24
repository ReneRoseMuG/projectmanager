// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - ProjectDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Projekt-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Projekte absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDetailPage } from "../../../../apps/web/src/pages/ProjectDetailPage";

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

vi.mock("../../../../apps/web/src/components/projects/ProjectForm", () => ({
  ProjectForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="project-form" />
    );
  },
  parseProjectFormTab: () => undefined,
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects: () => ({
    project: router.params.id
      ? {
          id: 10,
          name: "Projekt Alpha",
          description: null,
          status: "active",
          color: "var(--color-steel-700)",
          startDate: null,
          dueDate: null,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z",
          openTaskCount: 0,
          doneTaskCount: 0,
          totalTaskCount: 0,
          tags: [],
        }
      : undefined,
    loading: false,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    removeProject: vi.fn(),
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

describe("ProjectDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", () => {
    const { container } = render(<ProjectDetailPage />);

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
    render(<ProjectDetailPage />);

    expect(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Projekt-URL und navigiert zurück", () => {
    render(<ProjectDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/projects/10?standalone=1", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/projects");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<ProjectDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
