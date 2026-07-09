// @vitest-environment jsdom

/**
 * Test Scope:
 * DocumentsPage — Zuweisen per Drag & Drop und die Trennung von Filtern und Zuweisen (MS-75).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DocumentsPage-Verdrahtung inkl. echter DocumentSidePanel- und DocumentTile-Komponenten.
 *   Auswahl, Filterzustand und Drop-Auflösung laufen im echten Seitencode.
 *
 * Mock-Entscheidung:
 * - `@dnd-kit/core` wird als Page-Grenze gemockt (Muster aus WikiTree.test.tsx): Die Bibliothek ist
 *   der externe Collaborator; geprüft wird unsere Drop-Auflösung, nicht dnd-kit. Der Mock greift
 *   `onDragEnd` ab und protokolliert die an `useDraggable`/`useDroppable` übergebenen Optionen.
 * - Datenhooks, Toast und Asset-URL werden gemockt; Uploader und Viewer sind für diese Prüfung
 *   ohne Belang und werden als Stubs ersetzt.
 *
 * Isolation:
 * - jsdom, keine API-Aufrufe, keine echte Navigation.
 *
 * Abgedeckte Regeln:
 * - Ein Drop auf eine Sammlung sortiert genau die gezogenen Dokumente ein; auf eine Kategorie weist zu.
 * - Wird eine markierte Kachel gezogen, wandert die ganze Auswahl mit; eine unmarkierte allein.
 * - Ein Drop ins Leere oder auf eine Nicht-Zielzeile bleibt folgenlos.
 * - Ohne Schreibrecht sind Ziehen und Ablegen deaktiviert und lösen keine Schreiboperation aus.
 * - Ein Klick auf eine Sammlung filtert — auch bei aktiver Auswahl — und schreibt nichts.
 * - Ausgefilterte Dokumente (Server-Filter wie Endungsfilter) verlieren ihre Markierung, sobald
 *   die Liste vollständig geladen ist; die Drag-Nutzlast enthält danach nur sichtbare IDs.
 *
 * Fehlerfälle:
 * - Drop ohne Ziel, Drop auf eine fremde ID, Drop ohne `attachments:write`.
 * - Unvollständig geladene Liste: die Auswahl darf NICHT bereinigt werden (zwischen zwei Blöcken
 *   sind `loading` und `loadingMore` beide false, obwohl noch Dokumente fehlen).
 *
 * Ziel:
 * Den früheren Doppelmodus (Klick = filtern ODER zuweisen) dauerhaft ausschließen und beweisen,
 * dass eine Massenzuweisung nur durch eine echte Ziehbewegung auf ein echtes Ziel entsteht.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as ((event: unknown) => void) | undefined,
  draggables: new Map<string, { data?: unknown; disabled?: boolean }>(),
  droppables: new Map<string, { disabled?: boolean }>(),
}));

const actions = vi.hoisted(() => ({
  addToFolderBulk: vi.fn(async () => undefined),
  assignCategoryBulk: vi.fn(async () => undefined),
  uploadDocument: vi.fn(async () => undefined),
  deleteDocument: vi.fn(async () => undefined),
  setTags: vi.fn(async () => undefined),
  updateMetadata: vi.fn(async () => undefined),
  removeCategory: vi.fn(async () => undefined),
  removeFromFolder: vi.fn(async () => undefined),
  downloadDocument: vi.fn(async () => new Blob()),
  downloadZip: vi.fn(async () => new Blob()),
}));

const permissions = vi.hoisted(() => ({ canWrite: true, canDelete: true }));

const library = vi.hoisted(() => ({ lastFilter: {} as Record<string, unknown> }));

const fixtures = vi.hoisted(() => {
  const document = (id: number, extension: string, mimetype: string) => ({
    id,
    owners: [],
    originalName: `Doc-${id}.${extension}`,
    displayName: null,
    description: null,
    filename: `stored-${id}.${extension}`,
    mimetype,
    size: 1024,
    url: `/uploads/stored-${id}.${extension}`,
    categories: [],
    tags: [],
    folders: [],
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    version: 1,
  });
  const all = [
    document(1, "pdf", "application/pdf"),
    document(2, "pdf", "application/pdf"),
    document(3, "txt", "text/plain"),
  ];
  return {
    all,
    // Veränderlich: was der Bibliotheks-Hook gerade liefert. Ein Test kann damit einen
    // Filterwechsel (Dokument fällt heraus) und einen unvollständigen Ladezustand simulieren.
    documents: [...all],
    isComplete: true,
    folders: [
      { id: 7, parentId: null, projectId: null, name: "Rechnungen", version: 1 },
    ],
    categories: [{ id: 42, name: "Wichtig", color: "#ff0000", version: 1 }],
  };
});

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd?: (event: unknown) => void;
  }) => {
    dnd.onDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PointerSensor: class PointerSensor {},
  useSensor: () => ({}),
  useSensors: () => [],
  useDraggable: (options: { id: string; data?: unknown; disabled?: boolean }) => {
    dnd.draggables.set(options.id, {
      data: options.data,
      disabled: options.disabled,
    });
    return { setNodeRef: () => undefined, listeners: {}, isDragging: false };
  },
  useDroppable: (options: { id: string; disabled?: boolean }) => {
    dnd.droppables.set(options.id, { disabled: options.disabled });
    return { setNodeRef: () => undefined, isOver: false };
  },
}));

vi.mock("../../../../apps/web/src/hooks/useDocuments", () => ({
  useDocumentLibrary: (filter: Record<string, unknown>) => {
    library.lastFilter = filter;
    return {
      documents: fixtures.documents,
      total: fixtures.all.length,
      loadedCount: fixtures.documents.length,
      loading: false,
      loadingMore: false,
      isComplete: fixtures.isComplete,
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
  useHasPermission: (_resource: string, action: string) =>
    action === "write" ? permissions.canWrite : permissions.canDelete,
}));

vi.mock("../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({ tags: [] }),
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

// `api/documents` (nicht gemockt) importiert `api` und `apiBaseUrl` — die Kachel baut daraus die
// Quelle ihres Vorschaubilds. Fehlt ein Export, scheitert bereits der Import.
vi.mock("../../../../apps/web/src/api/client", () => ({
  assetUrl: (path: string) => path,
  apiBaseUrl: "http://api.test/api",
  api: {},
}));

vi.mock("../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader: () => <div data-testid="uploader" />,
}));

vi.mock("../../../../apps/web/src/components/attachments/DocumentViewer", () => ({
  DocumentViewer: () => <div data-testid="viewer" />,
}));

// Nach den Mocks importieren, damit die Seite die Stubs sieht.
const { DocumentsPage } = await import(
  "../../../../apps/web/src/pages/DocumentsPage"
);

function fireDrop(overId: string | null, ids: number[]) {
  act(() => {
    dnd.onDragEnd?.({
      active: { data: { current: { ids } } },
      over: overId === null ? null : { id: overId },
    });
  });
}

function checkboxFor(id: number) {
  return screen.getByRole("checkbox", { name: `„Doc-${id}" auswählen` });
}

function selectDocument(id: number) {
  fireEvent.click(checkboxFor(id));
}

beforeEach(() => {
  permissions.canWrite = true;
  permissions.canDelete = true;
  library.lastFilter = {};
  fixtures.documents = [...fixtures.all];
  fixtures.isComplete = true;
  dnd.draggables.clear();
  dnd.droppables.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentsPage — Zuweisen per Drag & Drop", () => {
  it("sortiert die gezogene Auswahl in die Sammlung ein, auf die abgelegt wurde", () => {
    render(<DocumentsPage />);
    selectDocument(1);
    selectDocument(2);

    // Die markierte Kachel trägt die gesamte Auswahl als Nutzlast, die unmarkierte nur sich selbst.
    expect(dnd.draggables.get("dms-doc-1")?.data).toEqual({ ids: [1, 2] });
    expect(dnd.draggables.get("dms-doc-3")?.data).toEqual({ ids: [3] });

    fireDrop("dms-folder-7", [1, 2]);

    expect(actions.addToFolderBulk).toHaveBeenCalledTimes(1);
    expect(actions.addToFolderBulk).toHaveBeenCalledWith(7, [1, 2]);
    // Gegenbeispiel: Das nicht markierte Dokument 3 ist nicht betroffen, und keine Kategorie wurde gesetzt.
    expect(actions.assignCategoryBulk).not.toHaveBeenCalled();
  });

  it("weist beim Ablegen auf eine Kategorie die Kategorie zu, nicht die Sammlung", () => {
    render(<DocumentsPage />);
    fireDrop("dms-category-42", [3]);

    expect(actions.assignCategoryBulk).toHaveBeenCalledTimes(1);
    expect(actions.assignCategoryBulk).toHaveBeenCalledWith(42, [3]);
    expect(actions.addToFolderBulk).not.toHaveBeenCalled();
  });

  it("bleibt folgenlos beim Drop ins Leere oder auf eine Nicht-Zielzeile", () => {
    render(<DocumentsPage />);

    fireDrop(null, [1, 2]);
    fireDrop("dms-doc-2", [1]);

    expect(actions.addToFolderBulk).not.toHaveBeenCalled();
    expect(actions.assignCategoryBulk).not.toHaveBeenCalled();
  });

  it("bietet „Alle Dokumente“ und „Nicht einsortiert“ nicht als Ablageziel an", () => {
    render(<DocumentsPage />);

    // Genau die echten Sammlungen und Kategorien sind Ziele — die Filterzeilen nicht.
    expect([...dnd.droppables.keys()].sort()).toEqual([
      "dms-category-42",
      "dms-folder-7",
    ]);
  });

  it("schreibt ohne Schreibrecht nicht und deaktiviert Ziehen wie Ablegen", () => {
    permissions.canWrite = false;
    render(<DocumentsPage />);

    expect(dnd.draggables.get("dms-doc-1")?.disabled).toBe(true);
    expect(dnd.droppables.get("dms-folder-7")?.disabled).toBe(true);

    // Selbst ein künstlich ausgelöster Drop darf nichts schreiben — das Frontend-Gating
    // ist nur Komfort, der Guard im Drop-Handler muss halten.
    fireDrop("dms-folder-7", [1]);
    expect(actions.addToFolderBulk).not.toHaveBeenCalled();
  });
});

describe("DocumentsPage — Klick filtert, auch bei aktiver Auswahl", () => {
  it("filtert bei einem Klick auf eine Sammlung und löst keine Zuweisung aus", () => {
    render(<DocumentsPage />);
    selectDocument(1);
    selectDocument(2);
    expect(screen.getByText("2 ausgewählt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rechnungen" }));

    // Beobachtbar: Der Bibliotheksfilter zeigt jetzt auf die Sammlung …
    expect(library.lastFilter).toEqual({ folder: 7 });
    // … und es wurde nichts geschrieben. Das ist der Regressionsschutz gegen den alten Doppelmodus.
    expect(actions.addToFolderBulk).not.toHaveBeenCalled();
    expect(actions.assignCategoryBulk).not.toHaveBeenCalled();
  });

  it("filtert bei einem Klick auf eine Kategorie und löst keine Zuweisung aus", () => {
    render(<DocumentsPage />);
    selectDocument(1);

    fireEvent.click(screen.getByRole("button", { name: "Wichtig" }));

    expect(library.lastFilter).toEqual({ category: 42 });
    expect(actions.assignCategoryBulk).not.toHaveBeenCalled();
    expect(actions.addToFolderBulk).not.toHaveBeenCalled();
  });
});

describe("DocumentsPage — ausgefilterte Dokumente verlieren ihre Markierung", () => {
  it("deselektiert ein Dokument, das aus der gefilterten Ergebnisliste gefallen ist", () => {
    const { rerender } = render(<DocumentsPage />);
    selectDocument(1);
    selectDocument(2);
    expect(screen.getByText("2 ausgewählt")).toBeInTheDocument();

    // Dokument 2 fällt aus der Ergebnisliste (Sammlungs-, Kategorie-, Label- oder Suchfilter).
    fixtures.documents = fixtures.all.filter((doc) => doc.id !== 2);
    rerender(<DocumentsPage />);

    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
    // Gegenbeispiel: das weiterhin sichtbare Dokument 1 bleibt markiert.
    expect(checkboxFor(1)).toBeChecked();
  });

  it("deselektiert ein Dokument, das der Endungsfilter ausblendet", () => {
    render(<DocumentsPage />);
    selectDocument(1); // .pdf
    selectDocument(3); // .txt
    expect(screen.getByText("2 ausgewählt")).toBeInTheDocument();

    fireEvent.change(
      screen.getByTitle("Nach Dateiendung in der aktuellen Ansicht filtern"),
      { target: { value: "txt" } },
    );

    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
    expect(checkboxFor(3)).toBeChecked();
  });

  it("lässt die Auswahl unangetastet, solange noch Blöcke nachgeladen werden", () => {
    const { rerender } = render(<DocumentsPage />);
    selectDocument(1);
    selectDocument(2);

    // Zustand zwischen zwei Blöcken des progressiven Nachladens: `loading` und `loadingMore` sind
    // beide false, die Liste ist aber unvollständig. Hier darf NICHTS bereinigt werden — sonst
    // verlöre eine Auswahl Dokumente, die bloß noch nicht geladen sind.
    fixtures.isComplete = false;
    fixtures.documents = fixtures.all.filter((doc) => doc.id === 1);
    rerender(<DocumentsPage />);

    expect(screen.getByText("2 ausgewählt")).toBeInTheDocument();
  });

  it("zieht nach der Bereinigung nur noch sichtbare Dokumente", () => {
    const { rerender } = render(<DocumentsPage />);
    selectDocument(1);
    selectDocument(2);
    expect(dnd.draggables.get("dms-doc-1")?.data).toEqual({ ids: [1, 2] });

    fixtures.documents = fixtures.all.filter((doc) => doc.id !== 2);
    rerender(<DocumentsPage />);

    // Das unsichtbar gewordene Dokument 2 kann nicht mehr stillschweigend mitgezogen werden.
    expect(dnd.draggables.get("dms-doc-1")?.data).toEqual({ ids: [1] });
  });
});
