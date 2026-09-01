// @vitest-environment jsdom

/**
 * Test Scope:
 * DocumentsPage — MS-80-Dokumentbibliothek mit wiederhergestellter Thumbnail-Grid-Ansicht.
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte DocumentsPage-, DocumentTile- und Thumbnail-Größen-Verdrahtung mit realen Attachment-DTOs.
 *
 * Mock-Entscheidung:
 * - Datenhooks, Berechtigungen und Dialoge sind begrenzte Unit-Collaborators; keine API- oder DB-Mocks
 *   werden als Integrationstest ausgegeben.
 *
 * Isolation:
 * - jsdom und lokaler localStorage; keine DB, keine Upload-Verzeichnisse und keine Netzaufrufe.
 *
 * Abgedeckte Regeln:
 * - Bilder erscheinen direkt, PDF/Office/ODF fordern ein geschütztes Thumbnail an.
 * - MS-80-Tags bleiben auf der Kachel sichtbar und die Kachelgröße wird lokal persistiert.
 * - Uploads übernehmen höchstens die ausgewählte direkte Sammlung und alle aktiven DMS-Tagfilter.
 * - Der Kachelbereich ist auf Desktop direkt unterhalb der nicht scrollenden Steuerung begrenzt.
 *
 * Fehlerfälle:
 * - Ohne ausgewählte Sammlung oder Tagfilter werden keine Zuordnungen an den Upload übergeben.
 *
 * Ziel:
 * Die durch die falsche Branch-Basis verlorene Kachelansicht mit dem MS-80-Vertrag absichern.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/dom";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { Attachment } from "@taskmanager/shared-types";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  uploadDocument: vi.fn(async () => undefined),
  deleteDocumentPermanently: vi.fn(async () => undefined),
  setTags: vi.fn(async () => undefined),
  updateMetadata: vi.fn(async () => undefined),
  setDocumentFolder: vi.fn(async () => undefined),
  addTagsBulk: vi.fn(async () => undefined),
  addingTagsBulk: false,
}));

const imageDocument: Attachment = {
  id: 1,
  kind: "document",
  owners: [{ type: "project", id: 4 }],
  originalName: "Foto.png",
  displayName: null,
  description: null,
  filename: "stored-1.png",
  mimetype: "image/png",
  size: 1024,
  url: "/api/documents/1/content",
  contentHash: null,
  isInDocumentLibrary: true,
  tags: [{ id: 9, name: "Wichtig", color: "#ef4444", domain: "dms", isSystem: false, version: 1 }],
  folder: null,
  folders: [],
  createdAt: "2026-07-20T08:00:00.000Z",
  updatedAt: "2026-07-20T08:00:00.000Z",
  version: 2,
};

const pdfDocument: Attachment = {
  ...imageDocument,
  id: 2,
  owners: [],
  originalName: "Bericht.pdf",
  filename: "stored-2.pdf",
  mimetype: "application/pdf",
  url: "/api/documents/2/content",
  tags: [],
};

vi.mock("../../../../apps/web/src/hooks/useDocuments", () => ({
  useDocumentLibrary: () => ({
    documents: [imageDocument, pdfDocument],
    total: 2,
    loadedCount: 2,
    loading: false,
    loadingMore: false,
    error: undefined,
  }),
  useFolders: () => ({
    folders: [{
      id: 7,
      parentId: null,
      projectId: null,
      name: "Rechnungen",
      childCount: 0,
      directDocumentCount: 0,
      version: 1,
    }],
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
  }),
  useDocumentActions: () => actions,
}));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../apps/web/src/hooks/useTags", () => ({
  useTags: () => ({ tags: imageDocument.tags }),
}));

vi.mock("../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: vi.fn(async () => true) }),
}));

vi.mock("../../../../apps/web/src/components/documents/DocumentDuplicateCheck", () => ({
  DocumentDuplicateCheck: () => null,
}));

vi.mock("../../../../apps/web/src/components/attachments/AttachmentUploader", () => ({
  AttachmentUploader: ({ onUpload }: { onUpload: (file: File) => Promise<unknown> }) => (
    <button type="button" onClick={() => void onUpload(new File(["x"], "neu.pdf", { type: "application/pdf" }))}>
      Datei hochladen
    </button>
  ),
}));

vi.mock("../../../../apps/web/src/api/client", () => ({
  assetUrl: (path: string) => `http://assets.test${path}`,
  apiBaseUrl: "http://api.test/api",
  api: {},
}));

const { DocumentsPage } = await import("../../../../apps/web/src/pages/DocumentsPage");

function renderPage() {
  return render(
    <MemoryRouter>
      <DocumentsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DocumentsPage — Thumbnail-Grid", () => {
  it("begrenzt den scrollenden Kachelcontainer direkt unterhalb der festen Dokumentsteuerung", () => {
    renderPage();

    const controls = screen.getByRole("region", { name: "Dokumentsteuerung" });
    const thumbnails = screen.getByRole("region", { name: "Dokumentkacheln" });
    expect(controls).toHaveClass("shrink-0");
    expect(thumbnails).toHaveClass("lg:min-h-0", "lg:flex-1", "lg:overflow-y-auto");
    expect(controls.nextElementSibling).toBe(thumbnails);
  });

  it("zeigt Bilder direkt sowie PDF-Thumbnails und MS-80-Tags", () => {
    renderPage();

    expect(screen.getByRole("img", { name: "Foto.png" })).toHaveAttribute(
      "src",
      "http://assets.test/api/documents/1/content",
    );
    expect(screen.getByRole("img", { name: "Vorschau von Bericht" })).toHaveAttribute(
      "src",
      "http://api.test/api/documents/2/thumbnail",
    );
    expect(screen.getAllByText("Wichtig").length).toBeGreaterThan(0);
  });

  it("persistiert die gewählte Kachelgröße", () => {
    renderPage();

    fireEvent.click(screen.getByTitle("Kachelgröße L"));

    expect(localStorage.getItem("ui.documents.thumbnailSize")).toBe("l");
  });
});

describe("DocumentsPage — Uploadvertrag", () => {
  it("übergibt die ausgewählte direkte Sammlung und den aktiven DMS-Tag", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Rechnungen" }));
    fireEvent.click(screen.getByRole("button", { name: "Dokumente mit Tag Wichtig filtern" }));
    fireEvent.click(screen.getByRole("button", { name: "Datei hochladen" }));

    expect(actions.uploadDocument).toHaveBeenCalledWith(expect.any(File), 7, [9]);
  });

  it("übergibt ohne Sammlung oder Tagfilter keine Zuordnungen", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Datei hochladen" }));

    expect(actions.uploadDocument).toHaveBeenCalledWith(expect.any(File), undefined, []);
  });
});

describe("DocumentsPage — Mehrfachauswahl", () => {
  it("ergänzt den gewählten Tag für mehrere markierte Dokumente", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("checkbox", { name: /Foto.*auswählen/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Bericht.*auswählen/ }));
    expect(screen.getByText("2 Dokumente ausgewählt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tag hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "Wichtig" }));
    fireEvent.click(screen.getByRole("button", { name: "Tags hinzufügen" }));

    await waitFor(() => expect(actions.addTagsBulk).toHaveBeenCalledWith(
      [{ id: 1, expectedVersion: 2 }, { id: 2, expectedVersion: 2 }],
      [9],
    ));
    expect(screen.queryByText("2 Dokumente ausgewählt")).not.toBeInTheDocument();
  });
});
