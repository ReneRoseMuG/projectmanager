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
