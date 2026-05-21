// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - WikiPage setzt onOpenInTab nur beim Bearbeiten bestehender Metadaten.
 * - Klick öffnet die saubere Wiki-URL und navigiert zur Wiki-Übersicht.
 *
 * Fehlerfälle:
 * - Create-Modus darf keinen In-neuem-Tab-Button anzeigen.
 *
 * Ziel:
 * Die Page-Verdrahtung des Browser-Tab-Buttons für Wiki-Seiten absichern.
 */
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "../../../../apps/web/src/pages/WikiPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => router.navigate,
    useParams: () => router.params
  };
});

vi.mock("../../../../apps/web/src/components/wiki/WikiPageDetail", () => ({
  WikiPageDetail({ onEditMetadata }: { onEditMetadata: () => void }) {
    return (
      <button type="button" onClick={onEditMetadata}>
        Metadaten
      </button>
    );
  }
}));

vi.mock("../../../../apps/web/src/components/wiki/WikiPageForm", () => ({
  WikiPageForm({ open, onOpenInTab }: { open: boolean; onOpenInTab?: () => void }) {
    if (!open) {
      return null;
    }
    return onOpenInTab ? (
      <button type="button" onClick={onOpenInTab}>
        In neuem Tab öffnen
      </button>
    ) : (
      <div data-testid="wiki-page-form" />
    );
  }
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) })
}));

vi.mock("../../../../apps/web/src/hooks/useWiki", () => ({
  useWiki: () => ({
    page: router.params.id
      ? {
          id: 10,
          projectId: null,
          parentId: null,
          title: "Wiki Alpha",
          slug: "wiki-alpha",
          content: null,
          contentPath: null,
          sortOrder: 0,
          childCount: 0,
          version: 1,
          createdAt: "2026-05-20T08:00:00.000Z",
          updatedAt: "2026-05-20T08:00:00.000Z"
        }
      : undefined,
    tree: [],
    breadcrumb: [],
    loading: false,
    error: null,
    createWikiPage: vi.fn(),
    updateWikiPage: vi.fn(),
    removeWikiPage: vi.fn()
  })
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WikiPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  router.params = { id: "10" };
  router.navigate.mockReset();
  vi.spyOn(window, "open").mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WikiPage openInTab", () => {
  it("zeigt im Edit-Modus den 'In neuem Tab öffnen'-Button", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Metadaten" }));

    expect(screen.getByRole("button", { name: "In neuem Tab öffnen" })).toBeInTheDocument();
  });

  it("öffnet die Wiki-URL und navigiert zur Übersicht", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Metadaten" }));

    fireEvent.click(screen.getByRole("button", { name: "In neuem Tab öffnen" }));

    expect(window.open).toHaveBeenCalledWith("/wiki/10", "_blank");
    expect(router.navigate).toHaveBeenCalledWith("/wiki");
  });

  it("zeigt im Create-Modus keinen 'In neuem Tab öffnen'-Button", () => {
    router.params = {};
    renderPage();
    const createButtons = screen.getAllByRole("button", { name: "Neue Seite" });
    expect(createButtons[0]).toBeDefined();

    fireEvent.click(createButtons[0] as HTMLElement);

    expect(screen.queryByRole("button", { name: "In neuem Tab öffnen" })).not.toBeInTheDocument();
  });
});
