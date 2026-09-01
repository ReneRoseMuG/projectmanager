// @vitest-environment jsdom

/**
 * Test Scope:
 * Parent-Datei-Hook mit exklusiven Attachments, ownerlokalen Ordnern und DMS-Dokumentlinks.
 *
 * Test-Ebene:
 * - Unit/Hook
 *
 * Realitätsgrad:
 * - Echter TanStack QueryClient und echter Hook; nur Netzwerk und Berechtigungskontext sind ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mocks für die ky-API-Funktionen und useHasPermission als externe Collaborators.
 *
 * Isolation:
 * - Eigener QueryClient pro Test, JSDOM, keine DB und kein Netzwerk.
 *
 * Abgedeckte Regeln:
 * - Attachments, Parent-Ordner, lokale Ordner und Dokumentlinks besitzen getrennte Query-Keys.
 * - Owner-Uploads übergeben nur die Datei und keine DMS-Sichtbarkeit.
 * - Mutationen invalidieren den gesamten Parent-Datei-Scope einschließlich Dokumentlinks.
 * - Ohne documents:read wird die Dokumentlink-Abfrage nicht ausgeführt.
 *
 * Fehlerfälle:
 * - Fehlende Dokumentberechtigung darf weder Daten laden noch DMS-Links im Hook bereitstellen.
 *
 * Ziel:
 * Die fachliche Trennung bleibt auch im Frontend-Server-State und bei Mutationen erhalten.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as attachmentsApi from "../../../../apps/web/src/api/attachments";
import { useAttachments } from "../../../../apps/web/src/hooks/useAttachments";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

const permission = vi.hoisted(() => ({ canReadDocuments: true }));

vi.mock("../../../../apps/web/src/hooks/usePermissions", () => ({
  useHasPermission: (resource: string, action: string) =>
    resource === "documents" && action === "read" ? permission.canReadDocuments : true
}));

vi.mock("../../../../apps/web/src/api/attachments", () => ({
  getProjectAttachments: vi.fn().mockResolvedValue([]),
  getMilestoneAttachments: vi.fn().mockResolvedValue([]),
  getTaskAttachments: vi.fn().mockResolvedValue([]),
  getFeatureAttachments: vi.fn().mockResolvedValue([]),
  getWikiPageAttachments: vi.fn().mockResolvedValue([]),
  getAttachmentLocalFolders: vi.fn().mockResolvedValue([]),
  getParentAttachmentFolders: vi.fn().mockResolvedValue([]),
  getParentDocumentLinks: vi.fn().mockResolvedValue([]),
  uploadProjectAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  uploadMilestoneAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  uploadTaskAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  uploadFeatureAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  uploadWikiPageAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  deleteOwnerAttachment: vi.fn().mockResolvedValue(undefined),
  openAttachment: vi.fn().mockResolvedValue(undefined),
  bulkDeleteAttachments: vi.fn().mockResolvedValue(undefined),
  createParentAttachmentFolder: vi.fn().mockResolvedValue({ id: 2 }),
  updateParentAttachmentFolder: vi.fn().mockResolvedValue({ id: 2 }),
  deleteParentAttachmentFolder: vi.fn().mockResolvedValue(undefined),
  moveParentAttachment: vi.fn().mockResolvedValue({ id: 1 }),
  createParentDocumentLink: vi.fn().mockResolvedValue({ id: 3 }),
  moveParentDocumentLink: vi.fn().mockResolvedValue({ id: 3 }),
  deleteParentDocumentLink: vi.fn().mockResolvedValue(undefined),
  downloadAttachmentArchive: vi.fn().mockResolvedValue(new Blob()),
  createAttachmentLocalFolder: vi.fn().mockResolvedValue({ id: 4 }),
  deleteAttachmentLocalFolder: vi.fn().mockResolvedValue(undefined),
  pickAttachmentLocalFolderPath: vi.fn().mockResolvedValue("C:\\Temp"),
  getAttachmentLocalEntries: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 }),
  openAttachmentLocalFile: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../../../apps/web/src/api/tickets", () => ({
  getTicketAttachments: vi.fn().mockResolvedValue([]),
  uploadTicketAttachment: vi.fn().mockResolvedValue({ id: 1 })
}));

vi.mock("../../../../apps/web/src/api/documents", () => ({
  openDocument: vi.fn().mockResolvedValue(undefined)
}));

let client: QueryClient;

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  permission.canReadDocuments = true;
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
});

afterEach(() => {
  client.clear();
  vi.clearAllMocks();
});

describe("useAttachments", () => {
  it("lädt alle Parent-Datei-Sichten unter getrennten Query-Keys", async () => {
    renderHook(() => useAttachments({ type: "project", id: 7 }), { wrapper: Wrapper });

    await waitFor(() => expect(attachmentsApi.getParentDocumentLinks).toHaveBeenCalledWith({ type: "project", id: 7 }));
    expect(client.getQueryState(queryKeys.attachments.owner("project", 7))).toBeDefined();
    expect(client.getQueryState(queryKeys.attachments.parentFolders("project", 7))).toBeDefined();
    expect(client.getQueryState(queryKeys.attachments.documentLinks("project", 7))).toBeDefined();
    expect(client.getQueryState(queryKeys.attachments.localFolders("project", 7))).toBeDefined();
  });

  it("lädt einen Owner-Anhang ohne DMS-Parameter hoch und invalidiert alle getrennten Sichten", async () => {
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useAttachments({ type: "project", id: 7 }), { wrapper: Wrapper });
    const file = new File(["parent"], "parent.txt", { type: "text/plain" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.uploadAttachment(file);
    });

    expect(attachmentsApi.uploadProjectAttachment).toHaveBeenCalledWith(7, file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.attachments.owner("project", 7) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.attachments.parentFolders("project", 7) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.attachments.documentLinks("project", 7) });
  });

  it("unterdrückt Dokumentlinks vollständig ohne documents:read", async () => {
    permission.canReadDocuments = false;
    const { result } = renderHook(() => useAttachments({ type: "project", id: 7 }), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(attachmentsApi.getParentDocumentLinks).not.toHaveBeenCalled();
    expect(result.current.documentLinks).toEqual([]);
    expect(result.current.canReadDocuments).toBe(false);
  });
});
