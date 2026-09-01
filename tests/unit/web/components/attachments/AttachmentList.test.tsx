/**
 * Test Scope:
 * AttachmentList
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Explorer-Komponente mit DOM-Interaktionen und LocalStorage.
 *
 * Mock-Entscheidung:
 * - Query-Hooks, Berechtigungen, Dialoge und Toasts werden als direkte
 *   Komponenten-Kollaboratoren gemockt. Backend und Dateisystem sind nicht Teil
 *   dieser Testebene.
 *
 * Isolation:
 * - JSDOM, zurückgesetztes LocalStorage und pro Test neu erzeugte Manager-Funktionen.
 *
 * Abgedeckte Regeln:
 * - Liste, Details sowie kleine, mittlere und große Symbole sind auswählbar.
 * - Die gewählte Ansicht wird lokal gespeichert.
 * - Mehrfachauswahl bietet ZIP, virtuelles Einsortieren, Lösen und Löschen an.
 * - Lokale Ordnerquellen erscheinen in der Ablage und werden über den nativen
 *   Ordnerauswahldialog verknüpft.
 *
 * Fehlerfälle:
 * - Nicht Bestandteil dieser UI-Einheit; API-, Pfad- und Berechtigungsfehler sind
 *   durch Integrationstests abgedeckt.
 *
 * Ziel:
 * Die direkt beobachtbaren Explorer-Funktionen der Tickets TKT-164, TKT-165 und
 * TKT-167 sowie der lokalen Windows-Ordnerquelle abzusichern.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type {
  Attachment,
  AttachmentLocalFolder,
  ParentAttachmentFolder,
  ParentDocumentLink
} from "@taskmanager/shared-types";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentList } from "../../../../../apps/web/src/components/attachments/AttachmentList";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  showToast: vi.fn(),
  localEntries: vi.fn(),
  documents: [] as unknown[]
}));

vi.mock("../../../../../apps/web/src/api/client", () => ({
  assetUrl: (value: string) => `http://assets.test${value}`
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachmentLocalEntries: (folderId: number | null, relativePath: string) =>
    mocks.localEntries(folderId, relativePath)
}));

vi.mock("../../../../../apps/web/src/hooks/useDocuments", () => ({
  useDocumentLibrary: () => ({
    documents: mocks.documents,
    loading: false
  })
}));

vi.mock("../../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: () => true
}));

vi.mock("../../../../../apps/web/src/components/ui/ConfirmDialogProvider", () => ({
  useConfirm: () => ({ confirm: mocks.confirm })
}));

vi.mock("../../../../../apps/web/src/components/ui/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.showToast })
}));

vi.mock("../../../../../apps/web/src/components/attachments/AttachmentPreview", () => ({
  AttachmentPreview: () => <div>Attachment-Vorschau</div>
}));

const attachment: Attachment = {
  id: 42,
  kind: "parent_attachment",
  owners: [{ type: "project", id: 7 }],
  originalName: "planung.pdf",
  displayName: null,
  description: null,
  filename: "generated-planung.pdf",
  mimetype: "application/pdf",
  size: 2048,
  url: "/api/attachments/42/content",
  contentHash: null,
  isInDocumentLibrary: false,
  parentFolderId: null,
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z",
  version: 3
};

const parentFolder: ParentAttachmentFolder = {
  id: 11,
  owner: { type: "project", id: 7 },
  name: "Freigaben",
  parentId: null,
  childCount: 0,
  directEntryCount: 0,
  version: 1,
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z"
};

const document: Attachment = {
  ...attachment,
  id: 84,
  kind: "document",
  owners: [],
  originalName: "dms-vertrag.pdf",
  filename: "generated-dms-vertrag.pdf",
  url: "/api/documents/84/content",
  isInDocumentLibrary: true,
  parentFolderId: undefined
};

const documentLink: ParentDocumentLink = {
  id: 91,
  owner: { type: "project", id: 7 },
  document,
  folder: null,
  version: 2,
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z"
};

const localFolder: AttachmentLocalFolder = {
  id: 9,
  owner: { type: "project", id: 7 },
  name: "Projektdateien",
  rootPath: "C:\\Projekte\\Alpha",
  version: 1,
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z"
};

function buildManager(
  overrides: Record<string, unknown> = {}
): ComponentProps<typeof AttachmentList>["manager"] {
  return {
    attachments: [attachment],
    parentFolders: [parentFolder],
    documentLinks: [documentLink],
    canReadDocuments: true,
    localFolders: [localFolder],
    downloadArchive: vi.fn().mockResolvedValue(new Blob()),
    bulkDeleteAttachments: vi.fn().mockResolvedValue(undefined),
    createParentFolder: vi.fn().mockResolvedValue(parentFolder),
    updateParentFolder: vi.fn().mockResolvedValue(parentFolder),
    deleteParentFolder: vi.fn().mockResolvedValue(undefined),
    moveAttachment: vi.fn().mockResolvedValue(attachment),
    linkDocument: vi.fn().mockResolvedValue(documentLink),
    moveDocumentLink: vi.fn().mockResolvedValue(documentLink),
    unlinkDocument: vi.fn().mockResolvedValue(undefined),
    openDocument: vi.fn().mockResolvedValue(undefined),
    pickLocalFolderPath: vi.fn().mockResolvedValue("C:\\Projekte\\Beta"),
    createLocalFolder: vi.fn().mockResolvedValue({ ...localFolder, id: 10 }),
    deleteLocalFolder: vi.fn().mockResolvedValue(undefined),
    openAttachment: vi.fn().mockResolvedValue(undefined),
    openingAttachmentId: null,
    deleteAttachmentPermanently: vi.fn().mockResolvedValue(undefined),
    ...overrides
  } as unknown as ComponentProps<typeof AttachmentList>["manager"];
}

beforeEach(() => {
  localStorage.clear();
  mocks.confirm.mockResolvedValue(true);
  mocks.documents.splice(0, mocks.documents.length, document);
  mocks.localEntries.mockReturnValue({
    entries: [
      {
        folderId: 9,
        kind: "file",
        name: "angebot.docx",
        relativePath: "angebot.docx",
        size: 1024,
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        updatedAt: "2026-07-29T10:00:00.000Z",
        url: "/api/attachment-local-folders/9/content?relativePath=angebot.docx"
      }
    ],
    loading: false,
    loadingMore: false,
    loadedCount: 1,
    total: 1,
    openingPath: null,
    openLocalFile: vi.fn().mockResolvedValue(undefined)
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AttachmentList", () => {
  it("bietet fünf Ansichten an und speichert die gewählte Ansicht", () => {
    render(<AttachmentList manager={buildManager()} />);

    expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kleine Symbole" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mittelgroße Symbole" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Große Symbole" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Details" }));

    expect(localStorage.getItem("ui.attachments.viewMode")).toBe("details");
  });

  it("bietet für ausgewählte Parent-Anhänge Verschieben und endgültiges Löschen, aber kein Entkoppeln", async () => {
    const bulkDeleteAttachments = vi.fn().mockResolvedValue(undefined);
    const moveAttachment = vi.fn().mockResolvedValue(attachment);
    const manager = buildManager({ bulkDeleteAttachments, moveAttachment });
    render(<AttachmentList manager={manager} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "planung.pdf auswählen" }));

    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Als ZIP herunterladen" })).toBeInTheDocument();
    expect(screen.getByLabelText("In Ordner verschieben")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "Verknüpfungen lösen" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("In Ordner verschieben"), { target: { value: "11" } });
    await waitFor(() => expect(moveAttachment).toHaveBeenCalledWith(attachment.id, {
      folderId: 11,
      expectedVersion: attachment.version
    }));

    fireEvent.click(screen.getByRole("checkbox", { name: "planung.pdf auswählen" }));
    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    await waitFor(() =>
      expect(bulkDeleteAttachments).toHaveBeenCalledWith([
        { id: attachment.id, expectedVersion: attachment.version }
      ])
    );
  });

  it("legt virtuelle Ordner und Unterordner aus der aktuellen Ablage heraus an", async () => {
    const createParentFolder = vi.fn().mockResolvedValue(parentFolder);
    render(<AttachmentList manager={buildManager({ createParentFolder })} />);
    fireEvent.change(screen.getByLabelText("Ablage"), { target: { value: "folder:11" } });
    fireEvent.click(screen.getByRole("button", { name: "Virtuellen Ordner anlegen" }));
    fireEvent.change(screen.getByLabelText("Name des virtuellen Ordners"), {
      target: { value: "Verträge" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() =>
      expect(createParentFolder).toHaveBeenCalledWith({
        name: "Verträge",
        parentId: 11
      })
    );
  });

  it("zeigt DMS-Dokumente als Links und löst nur die versionierte Relation", async () => {
    const unlinkDocument = vi.fn().mockResolvedValue(undefined);
    render(<AttachmentList manager={buildManager({ unlinkDocument })} />);

    expect(screen.getByText("DMS")).toBeInTheDocument();
    expect(screen.getByText("dms-vertrag.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfung lösen" }));

    await waitFor(() => expect(unlinkDocument).toHaveBeenCalledWith(documentLink.id, documentLink.version));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: "DMS-Verknüpfung lösen?",
      body: expect.stringContaining("bleiben im Dokumentenmanagement bestehen")
    }));
  });

  it("verknüpft ein vorhandenes DMS-Dokument explizit ohne Upload", async () => {
    const linkDocument = vi.fn().mockResolvedValue(documentLink);
    render(<AttachmentList manager={buildManager({ documentLinks: [], linkDocument })} />);

    fireEvent.click(screen.getByRole("button", { name: "DMS-Dokument verknüpfen" }));
    fireEvent.click(await screen.findByRole("button", { name: "Verknüpfen" }));

    await waitFor(() => expect(linkDocument).toHaveBeenCalledWith({ documentId: document.id, folderId: null }));
  });

  it("zeigt eine lokale Festplattenquelle und verknüpft einen gewählten Windows-Ordner", async () => {
    const pickLocalFolderPath = vi.fn().mockResolvedValue("C:\\Projekte\\Beta");
    const createLocalFolder = vi.fn().mockResolvedValue({ ...localFolder, id: 10 });
    render(
      <AttachmentList manager={buildManager({ pickLocalFolderPath, createLocalFolder })} />
    );

    fireEvent.change(screen.getByLabelText("Ablage"), { target: { value: "local:9" } });

    expect(await screen.findByText("angebot.docx")).toBeInTheDocument();
    expect(screen.getByText("C:\\Projekte\\Alpha")).toBeInTheDocument();
    expect(mocks.localEntries).toHaveBeenCalledWith(9, "");

    fireEvent.click(screen.getByRole("button", { name: "Lokalen Ordner verknüpfen" }));

    await waitFor(() => expect(pickLocalFolderPath).toHaveBeenCalledTimes(1));
    expect(createLocalFolder).toHaveBeenCalledWith("C:\\Projekte\\Beta");
  });
});
