// @vitest-environment jsdom

/**
 * Test Scope:
 * DMS-Web-API-Client für Dokument-Uploads im aktiven Bibliothekskontext.
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Query- und FormData-Erzeugung; nur der ky-Client als Netzwerkgrenze ist ersetzt.
 *
 * Mock-Entscheidung:
 * - Unit-Mock: der ky-Client verhindert einen Netzaufruf, während URL und Request-Body real entstehen.
 *
 * Isolation:
 * - jsdom ohne DB-, Datei- oder Netzwerkzugriff.
 *
 * Abgedeckte Regeln:
 * - Direkte Sammlung und aktive DMS-Tags werden atomar im Upload-Request übergeben.
 * - Tag-IDs werden dedupliziert und stabil sortiert.
 *
 * Fehlerfälle:
 * - Ohne Sammlung und Tags bleibt der bestehende unparametrisierte Uploadpfad erhalten.
 *
 * Ziel:
 * Verhindern, dass der Upload Tagfilter zwischen Seite und MS-80-Importvertrag verliert.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => {
  const json = vi.fn().mockResolvedValue({ id: 1 });
  return {
    json,
    post: vi.fn(() => ({ json })),
  };
});

vi.mock("../../../../apps/web/src/api/client", () => ({
  api: {
    post: apiMocks.post,
  },
  apiBaseUrl: "http://api.test/api",
}));

import { addDocumentTagsBulk, uploadDocument } from "../../../../apps/web/src/api/documents";

afterEach(() => {
  vi.clearAllMocks();
});

describe("documents api client", () => {
  it("sendet die versionsgebundene Auswahl an den Bulk-Tag-Endpunkt", async () => {
    const attachments = [{ id: 7, expectedVersion: 2 }, { id: 8, expectedVersion: 4 }];
    const updatedDocuments = [{ id: 7, version: 3 }, { id: 8, version: 5 }];
    apiMocks.json.mockResolvedValueOnce(updatedDocuments);

    const result = await addDocumentTagsBulk(attachments, [3, 9]);

    expect(apiMocks.post).toHaveBeenCalledWith(
      "documents/bulk/tags",
      { json: { attachments, tagIds: [3, 9] } },
    );
    expect(result).toEqual(updatedDocuments);
  });

  it("übergibt Sammlung und DMS-Tags im selben Upload-Request", async () => {
    const file = new File(["Inhalt"], "beleg.pdf", { type: "application/pdf" });

    await uploadDocument(file, 7, [9, 3, 9]);

    expect(apiMocks.post).toHaveBeenCalledWith(
      "documents?folder=7&tags=3%2C9",
      { body: expect.any(FormData) },
    );
    const body = apiMocks.post.mock.calls[0]?.[1].body as FormData;
    expect(body.get("file")).toBe(file);
  });

  it("behält ohne Zuordnungen den unparametrisierten Uploadpfad bei", async () => {
    const file = new File(["Inhalt"], "beleg.pdf", { type: "application/pdf" });

    await uploadDocument(file);

    expect(apiMocks.post).toHaveBeenCalledWith(
      "documents",
      { body: expect.any(FormData) },
    );
  });
});
