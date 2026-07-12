import type { AttachmentCategory, AttachmentFolder, Tag } from "@taskmanager/shared-types";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_FILE_COUNT = 100;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export interface FolderOption extends AttachmentFolder {
  label: string;
}

export interface ImportOptions {
  folders: FolderOption[];
  categories: AttachmentCategory[];
  tags: Tag[];
}

export interface ImportRequest {
  mode: "copy" | "move";
  filePaths: string[];
  folderIds?: number[];
  categoryIds?: number[];
  tagIds?: number[];
}

export type ImportResultStatus = "copied" | "moved" | "imported_not_moved" | "failed";

export interface ImportResult {
  filePath: string;
  status: ImportResultStatus;
  message: string;
  documentId?: number;
}

export interface ImportSummary {
  mode: ImportRequest["mode"];
  total: number;
  completed: number;
  phase: "ready" | "uploading" | "complete";
  currentFilePath?: string;
  results: ImportResult[];
}

export interface ImporterConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export interface ImporterDependencies {
  fetch: typeof fetch;
  readFile: typeof readFile;
  removeFile: typeof rm;
  stat: typeof stat;
  writeProgress?: (summary: ImportSummary) => Promise<void>;
}

const defaultDependencies: ImporterDependencies = {
  fetch,
  readFile,
  removeFile: rm,
  stat
};

function apiUrl(config: ImporterConfig, route: string): string {
  return `${config.apiBaseUrl.replace(/\/$/, "")}/${route.replace(/^\//, "")}`;
}

async function apiJson<T>(config: ImporterConfig, route: string, dependencies: ImporterDependencies): Promise<T> {
  let response: Response;
  try {
    response = await dependencies.fetch(apiUrl(config, route), { headers: { "x-api-key": config.apiKey } });
  } catch (error) {
    throw new Error(`Projekt-Manager-API ist nicht erreichbar: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    throw new Error(await responseMessage(response));
  }
  return response.json() as Promise<T>;
}

function buildFolderLabels(folders: AttachmentFolder[]): FolderOption[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const labelFor = (folder: AttachmentFolder): string => {
    const names = [folder.name];
    const visited = new Set<number>([folder.id]);
    let parentId = folder.parentId;
    while (parentId !== null) {
      if (visited.has(parentId)) {
        break;
      }
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) {
        break;
      }
      names.unshift(parent.name);
      parentId = parent.parentId;
    }
    return names.join(" / ");
  };
  return folders.map((folder) => ({ ...folder, label: labelFor(folder) })).sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export async function loadImportOptions(
  config: ImporterConfig,
  dependencies: ImporterDependencies = defaultDependencies
): Promise<ImportOptions> {
  const folders = await apiJson<AttachmentFolder[]>(config, "attachment-folders", dependencies);
  const categories = await apiJson<AttachmentCategory[]>(config, "attachment-categories", dependencies);
  const tags = await apiJson<Tag[]>(config, "tags?domain=dms", dependencies);
  return {
    folders: buildFolderLabels(folders),
    categories: [...categories].sort((a, b) => a.name.localeCompare(b.name, "de")),
    tags: tags.filter((tag) => tag.domain === "dms" && !tag.isSystem).sort((a, b) => a.name.localeCompare(b.name, "de"))
  };
}

export async function createDmsTag(
  config: ImporterConfig,
  name: string,
  dependencies: Pick<ImporterDependencies, "fetch"> = defaultDependencies
): Promise<Tag> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Ein Tag-Name ist erforderlich.");
  }
  let response: Response;
  try {
    response = await dependencies.fetch(apiUrl(config, "tags"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": config.apiKey },
      body: JSON.stringify({ name: trimmedName, domain: "dms" })
    });
  } catch (error) {
    throw new Error(`Projekt-Manager-API ist nicht erreichbar: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.status !== 201) {
    throw new Error(await responseMessage(response));
  }
  const tag = await response.json() as Tag;
  if (tag.domain !== "dms") {
    throw new Error("Die API hat keinen DMS-Tag zurückgegeben.");
  }
  return tag;
}

export async function validateImportRequest(
  request: ImportRequest,
  dependencies: Pick<ImporterDependencies, "stat"> = defaultDependencies
): Promise<void> {
  if (request.mode !== "copy" && request.mode !== "move") {
    throw new Error("Der Importmodus muss 'copy' oder 'move' sein.");
  }
  const uniquePaths = new Set(request.filePaths.map((filePath) => path.resolve(filePath)));
  if (uniquePaths.size === 0) {
    throw new Error("Es wurde keine Datei ausgewählt.");
  }
  if (uniquePaths.size !== request.filePaths.length) {
    throw new Error("Die Dateiauswahl enthält doppelte Pfade.");
  }
  if (request.filePaths.length > MAX_FILE_COUNT) {
    throw new Error(`Es können höchstens ${MAX_FILE_COUNT} Dateien gleichzeitig importiert werden.`);
  }
  for (const filePath of request.filePaths) {
    const fileStat = await dependencies.stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`Der Pfad ist keine reguläre Datei: ${filePath}`);
    }
    if (fileStat.size > MAX_FILE_SIZE) {
      throw new Error(`Die Datei überschreitet das Limit von 25 MB: ${filePath}`);
    }
  }
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".gif": "image/gif",
    ".html": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".json": "application/json",
    ".md": "text/markdown",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webp": "image/webp",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xml": "application/xml",
    ".zip": "application/zip"
  };
  return types[extension] ?? "application/octet-stream";
}

function buildUploadUrl(config: ImporterConfig, request: ImportRequest): string {
  const url = new URL(apiUrl(config, "documents"));
  if ((request.folderIds?.length ?? 0) > 0) url.searchParams.set("folders", [...new Set(request.folderIds)].join(","));
  if ((request.categoryIds?.length ?? 0) > 0) url.searchParams.set("categories", [...new Set(request.categoryIds)].join(","));
  if ((request.tagIds?.length ?? 0) > 0) url.searchParams.set("tags", [...new Set(request.tagIds)].join(","));
  return url.toString();
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { message?: string };
    return body.message ?? `Import fehlgeschlagen (HTTP ${response.status}).`;
  } catch {
    return `Import fehlgeschlagen (HTTP ${response.status}).`;
  }
}

async function importFile(
  config: ImporterConfig,
  request: ImportRequest,
  filePath: string,
  dependencies: ImporterDependencies
): Promise<ImportResult> {
  try {
    const bytes = await dependencies.readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: contentTypeFor(filePath) }), path.basename(filePath));
    const response = await dependencies.fetch(buildUploadUrl(config, request), {
      method: "POST",
      headers: { "x-api-key": config.apiKey },
      body: form
    });
    if (response.status !== 201) {
      return { filePath, status: "failed", message: await responseMessage(response) };
    }
    const document = await response.json() as { id: number };
    if (request.mode === "copy") {
      return { filePath, status: "copied", message: "Kopiert", documentId: document.id };
    }
    try {
      await dependencies.removeFile(filePath);
      return { filePath, status: "moved", message: "Verschoben", documentId: document.id };
    } catch (error) {
      return {
        filePath,
        status: "imported_not_moved",
        message: `Importiert, aber Quelldatei konnte nicht gelöscht werden: ${error instanceof Error ? error.message : String(error)}`,
        documentId: document.id
      };
    }
  } catch (error) {
    return { filePath, status: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

export async function importBatch(
  config: ImporterConfig,
  request: ImportRequest,
  dependencies: ImporterDependencies = defaultDependencies
): Promise<ImportSummary> {
  await validateImportRequest(request, dependencies);
  const summary: ImportSummary = { mode: request.mode, total: request.filePaths.length, completed: 0, phase: "ready", results: [] };
  await dependencies.writeProgress?.(summary);
  for (const filePath of request.filePaths) {
    summary.phase = "uploading";
    summary.currentFilePath = filePath;
    await dependencies.writeProgress?.(summary);
    summary.results.push(await importFile(config, request, filePath, dependencies));
    summary.completed = summary.results.length;
    summary.phase = "ready";
    delete summary.currentFilePath;
    await dependencies.writeProgress?.(summary);
  }
  summary.phase = "complete";
  delete summary.currentFilePath;
  await dependencies.writeProgress?.(summary);
  return summary;
}

export function progressFileWriter(progressPath: string): (summary: ImportSummary) => Promise<void> {
  return async (summary) => {
    await writeFile(progressPath, JSON.stringify(summary), "utf8");
  };
}
