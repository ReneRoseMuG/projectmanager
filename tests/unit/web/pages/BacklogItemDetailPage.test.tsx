// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - BacklogItemDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Backlog-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Backlog-Items absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BacklogItemDetailPage } from "../../../../apps/web/src/pages/BacklogItemDetailPage";

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

vi.mock("../../../../apps/web/src/api/backlog", () => ({
  getBacklogItem: vi.fn().mockResolvedValue({
    id: 10,
    projectId: 1,
    featureId: null,
    useCaseId: null,
    title: "Backlog Alpha",
    description: null,
    status: "open",
    importKey: null,
    sortOrder: 0,
    version: 1,
    createdAt: "2026-05-20T08:00:00.000Z",
    updatedAt: "2026-05-20T08:00:00.000Z",
  }),
}));

vi.mock("../../../../apps/web/src/components/backlog/BacklogItemForm", () => ({
  BacklogItemForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="backlog-item-form" />
    );
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/hooks/useBacklog", () => ({
  useBacklog: () => ({
    createItem: vi.fn(),
    updateItem: vi.fn(),
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useFeatures", () => ({
  useFeatures: () => ({
    features: [],
    loading: false,
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
  vi.clearAllMocks();
});

describe("BacklogItemDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", async () => {
    const { container } = render(<BacklogItemDetailPage />);

    await screen.findByRole("button");

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

  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button", async () => {
    render(<BacklogItemDetailPage />);

    expect(
      await screen.findByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Backlog-URL und navigiert zurück", async () => {
    render(<BacklogItemDetailPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/backlog/10", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/projects");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<BacklogItemDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
