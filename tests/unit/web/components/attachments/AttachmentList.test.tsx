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
import type { Attachment, AttachmentLocalFolder } from "@taskmanager/shared-types";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentList } from "../../../../../apps/web/src/components/attachments/AttachmentList";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  showToast: vi.fn(),
  createFolder: vi.fn(),
  localEntries: vi.fn()
}));

vi.mock("../../../../../apps/web/src/api/client", () => ({
  assetUrl: (value: string) => `http://assets.test${value}`
}));

vi.mock("../../../../../apps/web/src/hooks/useAttachments", () => ({
  useAttachmentLocalEntries: (folderId: number | null, relativePath: string) =>
    mocks.localEntries(folderId, relativePath)
}));

vi.mock("../../../../../apps/web/src/hooks/useDocuments", () => ({
  useFolders: () => ({
    folders: [
      {
        id: 11,
        name: "Freigaben",
        parentId: null,
        sortOrder: 0,
        version: 1,
        createdAt: "2026-07-29T10:00:00.000Z",
        updatedAt: "2026-07-29T10:00:00.000Z"
      }
    ],
    createFolder: mocks.createFolder
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
  owners: [{ type: "project", id: 7 }],
  originalName: "planung.pdf",
  filename: "generated-planung.pdf",
  mimetype: "application/pdf",
  size: 2048,
  url: "/api/attachments/42/content",
  contentHash: null,
  isInDocumentLibrary: false,
  createdAt: "2026-07-29T10:00:00.000Z",
  updatedAt: "2026-07-29T10:00:00.000Z",
  version: 3
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
    localFolders: [localFolder],
    downloadArchive: vi.fn().mockResolvedValue(new Blob()),
    bulkUnlinkAttachments: vi.fn().mockResolvedValue(undefined),
    bulkDeleteAttachments: vi.fn().mockResolvedValue(undefined),
    bulkSetAttachmentFolder: vi.fn().mockResolvedValue(undefined),
    pickLocalFolderPath: vi.fn().mockResolvedValue("C:\\Projekte\\Beta"),
    createLocalFolder: vi.fn().mockResolvedValue({ ...localFolder, id: 10 }),
    deleteLocalFolder: vi.fn().mockResolvedValue(undefined),
    openAttachment: vi.fn().mockResolvedValue(undefined),
    openingAttachmentId: null,
    unlinkAttachment: vi.fn().mockResolvedValue(undefined),
    deleteAttachmentPermanently: vi.fn().mockResolvedValue(undefined),
    ...overrides
  } as unknown as ComponentProps<typeof AttachmentList>["manager"];
}

beforeEach(() => {
  localStorage.clear();
  mocks.confirm.mockResolvedValue(true);
  mocks.createFolder.mockResolvedValue({
    id: 12,
    name: "Neu",
    parentId: null,
    sortOrder: 0,
    version: 1,
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z"
  });
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

  it("zeigt für ausgewählte PM-Dateien die gebündelten Aktionen", async () => {
    const bulkUnlinkAttachments = vi.fn().mockResolvedValue(undefined);
    const bulkDeleteAttachments = vi.fn().mockResolvedValue(undefined);
    const manager = buildManager({ bulkUnlinkAttachments, bulkDeleteAttachments });
    render(<AttachmentList manager={manager} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "planung.pdf auswählen" }));

    expect(screen.getByText("1 ausgewählt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Als ZIP herunterladen" })).toBeInTheDocument();
    expect(screen.getByLabelText("In Ordner verschieben")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfungen lösen" }));
    await waitFor(() =>
      expect(bulkUnlinkAttachments).toHaveBeenCalledWith([
        { id: attachment.id, expectedVersion: attachment.version }
      ])
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "planung.pdf auswählen" }));
    fireEvent.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    await waitFor(() =>
      expect(bulkDeleteAttachments).toHaveBeenCalledWith([
        { id: attachment.id, expectedVersion: attachment.version }
      ])
    );
  });

  it("legt virtuelle Ordner und Unterordner aus der aktuellen Ablage heraus an", async () => {
    render(<AttachmentList manager={buildManager()} />);
    fireEvent.change(screen.getByLabelText("Ablage"), { target: { value: "folder:11" } });
    fireEvent.click(screen.getByRole("button", { name: "Virtuellen Ordner anlegen" }));
    fireEvent.change(screen.getByLabelText("Name des virtuellen Ordners"), {
      target: { value: "Verträge" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() =>
      expect(mocks.createFolder).toHaveBeenCalledWith({
        name: "Verträge",
        parentId: 11
      })
    );
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
