/**
 * Test Scope:
 * Windows-Explorer-Batchimport für den Dokument Manager.
 *
 * Test-Ebene:
 * - Unit mit realen temporären Dateien.
 *
 * Realitätsgrad:
 * - Dateiprüfung, Lesen und Löschen laufen gegen ein echtes Temp-Verzeichnis. Die HTTP-Grenze
 *   wird kontrolliert ersetzt, damit Statuscodes und Netzwerkfehler deterministisch beweisbar sind.
 *
 * Mock-Entscheidung:
 * - Nur fetch wird gemockt; Dateisystem und Importreihenfolge bleiben real.
 *
 * Isolation:
 * - Ein eindeutiges Verzeichnis unter os.tmpdir() je Test, vollständige Bereinigung in afterEach.
 *
 * Abgedeckte Regeln:
 * - Maximal 100 reguläre Dateien bis 25 MB, Unicode-/Leerzeichenpfade, höchstens eine Sammlung,
 *   DMS-Tags, vollständiger Rückgabevertrag, sequenzielle Verarbeitung, Kopieren und sicheres Verschieben.
 *
 * Fehlerfälle:
 * - Doppelte Pfade, zu große Datei, alte Kategorie-/Mehrfachsammlungsangaben, HTTP-Konflikt,
 *   Netzwerkfehler und lokale Löschfehler.
 *
 * Ziel:
 * - Nachweisen, dass Quelldateien ausschließlich nach erfolgreichem 201-Import gelöscht werden.
 */

import { mkdtemp, readFile, rm, stat, truncate, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDmsTag,
  importBatch,
  loadImportOptions,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE,
  validateImportRequest,
  type ImporterConfig,
  type ImporterDependencies,
  type ImportSummary
} from "../../../apps/windows-importer/src/importer.js";

const config: ImporterConfig = { apiBaseUrl: "http://127.0.0.1:3001/api", apiKey: "test-key" };
const tempRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function tempFile(name: string, content = "Inhalt"): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "project-manager-windows-importer-"));
  tempRoots.push(root);
  const filePath = path.join(root, name);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

function dependencies(fetchImpl: typeof fetch, removeFile: ImporterDependencies["removeFile"] = rm): ImporterDependencies {
  return { fetch: fetchImpl, readFile, removeFile, stat };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function importedDocument(id: number, folderId: number | null = null) {
  return {
    id,
    originalName: `document-${id}.txt`,
    filename: `${id}.txt`,
    mimetype: "text/plain",
    size: 7,
    url: `/api/documents/${id}/content`,
    displayName: null,
    description: null,
    contentHash: "a".repeat(64),
    isInDocumentLibrary: true,
    tags: [{ id: 9, name: "DMS", color: "#fff", isSystem: false, domain: "dms", version: 1 }],
    folders: folderId === null ? [] : [{ id: folderId, parentId: null, projectId: null, name: "Rechnungen", version: 1 }],
    owners: [],
    version: 1,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z"
  };
}

describe("windows document importer", () => {
  it("lädt sortierte DMS-Optionen und bildet vollständige Sammlungspfade", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([
        { id: 2, parentId: 1, projectId: null, name: "2026", version: 1 },
        { id: 1, parentId: null, projectId: null, name: "Rechnungen", version: 1 }
      ]))
      .mockResolvedValueOnce(jsonResponse([
        { id: 5, name: "DMS", color: "#fff", isSystem: false, domain: "dms", version: 1 },
        { id: 7, name: "System", color: "#f00", isSystem: true, domain: "dms", version: 1 },
        { id: 6, name: "PM", color: "#000", isSystem: false, domain: "pm", version: 1 }
      ]));

    const options = await loadImportOptions(config, dependencies(fetchMock));

    expect(options.folders.map((folder) => folder.label)).toEqual(["Rechnungen", "Rechnungen / 2026"]);
    expect(options.tags.map((tag) => tag.name)).toEqual(["DMS"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { "x-api-key": "test-key" } });
  });

  it("akzeptiert mehrere Dateien mit Leerzeichen und Umlauten", async () => {
    const first = await tempFile("erste Datei.txt");
    const second = await tempFile("Prüfung.md");

    await expect(validateImportRequest({ mode: "copy", filePaths: [first, second] })).resolves.toBeUndefined();
  });

  it("legt einen neuen DMS-Tag an und sendet den API-Key", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
      id: 12,
      name: "Straße",
      color: "#94a3b8",
      isSystem: false,
      domain: "dms",
      version: 1
    }, 201));

    const tag = await createDmsTag(config, "  Straße  ", { fetch: fetchMock });

    expect(tag).toMatchObject({ id: 12, name: "Straße", domain: "dms" });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3001/api/tags", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "test-key" },
      body: JSON.stringify({ name: "Straße", domain: "dms" })
    }));
  });

  it("lehnt doppelte Pfade, mehr als 100 Einträge und Dateien über 25 MB ab", async () => {
    const filePath = await tempFile("grenze.bin");
    await expect(validateImportRequest({ mode: "copy", filePaths: [filePath, filePath] })).rejects.toThrow("doppelte Pfade");
    await expect(validateImportRequest({ mode: "copy", filePaths: Array.from({ length: MAX_FILE_COUNT + 1 }, (_, index) => `${filePath}-${index}`) })).rejects.toThrow("höchstens 100");

    await truncate(filePath, MAX_FILE_SIZE + 1);
    await expect(validateImportRequest({ mode: "copy", filePaths: [filePath] })).rejects.toThrow("25 MB");
  });

  it("lehnt Kategorie- und Mehrfachsammlungsfelder mit Migrationshinweis ab", async () => {
    const filePath = await tempFile("legacy.txt");

    await expect(validateImportRequest({ mode: "copy", filePaths: [filePath], categoryIds: [8] } as never)).rejects.toThrow("Kategorien werden seit MS-80 nicht mehr unterstützt");
    await expect(validateImportRequest({ mode: "copy", filePaths: [filePath], folderIds: [7, 11] } as never)).rejects.toThrow("Mehrfachsammlungen werden seit MS-80 nicht mehr unterstützt");
  });

  it("kopiert sequenziell mit genau einer gemeinsamen Sammlung und Tags", async () => {
    const first = await tempFile("eins.txt", "eins");
    const second = await tempFile("zwei.txt", "zwei");
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const urls: string[] = [];
    const progress: ImportSummary[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      urls.push(String(input));
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeRequests -= 1;
      return jsonResponse(importedDocument(urls.length, 7), 201);
    });

    const importerDependencies = dependencies(fetchMock);
    importerDependencies.writeProgress = async (value) => {
      progress.push(structuredClone(value));
    };
    const summary = await importBatch(
      config,
      { mode: "copy", filePaths: [first, second], folderId: 7, tagIds: [9, 10, 9] },
      importerDependencies
    );

    expect(summary.results.map((result) => result.status)).toEqual(["copied", "copied"]);
    expect(maxActiveRequests).toBe(1);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("folder=7");
    expect(urls[0]).not.toContain("categor");
    expect(urls[0]).toContain("tags=9%2C10");
    expect(summary.results[0]?.document).toMatchObject({ isInDocumentLibrary: true, version: 1, folders: [{ id: 7 }], tags: [{ id: 9 }] });
    expect(progress[0]).toMatchObject({ phase: "ready", completed: 0, total: 2 });
    expect(progress).toContainEqual(expect.objectContaining({ phase: "uploading", completed: 0, currentFilePath: first }));
    expect(progress).toContainEqual(expect.objectContaining({ phase: "uploading", completed: 1, currentFilePath: second }));
    expect(progress.at(-1)).toMatchObject({ phase: "complete", completed: 2, total: 2 });
    expect(progress.at(-1)?.currentFilePath).toBeUndefined();
    await expect(stat(first)).resolves.toBeDefined();
    await expect(stat(second)).resolves.toBeDefined();
  });

  it("verschiebt nur Dateien mit erfolgreichem 201-Import und behält Fehlerquellen", async () => {
    const success = await tempFile("erfolg.txt");
    const conflict = await tempFile("dublette.txt");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(importedDocument(42), 201))
      .mockResolvedValueOnce(jsonResponse({ error: "CONFLICT", message: "Bereits vorhanden", statusCode: 409 }, 409));

    const summary = await importBatch(config, { mode: "move", filePaths: [success, conflict] }, dependencies(fetchMock));

    expect(summary.results).toEqual([
      expect.objectContaining({ filePath: success, status: "moved", documentId: 42 }),
      expect.objectContaining({ filePath: conflict, status: "failed", message: "Bereits vorhanden" })
    ]);
    await expect(stat(success)).rejects.toThrow();
    await expect(stat(conflict)).resolves.toBeDefined();
  });

  it("meldet einen Löschfehler als importiert, aber nicht verschoben", async () => {
    const filePath = await tempFile("gesperrt.txt");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(importedDocument(23), 201));
    const removeFile = vi.fn<ImporterDependencies["removeFile"]>().mockRejectedValue(new Error("Datei wird verwendet"));

    const summary = await importBatch(config, { mode: "move", filePaths: [filePath] }, dependencies(fetchMock, removeFile));

    expect(summary.results[0]).toMatchObject({ status: "imported_not_moved", documentId: 23 });
    expect(summary.results[0]?.message).toContain("Datei wird verwendet");
    await expect(stat(filePath)).resolves.toBeDefined();
  });

  it("behält die Quelle bei einem Netzwerkfehler", async () => {
    const filePath = await tempFile("offline.txt");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("ECONNREFUSED"));

    const summary = await importBatch(config, { mode: "move", filePaths: [filePath] }, dependencies(fetchMock));

    expect(summary.results[0]).toMatchObject({ status: "failed" });
    expect(summary.results[0]?.message).toContain("ECONNREFUSED");
    await expect(stat(filePath)).resolves.toBeDefined();
  });
});
