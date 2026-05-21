// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - UseCaseDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Use-Case-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Use Cases absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UseCaseDetailPage } from "../../../../apps/web/src/pages/UseCaseDetailPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>,
  search: "returnTo=%2Ffeatures",
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

vi.mock("../../../../apps/web/src/api/use-cases", () => ({
  getUseCase: vi.fn().mockResolvedValue({
    id: 10,
    featureId: 1,
    title: "Use Case Alpha",
    slug: "use-case-alpha",
    status: "active",
    description: null,
    content: null,
    contentPath: null,
    sortOrder: 0,
    version: 1,
    createdAt: "2026-05-20T08:00:00.000Z",
    updatedAt: "2026-05-20T08:00:00.000Z",
  }),
}));

vi.mock("../../../../apps/web/src/components/usecases/UseCaseForm", () => ({
  UseCaseForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="use-case-form" />
    );
  },
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("../../../../apps/web/src/hooks/useFeatures", () => ({
  useFeatures: () => ({
    features: [],
    loading: false,
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useUseCases", () => ({
  useUseCases: () => ({
    createUseCase: vi.fn(),
    updateUseCase: vi.fn(),
    removeUseCase: vi.fn(),
  }),
}));

beforeEach(() => {
  router.params = { id: "10" };
  router.search = "returnTo=%2Ffeatures";
  router.navigate.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UseCaseDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", async () => {
    const { container } = render(<UseCaseDetailPage />);

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
    render(<UseCaseDetailPage />);

    expect(
      await screen.findByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Use-Case-URL und navigiert zurück", async () => {
    render(<UseCaseDetailPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/use-cases/10", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/features");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<UseCaseDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
