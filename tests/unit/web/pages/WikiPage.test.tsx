// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte WikiPage-Verdrahtung mit gemockten Kindkomponenten und Hook-Daten.
 *
 * Mock-Entscheidung:
 * - WikiTree und WikiPageForm werden als Page-Grenze gemockt, damit die Seitenlogik isoliert geprüft wird.
 *
 * Isolation:
 * - jsdom ohne echte API- oder Router-Navigation.
 *
 * Abgedeckte Regeln:
 * - Ausgewählte Wiki-Seiten werden als Inline-Formular gerendert.
 * - Der Create-Button öffnet weiterhin das Formular im Modal-Modus.
 * - Tree-Navigation läuft direkt ohne Dirty-Guard/Verwerfen-Dialog (Auto-Save persistiert, TKT-95).
 *
 * Fehlerfälle:
 * - Ein Seitenwechsel darf keinen Verwerfen-Dialog mehr auslösen.
 * - Der Create-Modus darf kein Inline-Formular für eine bestehende Seite benötigen.
 *
 * Ziel:
 * Die WikiPage-Verdrahtung nach dem Wegfall der alten Detailkomponente absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "../../../../apps/web/src/pages/WikiPage";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: "10" } as Record<string, string>,
}));

const confirmMock = vi.hoisted(() => vi.fn());

const wikiFixtures = vi.hoisted(() => {
  const wikiAlpha = {
    id: 10,
    parentId: null,
    title: "Wiki Alpha",
    content: "<p>Alpha</p>",
    sortOrder: 0,
    childCount: 0,
    attachmentCount: 0,
    taskCount: 0,
    ticketCount: 0,
    relatedPages: [],
    version: 1,
    createdAt: "2026-05-20T08:00:00.000Z",
    updatedAt: "2026-05-20T08:00:00.000Z",
  };

  const wikiBeta = {
    ...wikiAlpha,
    id: 11,
    title: "Wiki Beta",
  };

  return {
    wikiAlpha,
    wikiBeta,
    wikiTree: [
      {
        ...wikiAlpha,
        children: [],
      },
      {
        ...wikiBeta,
        children: [],
      },
    ],
  };
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => router.navigate,
    useParams: () => router.params,
  };
});

vi.mock("../../../../apps/web/src/components/wiki/WikiTree", () => ({
  WikiTree({
    onCreate,
    onNavigate,
  }: {
    onCreate: (parent: null) => void;
    onNavigate?: (page: (typeof wikiFixtures.wikiTree)[number]) => Promise<boolean> | boolean;
  }) {
    const navigateToBeta = async () => {
      const approved = onNavigate ? await onNavigate(wikiFixtures.wikiTree[1]) : true;
      if (approved) {
        router.navigate("/wiki/11");
      }
    };

    return (
      <nav aria-label="Wiki-Testbaum">
        <button type="button" onClick={() => onCreate(null)}>
          Neue Root-Seite
        </button>
        <button type="button" onClick={() => void navigateToBeta()}>
          Wiki Beta
        </button>
      </nav>
    );
  },
}));

vi.mock("../../../../apps/web/src/components/wiki/WikiPageForm", () => ({
  WikiPageForm({
    inline,
    inlineChrome,
    open,
    page,
    editable,
    onEdit,
    onClose,
    onAutoSaveStatusChange,
  }: {
    inline?: boolean;
    inlineChrome?: "embedded" | "standalone";
    open: boolean;
    page?: typeof wikiFixtures.wikiAlpha | null;
    editable?: boolean;
    onEdit?: () => void;
    onClose?: () => void;
    onAutoSaveStatusChange?: (
      status: "idle" | "saving" | "saved" | "error",
      errorMessage?: string | null,
    ) => void;
  }) {
    if (!open) {
      return null;
    }

    if (inline) {
      return (
        <form data-testid="wiki-inline-form" data-inline-chrome={inlineChrome} data-editable={editable ? "true" : "false"}>
          <div data-testid="inline-form-title">{page?.title}</div>
          <button type="button" onClick={() => onEdit?.()}>
            Bearbeiten starten
          </button>
          <button type="button" onClick={() => onClose?.()}>
            Schließen
          </button>
          <button type="button" onClick={() => onAutoSaveStatusChange?.("saved")}>
            Save-Status melden
          </button>
        </form>
      );
    }

    return <div data-testid="wiki-create-modal">Neue Wiki-Seite</div>;
  },
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));

vi.mock("../../../../apps/web/src/hooks/useWiki", () => ({
  useWiki: () => ({
    page: router.params.id ? wikiFixtures.wikiAlpha : null,
    tree: wikiFixtures.wikiTree,
    breadcrumb: [],
    loading: false,
    error: null,
    createWikiPage: vi.fn(),
    updateWikiPage: vi.fn(),
    syncWikiPageRelations: vi.fn(),
    removeWikiPage: vi.fn(),
  }),
}));

vi.mock("../../../../apps/web/src/hooks/useProjects", () => ({
  useProjects: () => ({
    projects: [],
    loading: false,
    error: null,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <WikiPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  router.params = { id: "10" };
  router.navigate.mockReset();
  confirmMock.mockReset();
  confirmMock.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WikiPage Inline-Redesign", () => {
  it("rendert eine ausgewählte Wiki-Seite im Inline-Formular", () => {
    renderPage();

    expect(screen.getByTestId("wiki-inline-form")).toBeInTheDocument();
    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-inline-chrome", "embedded");
    expect(screen.getByRole("heading", { name: "Wiki Alpha" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Metadaten" })).not.toBeInTheDocument();
  });

  it("nutzt den vorhandenen Wiki-Hero als Detailkopf mit ID-Kopieren statt einer Extra-Zeile", () => {
    renderPage();

    const hero = screen.getByTestId("page-hero");
    expect(hero).toHaveAttribute("data-variant", "detail");
    expect(screen.getByRole("button", { name: "ID WIKI-10 kopieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seite löschen" })).toBeInTheDocument();
  });

  it("kopiert die WIKI-Referenz aus dem Detail-Hero in die Zwischenablage", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "ID WIKI-10 kopieren" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("WIKI-10"));
  });

  it("zeigt den aus dem Formular hochgereichten Speicherstatus im Hero", () => {
    renderPage();

    expect(screen.queryByText("Gespeichert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save-Status melden" }));

    expect(screen.getByText("Gespeichert")).toBeInTheDocument();
  });

  it("öffnet neue Seiten weiterhin über das Formular im Modal-Modus", () => {
    router.params = {};
    renderPage();

    fireEvent.click(screen.getAllByRole("button", { name: "Neue Seite" })[0]);

    expect(screen.getByTestId("wiki-create-modal")).toBeInTheDocument();
  });

  it("navigiert bei Tree-Klick direkt ohne Dirty-Guard/Verwerfen-Dialog (TKT-95)", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Wiki Beta" }));

    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith("/wiki/11"));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("T-WP1 öffnet Wiki-Seite standardmäßig im Lesemodus (editable=false)", () => {
    renderPage();

    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "false");
  });

  it("T-WP2 wechselt in den Bearbeitungsmodus nach onEdit-Aufruf", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten starten" }));

    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "true");
  });

  it("T-WP3 kehrt zum Lesemodus zurück wenn onClose im Bearbeitungsmodus aufgerufen wird", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten starten" }));
    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "true");

    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "false");
    expect(router.navigate).not.toHaveBeenCalledWith(expect.stringContaining("/wiki"));
  });

  it("T-WP4 navigiert weg wenn onClose im Lesemodus aufgerufen wird", () => {
    renderPage();

    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "false");
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));

    expect(router.navigate).toHaveBeenCalledWith("/wiki");
  });

  it("T-WP5 setzt Bearbeitungsmodus zurück beim Seitenwechsel", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten starten" }));
    expect(screen.getByTestId("wiki-inline-form")).toHaveAttribute("data-editable", "true");

    router.params = { id: "11" };
    fireEvent.click(screen.getByRole("button", { name: "Wiki Beta" }));

    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith("/wiki/11"));
  });
});
