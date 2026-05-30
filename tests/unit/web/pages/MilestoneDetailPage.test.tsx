// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - MilestoneDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Meilenstein-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Meilensteine absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MilestoneDetailPage } from "../../../../apps/web/src/pages/MilestoneDetailPage";

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

vi.mock("../../../../apps/web/src/components/milestones/MilestoneForm", () => ({
  MilestoneForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="milestone-form" />
    );
  },
  parseMilestoneFormTab: () => undefined,
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects: () => ({
    projects: [
      {
        id: 1,
        name: "Projekt Alpha",
        description: null,
        status: "active",
        color: "var(--color-steel-700)",
        startDate: null,
        dueDate: null,
        wikiPageId: null,
        version: 1,
        createdAt: "2026-05-20T08:00:00.000Z",
        updatedAt: "2026-05-20T08:00:00.000Z",
        openTaskCount: 0,
        doneTaskCount: 0,
        totalTaskCount: 0,
        tags: [],
      },
    ],
    loading: false,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useMilestones", () => ({
  useMilestones: () => ({
    milestone: router.params.id
      ? {
          id: 10,
          projectId: 1,
          name: "Meilenstein Alpha",
          description: null,
          status: "active",
          color: "var(--color-teal)",
          startDate: null,
          dueDate: null,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z",
          taskCount: 0,
          openTaskCount: 0,
          doneTaskCount: 0,
          totalTaskCount: 0,
          ticketCount: 0,
          featureCount: 0,
          tags: [],
        }
      : undefined,
    loading: false,
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    removeMilestone: vi.fn(),
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useStatusCascadeWorkflow", () => ({
  useStatusCascadeWorkflow: () => ({
    startProjectCascade: vi.fn().mockResolvedValue(undefined),
    startMilestoneCascade: vi.fn().mockResolvedValue(undefined),
    dialog: null,
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

describe("MilestoneDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", () => {
    const { container } = render(<MilestoneDetailPage />);

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
    render(<MilestoneDetailPage />);

    expect(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Meilenstein-URL und navigiert zurück", () => {
    render(<MilestoneDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/milestones/10?standalone=1", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/projects");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<MilestoneDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
