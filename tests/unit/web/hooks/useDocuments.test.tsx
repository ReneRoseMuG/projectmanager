// @vitest-environment jsdom

/**
 * Test Scope:
 * DMS-Frontend: useDocumentActions / useFolders / useCategories (MS-75).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitaetsgrad:
 * - Echte Hooks mit echtem TanStack QueryClient; nur die ky-API-Schicht (api/documents) ist ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock: das API-Modul (Netzwerk als externer Seiteneffekt). Hooks, Mutationen und
 *   Query-Invalidierung laufen real.
 *
 * Isolation:
 * - jsdom ohne Netzwerk; eigener QueryClient pro Test.
 *
 * Abgedeckte Regeln:
 * - Einsortieren/Verschieben/Entfernen rufen den passenden Endpunkt mit den richtigen Argumenten.
 * - Sammlungs-/Kategorie-Verwaltung (umbenennen/loeschen) ruft den passenden Endpunkt.
 * - Nach jeder Mutation wird die Dokument-Ansicht invalidiert (beobachtbar am QueryClient).
 * - AUSNAHME Upload: Die Upload-Mutation invalidiert bewusst NICHT. Der Uploader laedt mehrere
 *   Dateien sequenziell hoch; nachgeladen wird einmal am Ende ueber refreshDocuments.
 *
 * Ziel:
 * Absichern, dass die Organisier- und Verwaltungs-Bedienung wirklich die richtigen Server-Aktionen
 * ausloest und die Ansicht aktualisiert - nicht nur, dass Knoepfe existieren.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as documentsApi from "../../../../apps/web/src/api/documents";
import { useCategories, useDocumentActions, useFolders } from "../../../../apps/web/src/hooks/useDocuments";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

vi.mock("../../../../apps/web/src/api/documents", () => ({
  getDocumentLibrary: vi.fn().mockResolvedValue([]),
  getDocument: vi.fn().mockResolvedValue({}),
  uploadDocument: vi.fn().mockResolvedValue({ id: 1 }),
  updateDocumentMetadata: vi.fn().mockResolvedValue({}),
  setDocumentTags: vi.fn().mockResolvedValue({}),
  moveDocument: vi.fn().mockResolvedValue(undefined),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  assignDocumentCategory: vi.fn().mockResolvedValue(undefined),
  removeDocumentCategory: vi.fn().mockResolvedValue(undefined),
  addDocumentToFolder: vi.fn().mockResolvedValue(undefined),
  removeDocumentFromFolder: vi.fn().mockResolvedValue(undefined),
  addDocumentsToFolder: vi.fn().mockResolvedValue(undefined),
  assignDocumentsCategory: vi.fn().mockResolvedValue(undefined),
  downloadDocument: vi.fn().mockResolvedValue(new Blob(["file"], { type: "text/plain" })),
  downloadDocumentsZip: vi.fn().mockResolvedValue(new Blob(["zip"], { type: "application/zip" })),
  getAttachmentCategories: vi.fn().mockResolvedValue([]),
  createAttachmentCategory: vi.fn().mockResolvedValue({ id: 1 }),
  updateAttachmentCategory: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAttachmentCategory: vi.fn().mockResolvedValue(undefined),
  getAttachmentFolders: vi.fn().mockResolvedValue([]),
  createAttachmentFolder: vi.fn().mockResolvedValue({ id: 1 }),
  updateAttachmentFolder: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAttachmentFolder: vi.fn().mockResolvedValue(undefined)
}));

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useDocumentActions", () => {
  it("sortiert ein Dokument in eine Sammlung ein und invalidiert die Ansicht", async () => {
    // Ausgangszustand: eine geladene Dokument-Ansicht, die nach der Aktion aktualisiert werden muss.
    const libraryKey = queryKeys.documents.library({});
    client.setQueryData(libraryKey, [{ id: 10 }]);

    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addToFolder(5, 10);
    });

    expect(documentsApi.addDocumentToFolder).toHaveBeenCalledWith(5, 10);
    await waitFor(() => expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(true));
  });

  it("verschiebt und entfernt Dokumente mit den richtigen Argumenten", async () => {
    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.moveDocument(10, 1, 2);
      await result.current.removeFromFolder(3, 10);
      await result.current.deleteDocument(10);
    });

    expect(documentsApi.moveDocument).toHaveBeenCalledWith(10, 1, 2);
    expect(documentsApi.removeDocumentFromFolder).toHaveBeenCalledWith(3, 10);
    // deleteDocument nutzt die API direkt als mutationFn; TanStack reicht ein Kontext-Objekt als 2. Argument durch.
    expect(documentsApi.deleteDocument).toHaveBeenCalledWith(10, expect.anything());
  });

  it("invalidiert beim Upload NICHT - erst refreshDocuments laedt die Ansicht nach", async () => {
    const libraryKey = queryKeys.documents.library({});
    client.setQueryData(libraryKey, [{ id: 10 }]);

    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.uploadDocument(new File(["x"], "a.txt"), 5, 7);
    });

    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(expect.any(File), 5, 7);
    // Der Kern der Aenderung: Eine Invalidierung je Datei wuerde bei einem Mehrfach-Upload die
    // gesamte (progressiv geladene) Bibliothek je Datei neu holen - und weil mutateAsync auf
    // onSuccess wartet, wuerde der naechste Upload darauf blockieren.
    expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(false);

    // Nachgeladen wird genau einmal, am Ende des Upload-Vorgangs.
    await act(async () => {
      await result.current.refreshDocuments();
    });
    await waitFor(() => expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(true));
  });

  it("weist Sammlung und Kategorie gebündelt zu und invalidiert die Ansicht", async () => {
    const libraryKey = queryKeys.documents.library({});
    client.setQueryData(libraryKey, [{ id: 10 }]);

    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addToFolderBulk(5, [10, 11]);
      await result.current.assignCategoryBulk(3, [10, 11]);
    });

    expect(documentsApi.addDocumentsToFolder).toHaveBeenCalledWith(5, [10, 11]);
    expect(documentsApi.assignDocumentsCategory).toHaveBeenCalledWith(3, [10, 11]);
    await waitFor(() => expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(true));
  });

  it("lädt die Auswahl als Zip herunter, ohne die Ansicht zu invalidieren", async () => {
    const libraryKey = queryKeys.documents.library({});
    client.setQueryData(libraryKey, [{ id: 10 }]);

    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    let blob: Blob | undefined;
    await act(async () => {
      blob = await result.current.downloadZip([10, 11]);
    });

    expect(documentsApi.downloadDocumentsZip).toHaveBeenCalledWith([10, 11]);
    expect(blob).toBeInstanceOf(Blob);
    // Reiner Download verändert keinen Server-State → Ansicht bleibt gültig.
    expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(false);
  });

  it("lÃ¤dt ein einzelnes Dokument herunter, ohne die Ansicht zu invalidieren", async () => {
    const libraryKey = queryKeys.documents.library({});
    client.setQueryData(libraryKey, [{ id: 10 }]);

    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    let blob: Blob | undefined;
    await act(async () => {
      blob = await result.current.downloadDocument(10);
    });

    expect(documentsApi.downloadDocument).toHaveBeenCalledWith(10);
    expect(blob).toBeInstanceOf(Blob);
    expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(false);
  });
});

describe("useFolders / useCategories Verwaltung", () => {
  it("benennt eine Sammlung um und loescht sie ueber die passenden Endpunkte", async () => {
    const { result } = renderHook(() => useFolders(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.updateFolder(7, { name: "Neu", expectedVersion: 1 });
      await result.current.deleteFolder(7, true);
    });

    expect(documentsApi.updateAttachmentFolder).toHaveBeenCalledWith(7, { name: "Neu", expectedVersion: 1 });
    expect(documentsApi.deleteAttachmentFolder).toHaveBeenCalledWith(7, true);
  });

  it("benennt eine Kategorie um und loescht sie ueber die passenden Endpunkte", async () => {
    const { result } = renderHook(() => useCategories(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.updateCategory(4, { name: "Umbenannt", expectedVersion: 2 });
      await result.current.deleteCategory(4);
    });

    expect(documentsApi.updateAttachmentCategory).toHaveBeenCalledWith(4, { name: "Umbenannt", expectedVersion: 2 });
    // deleteCategory nutzt die API direkt als mutationFn; TanStack reicht ein Kontext-Objekt als 2. Argument durch.
    expect(documentsApi.deleteAttachmentCategory).toHaveBeenCalledWith(4, expect.anything());
  });
});
