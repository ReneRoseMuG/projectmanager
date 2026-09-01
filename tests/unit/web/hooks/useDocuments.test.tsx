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
 * - Uploads geben die direkte Sammlung und aktive DMS-Tags gemeinsam an die API-Schicht weiter.
 * - Einsortieren/Verschieben und endgültiges Löschen rufen den passenden Endpunkt mit den richtigen Argumenten.
 * - Tag-Änderungen geben die geladene Dokumentversion für den Konfliktschutz weiter.
 * - Sammlungsverwaltung (umbenennen/loeschen) ruft den passenden Endpunkt.
 * - Nach jeder Mutation wird die Dokument-Ansicht invalidiert (beobachtbar am QueryClient).
 *
 * Ziel:
 * Absichern, dass die Organisier- und Verwaltungs-Bedienung wirklich die richtigen Server-Aktionen
 * ausloest und die Ansicht aktualisiert - nicht nur, dass Knoepfe existieren.
 */

import type { Attachment, Paginated } from "@taskmanager/shared-types";
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query";
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
  deleteDocumentPermanently: vi.fn().mockResolvedValue(undefined),
  getAttachmentFolders: vi.fn().mockResolvedValue([]),
  createAttachmentFolder: vi.fn().mockResolvedValue({ id: 1 }),
  updateAttachmentFolder: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAttachmentFolder: vi.fn().mockResolvedValue(undefined),
  addDocumentTagsBulk: vi.fn().mockResolvedValue([])
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
  it("ergänzt Tags für eine versionsgebundene Dokumentauswahl und invalidiert die Ansicht", async () => {
    const firstDocument: Attachment = {
      id: 10,
      kind: "document",
      owners: [],
      originalName: "eins.pdf",
      displayName: null,
      description: null,
      filename: "eins.pdf",
      mimetype: "application/pdf",
      size: 10,
      url: "/api/documents/10/content",
      contentHash: null,
      isInDocumentLibrary: true,
      tags: [],
      folder: null,
      folders: [],
      createdAt: "2026-08-06T08:00:00.000Z",
      updatedAt: "2026-08-06T08:00:00.000Z",
      version: 2,
    };
    const secondDocument: Attachment = {
      ...firstDocument,
      id: 11,
      originalName: "zwei.pdf",
      filename: "zwei.pdf",
      url: "/api/documents/11/content",
      version: 4,
    };
    const importantTag = {
      id: 3,
      name: "Wichtig",
      color: "#ef4444",
      isSystem: false,
      domain: "dms" as const,
      version: 1,
    };
    const updatedDocuments: Attachment[] = [
      { ...firstDocument, tags: [importantTag], version: 3 },
      { ...secondDocument, tags: [importantTag], version: 5 },
    ];
    vi.mocked(documentsApi.addDocumentTagsBulk).mockResolvedValueOnce(updatedDocuments);
    const libraryKey = [...queryKeys.documents.library({}), "__progressiveList"] as const;
    client.setQueryData<InfiniteData<Paginated<Attachment>>>(libraryKey, {
      pages: [{ data: [firstDocument, secondDocument], total: 2, page: 1, pageSize: 50 }],
      pageParams: [1],
    });
    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.addTagsBulk(
        [{ id: 10, expectedVersion: 2 }, { id: 11, expectedVersion: 4 }],
        [3, 4],
      );
    });

    expect(documentsApi.addDocumentTagsBulk).toHaveBeenCalledWith(
      [{ id: 10, expectedVersion: 2 }, { id: 11, expectedVersion: 4 }],
      [3, 4],
    );
    expect(client.getQueryData<InfiniteData<Paginated<Attachment>>>(libraryKey)?.pages[0]?.data).toEqual(updatedDocuments);
    await waitFor(() => expect(client.getQueryState(libraryKey)?.isInvalidated).toBe(true));
  });

  it("übergibt Sammlung und DMS-Tags gemeinsam an den Upload", async () => {
    const { result } = renderHook(() => useDocumentActions(), { wrapper: Wrapper });
    const file = new File(["Inhalt"], "beleg.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.uploadDocument(file, 5, [3, 4]);
    });

    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(file, 5, [3, 4]);
  });

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
