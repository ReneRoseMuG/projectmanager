// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - FeatureDetailPage setzt onOpenInTab nur im Edit-Modus.
 * - Klick öffnet die saubere Feature-URL und navigiert zum returnTo-Wert.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Features absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureDetailPage } from "../../../../apps/web/src/pages/FeatureDetailPage";

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

vi.mock("../../../../apps/web/src/components/features/FeatureForm", () => ({
  FeatureForm({ onOpenInTab }: { onOpenInTab?: () => void }) {
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="feature-form" />
    );
  },
  parseFeatureFormTab: () => undefined,
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));

vi.mock("../../../../apps/web/src/hooks/useFeatures", () => ({
  useFeatures: () => ({
    feature: router.params.id
      ? {
          id: 10,
          title: "Feature Alpha",
          status: "active",
          description: null,
          content: null,
          contentPath: null,
          sortOrder: 0,
          useCaseCount: 0,
          attachmentCount: 0,
          noteCount: 0,
          commentCount: 0,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z",
        }
      : undefined,
    loading: false,
    createFeature: vi.fn(),
    updateFeature: vi.fn(),
    removeFeature: vi.fn(),
    reload: vi.fn(),
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
  vi.restoreAllMocks();
});

describe("FeatureDetailPage openInTab", () => {
  it("nutzt die volle verfügbare Detailseitenbreite", () => {
    const { container } = render(<FeatureDetailPage />);

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
    render(<FeatureDetailPage />);

    expect(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    ).toBeInTheDocument();
  });

  it("öffnet die Feature-URL und navigiert zurück", () => {
    render(<FeatureDetailPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "In neuem Tab öffnen" }),
    );

    expect(window.open).toHaveBeenCalledWith("/features/10?standalone=1", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/features");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};

    render(<FeatureDetailPage />);

    expect(
      screen.queryByRole("button", { name: "In neuem Tab öffnen" }),
    ).not.toBeInTheDocument();
  });
});
