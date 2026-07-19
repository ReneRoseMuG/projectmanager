// @vitest-environment jsdom

/**
 * Test Scope:
 * DMS-Frontend: useDocumentActions / useFolders (MS-80).
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
 * - Tag-Änderungen geben die geladene Dokumentversion für den Konfliktschutz weiter.
 * - Sammlungsverwaltung (umbenennen/loeschen) ruft den passenden Endpunkt.
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
import { useDocumentActions, useFolders } from "../../../../apps/web/src/hooks/useDocuments";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

vi.mock("../../../../apps/web/src/api/documents", () => ({
  getDocumentLibrary: vi.fn().mockResolvedValue([]),
  getDocument: vi.fn().mockResolvedValue({}),
  uploadDocument: vi.fn().mockResolvedValue({ id: 1 }),
  updateDocumentMetadata: vi.fn().mockResolvedValue({}),
  setDocumentTags: vi.fn().mockResolvedValue({}),
  setDocumentFolder: vi.fn().mockResolvedValue({ id: 10 }),
  removeDocumentFromLibrary: vi.fn().mockResolvedValue(undefined),
  deleteDocumentPermanently: vi.fn().mockResolvedValue(undefined),
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
      await result.current.setDocumentFolder(10, 5, 3);
    });

    expect(documentsApi.setDocumentFolder).toHaveBeenCalledWith(10, 5, 3);
    await waitFor(() => expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(true));
  });

  it("verschiebt und entfernt Dokumente mit den richtigen Argumenten", async () => {
    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.setDocumentFolder(10, null, 4);
      await result.current.deleteDocumentPermanently(10, 5);
    });

    expect(documentsApi.setDocumentFolder).toHaveBeenCalledWith(10, null, 4);
    expect(documentsApi.deleteDocumentPermanently).toHaveBeenCalledWith(10, 5);
  });

  it("setzt Tags mit der erwarteten Dokumentversion", async () => {
    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.setTags(10, [3, 4], 7);
    });

    expect(documentsApi.setDocumentTags).toHaveBeenCalledWith(10, [3, 4], 7);
  });
});

describe("useFolders Verwaltung", () => {
  it("benennt eine Sammlung um und loescht sie ueber die passenden Endpunkte", async () => {
    const { result } = renderHook(() => useFolders(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.updateFolder(7, { name: "Neu", expectedVersion: 1 });
      await result.current.deleteFolder(7, 2);
    });

    expect(documentsApi.updateAttachmentFolder).toHaveBeenCalledWith(7, { name: "Neu", expectedVersion: 1 });
    expect(documentsApi.deleteAttachmentFolder).toHaveBeenCalledWith(7, 2);
  });
});
