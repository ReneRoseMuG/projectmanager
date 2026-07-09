// @vitest-environment jsdom

/**
 * Test Scope:
 * DocumentsPage — Sammlung und Kategorie als Ablage-Kontext des Uploads (MS-75).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DocumentsPage-Verdrahtung: Filterzustand, Upload-Handler und das Leeren der
 *   einschränkenden Filter laufen im echten Seitencode.
 *
 * Mock-Entscheidung:
 * - `@dnd-kit/core` als Page-Grenze (hier nicht unter Test), Datenhooks und Toast gestubbt.
 * - `AttachmentUploader` wird durch eine Schaltfläche ersetzt, die `onUpload` mit einer echten
 *   `File`-Instanz aufruft — geprüft wird die Seitenlogik, nicht die Drag-&-Drop-Fläche.
 *
 * Isolation:
 * - jsdom, keine API-Aufrufe, keine echte Navigation.
 *
 * Abgedeckte Regeln:
 * - Die geöffnete Sammlung und die gewählte Kategorie werden als Ziel an den Upload übergeben.
 * - Ohne Sammlungs-/Kategoriekontext wird kein Ziel übergeben.
 * - Während der einzelnen Dateien wird WEDER nachgeladen NOCH je Datei ein Erfolg gemeldet.
 * - Am Ende des Upload-Vorgangs wird GENAU EINMAL nachgeladen, die Erfolge werden in EINEM Toast
 *   zusammengefasst, und der Toast benennt das Ziel (keine verborgene Schreibwirkung).
 * - Erst am Ende werden Label-, Typ-, Endungsfilter und Suche geleert; Sammlung und Kategorie
 *   bleiben erhalten.
 *
 * Fehlerfälle:
 * - Schlägt der Upload fehl, bleiben die Filter unangetastet.
 * - Kam keine einzige Datei durch, wird nicht nachgeladen und kein Erfolg gemeldet.
 *
 * Ziel:
 * Absichern, dass eine hochgeladene Datei danach sichtbar ist und der Nutzer erfährt, wohin sie
 * einsortiert wurde.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  uploadDocument: vi.fn(async () => undefined),
  refreshDocuments: vi.fn(async () => undefined),
  addToFolderBulk: vi.fn(async () => undefined),
  assignCategoryBulk: vi.fn(async () => undefined),
  deleteDocument: vi.fn(async () => undefined),
  setTags: vi.fn(async () => undefined),
  updateMetadata: vi.fn(async () => undefined),
  removeCategory: vi.fn(async () => undefined),
  removeFromFolder: vi.fn(async () => undefined),
  downloadDocument: vi.fn(async () => new Blob()),
  downloadZip: vi.fn(async () => new Blob()),
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));

const library = vi.hoisted(() => ({ lastFilter: {} as Record<string, unknown> }));

const fixtures = vi.hoisted(() => ({
  documents: [
    {
      id: 1,
      owners: [],
      originalName: "Doc-1.pdf",
      displayName: null,
      description: null,
      filename: "stored-1.pdf",
      mimetype: "application/pdf",
      size: 1024,
      url: "/uploads/stored-1.pdf",
      categories: [],
      tags: [],
      folders: [],
      createdAt: "2026-07-07T08:00:00.000Z",
      updatedAt: "2026-07-07T08:00:00.000Z",
      version: 1,
    },
  ],
  folders: [
    { id: 7, parentId: null, projectId: null, name: "Rechnungen", version: 1 },
  ],
  categories: [{ id: 42, name: "Wichtig", color: "#ff0000", version: 1 }],
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PointerSensor: class PointerSensor {},
  useSensor: () => ({}),
  useSensors: () => [],
  useDraggable: () => ({ setNodeRef: () => undefined, listeners: {}, isDragging: false }),
  useDroppable: () => ({ setNodeRef: () => undefined, isOver: false }),
}));

vi.mock("../../../../apps/web/src/hooks/useDocuments", () => ({
  useDocumentLibrary: (filter: Record<string, unknown>) => {
    library.lastFilter = filter;
    return {
      documents: fixtures.documents,
      total: fixtures.documents.length,
      loadedCount: fixtures.documents.length,
      loading: false,
      loadingMore: false,
      isComplete: true,
      error: undefined,
    };
  },
  useFolders: () => ({
    folders: fixtures.folders,
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
  }),
  useCategories: () => ({
    categories: fixtures.categories,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  }),
  useDocumentActions: () => actions,
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({ tags: [] }),
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => toast,
}));

// `api/documents` (nicht gemockt) importiert `api` und `apiBaseUrl` — die Kachel baut daraus die
// Quelle ihres Vorschaubilds. Fehlt ein Export, scheitert bereits der Import.
vi.mock("../../../../apps/web/src/api/client", () => ({
  assetUrl: (path: string) => path,
  apiBaseUrl: "http://api.test/api",
  api: {},
}));

// Der echte Uploader ruft `onUpload` je Datei und `onBatchComplete` einmal am Ende. Beides wird hier
// über je eine Schaltfläche steuerbar gemacht; die Reihenfolge selbst prüft AttachmentUploader.test.
vi.mock("../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader: ({
    onUpload,
    onBatchComplete,
  }: {
    onUpload: (file: File) => Promise<unknown>;
    onBatchComplete?: () => void | Promise<void>;
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          void onUpload(new File(["x"], "neu.pdf", { type: "application/pdf" }));
        }}
      >
        Datei hochladen
      </button>
      <button type="button" onClick={() => void onBatchComplete?.()}>
        Upload abschließen
      </button>
    </>
  ),
}));

vi.mock("../../../../apps/web/src/components/attachments/DocumentViewer", () => ({
  DocumentViewer: () => <div data-testid="viewer" />,
}));

const { DocumentsPage } = await import(
  "../../../../apps/web/src/pages/DocumentsPage"
);

async function upload(times = 1) {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Datei hochladen" }));
    });
  }
}

async function completeBatch() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Upload abschließen" }));
  });
}

function openCollectionAndCategory() {
  fireEvent.click(screen.getByRole("button", { name: "Rechnungen" }));
  fireEvent.click(screen.getByRole("button", { name: "Wichtig" }));
}

beforeEach(() => {
  library.lastFilter = {};
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentsPage — Upload übernimmt den Ablage-Kontext", () => {
  it("übergibt die geöffnete Sammlung und die gewählte Kategorie als Ziel", async () => {
    render(<DocumentsPage />);
    openCollectionAndCategory();

    await upload();

    expect(actions.uploadDocument).toHaveBeenCalledTimes(1);
    expect(actions.uploadDocument).toHaveBeenCalledWith(expect.any(File), 7, 42);
  });

  it("übergibt kein Ziel, solange „Alle Dokumente“ ohne Kategorie gewählt ist", async () => {
    render(<DocumentsPage />);

    await upload();

    expect(actions.uploadDocument).toHaveBeenCalledWith(
      expect.any(File),
      undefined,
      undefined,
    );
  });

  it("benennt das Ziel im Erfolgs-Toast, statt es stillschweigend zu schreiben", async () => {
    render(<DocumentsPage />);
    openCollectionAndCategory();

    await upload();
    await completeBatch();

    expect(toast.showToast).toHaveBeenCalledTimes(1);
    expect(toast.showToast).toHaveBeenCalledWith({
      tone: "success",
      title: "Dokument hochgeladen",
      message: `Einsortiert in Sammlung „Rechnungen" · Kategorie „Wichtig"`,
    });
  });
});

describe("DocumentsPage - Download", () => {
  it("laedt die Auswahl als Zip und gibt die Blob-URL verzoegert frei", async () => {
    vi.useFakeTimers();
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const createObjectUrl = vi.fn(() => "blob:zip");
    const revokeObjectUrl = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });

    try {
      render(<DocumentsPage />);
      fireEvent.click(screen.getByText("Doc-1"));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Als Zip" }));
      });

      expect(actions.downloadZip).toHaveBeenCalledWith([1]);
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrl).not.toHaveBeenCalled();

      vi.runOnlyPendingTimers();
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:zip");
    } finally {
      vi.useRealTimers();
      click.mockRestore();
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectUrl });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectUrl });
    }
  });
});

describe("DocumentsPage — es wird einmal je Upload-Vorgang nachgeladen", () => {
  it("lädt während der einzelnen Dateien weder nach noch meldet es sie einzeln", async () => {
    render(<DocumentsPage />);

    await upload(3);

    expect(actions.uploadDocument).toHaveBeenCalledTimes(3);
    // Der teure Teil: eine Invalidierung je Datei würde die gesamte Bibliothek dreimal neu laden.
    expect(actions.refreshDocuments).not.toHaveBeenCalled();
    // Und 20 Erfolgs-Toasts wären unbrauchbar.
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("lädt nach dem Upload-Vorgang genau einmal nach und fasst die Erfolge zusammen", async () => {
    render(<DocumentsPage />);
    openCollectionAndCategory();

    await upload(3);
    await completeBatch();

    expect(actions.refreshDocuments).toHaveBeenCalledTimes(1);
    expect(toast.showToast).toHaveBeenCalledTimes(1);
    expect(toast.showToast).toHaveBeenCalledWith({
      tone: "success",
      title: "3 Dokumente hochgeladen",
      message: `Einsortiert in Sammlung „Rechnungen" · Kategorie „Wichtig"`,
    });
  });

  it("lädt nicht nach und meldet keinen Erfolg, wenn keine Datei durchkam", async () => {
    // Bewusst `…Once`: `vi.clearAllMocks()` setzt nur die Aufrufe zurück, nicht die Implementierung —
    // ein dauerhaftes mockRejectedValue würde in die folgenden Tests durchsickern.
    actions.uploadDocument
      .mockRejectedValueOnce(new Error("Upload kaputt"))
      .mockRejectedValueOnce(new Error("Upload kaputt"));
    render(<DocumentsPage />);

    await upload(2);
    await completeBatch();

    expect(actions.refreshDocuments).not.toHaveBeenCalled();
    // Nur die beiden Fehler-Toasts, kein Erfolgs-Toast.
    expect(toast.showToast).toHaveBeenCalledTimes(2);
    expect(toast.showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ tone: "success" }),
    );
  });
});

describe("DocumentsPage — einschränkende Filter nach dem Upload", () => {
  it("leert Suche und Typfilter, behält aber Sammlung und Kategorie", async () => {
    render(<DocumentsPage />);
    openCollectionAndCategory();

    fireEvent.change(screen.getByPlaceholderText("Dokumente durchsuchen…"), {
      target: { value: "Rechnung" },
    });
    // Reihenfolge der Dropdowns: Labels, Typen, Endungen.
    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: "application/pdf" },
    });
    expect(library.lastFilter).toEqual({
      folder: 7,
      category: 42,
      type: "application/pdf",
      q: "Rechnung",
    });

    await upload();
    // Geräumt wird erst am Ende des Vorgangs, nicht nach jeder einzelnen Datei.
    expect(library.lastFilter).toEqual({
      folder: 7,
      category: 42,
      type: "application/pdf",
      q: "Rechnung",
    });

    await completeBatch();

    // Die neue Datei bliebe sonst hinter Suche und Typfilter verborgen. Der Ablage-Kontext bleibt.
    expect(library.lastFilter).toEqual({ folder: 7, category: 42 });
  });

  it("lässt die Filter stehen, wenn der Upload fehlschlägt", async () => {
    actions.uploadDocument.mockRejectedValueOnce(new Error("Upload kaputt"));
    render(<DocumentsPage />);
    openCollectionAndCategory();

    fireEvent.change(screen.getByPlaceholderText("Dokumente durchsuchen…"), {
      target: { value: "Rechnung" },
    });

    await upload();
    await completeBatch();

    expect(library.lastFilter).toEqual({
      folder: 7,
      category: 42,
      q: "Rechnung",
    });
    expect(actions.refreshDocuments).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error" }),
    );
  });
});
