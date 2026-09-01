import type {
  AttachmentLocalEntry,
  AttachmentLocalFolder,
  AttachmentOwner,
  Paginated
} from "@taskmanager/shared-types";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { DbClient } from "../db/client.js";
import {
  attachmentLocalFolderRepository,
  type AttachmentLocalFolderRecord
} from "../repositories/attachment-local-folder.repository.js";
import { badRequest, conflict, internalError, notFound } from "../utils/errors.js";
import { ensureAttachmentOwnerExists } from "./attachments.service.js";
import type { FileOpener } from "./file-opener.service.js";

const execFileAsync = promisify(execFile);

const mimeTypesByExtension: Readonly<Record<string, string>> = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".htm": "text/html",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".md": "text/markdown",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
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
  ".zip": "application/zip"
};

export interface AttachmentLocalFile {
  diskPath: string;
  name: string;
  mimetype: string;
  size: number;
  relativePath: string;
  folder: AttachmentLocalFolder;
}

function mapFolder(record: AttachmentLocalFolderRecord): AttachmentLocalFolder {
  return {
    id: record.id,
    owner: { type: record.ownerType, id: record.ownerId },
    name: record.name,
    rootPath: record.rootPath,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function normalizedName(value: string | undefined, rootPath: string): string {
  const name = (value?.trim() || path.basename(rootPath) || rootPath).trim();
  if (!name) {
    throw badRequest("Ein Anzeigename für den lokalen Ordner ist erforderlich.");
  }
  if (name.length > 191) {
    throw badRequest("Der Anzeigename darf höchstens 191 Zeichen lang sein.");
  }
  return name;
}

function rootPathHash(rootPath: string): string {
  return createHash("sha256").update(rootPath.toLocaleLowerCase("de-DE")).digest("hex");
}

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeRelativePath(relativePath: string | undefined): string {
  const normalized = (relativePath ?? "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (normalized === ".") {
    return "";
  }
  if (normalized.split("/").some((segment) => segment === "..")) {
    throw badRequest("Der angeforderte Pfad liegt außerhalb des verknüpften Ordners.");
  }
  return normalized;
}

function toApiRelativePath(rootPath: string, diskPath: string): string {
  return path.relative(rootPath, diskPath).split(path.sep).join("/");
}

function mimetypeForName(name: string): string {
  return mimeTypesByExtension[path.extname(name).toLocaleLowerCase("de-DE")] ?? "application/octet-stream";
}

async function canonicalDirectory(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) {
    throw badRequest("Der lokale Ordnerpfad muss absolut sein.");
  }
  let canonicalPath: string;
  try {
    canonicalPath = await fs.realpath(path.resolve(trimmed));
    const stats = await fs.stat(canonicalPath);
    if (!stats.isDirectory()) {
      throw badRequest("Der lokale Pfad verweist nicht auf einen Ordner.");
    }
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    throw badRequest("Der lokale Ordner wurde nicht gefunden oder ist nicht lesbar.");
  }
  return canonicalPath;
}

async function loadFolder(database: DbClient, id: number): Promise<AttachmentLocalFolderRecord> {
  const folder = await attachmentLocalFolderRepository.findById(database, id);
  if (!folder) {
    throw notFound(`Local attachment folder with id ${id} not found`);
  }
  await ensureAttachmentOwnerExists(database, {
    type: folder.ownerType,
    id: folder.ownerId
  });
  return folder;
}

async function resolveFolderTarget(
  record: AttachmentLocalFolderRecord,
  relativePathInput: string | undefined
): Promise<{ rootPath: string; targetPath: string; relativePath: string }> {
  const rootPath = await canonicalDirectory(record.rootPath);
  const relativePath = normalizeRelativePath(relativePathInput);
  const lexicalTarget = path.resolve(rootPath, ...relativePath.split("/").filter(Boolean));
  if (!isSameOrInside(lexicalTarget, rootPath)) {
    throw badRequest("Der angeforderte Pfad liegt außerhalb des verknüpften Ordners.");
  }
  let targetPath: string;
  try {
    targetPath = await fs.realpath(lexicalTarget);
  } catch {
    throw notFound("Die lokale Datei oder der lokale Ordner wurde nicht gefunden.");
  }
  if (!isSameOrInside(targetPath, rootPath)) {
    throw badRequest("Der angeforderte Pfad verlässt den verknüpften Ordner über eine Dateisystem-Verknüpfung.");
  }
  return { rootPath, targetPath, relativePath: toApiRelativePath(rootPath, targetPath) };
}

export async function listAttachmentLocalFolders(
  database: DbClient,
  owner: AttachmentOwner
): Promise<AttachmentLocalFolder[]> {
  await ensureAttachmentOwnerExists(database, owner);
  return (await attachmentLocalFolderRepository.findByOwner(database, owner)).map(mapFolder);
}

export async function createAttachmentLocalFolder(
  database: DbClient,
  input: { owner: AttachmentOwner; rootPath: string; name?: string },
  userId?: number
): Promise<AttachmentLocalFolder> {
  await ensureAttachmentOwnerExists(database, input.owner);
  const rootPath = await canonicalDirectory(input.rootPath);
  const hash = rootPathHash(rootPath);
  if (await attachmentLocalFolderRepository.findByOwnerAndPathHash(database, input.owner, hash)) {
    throw conflict("Dieser lokale Ordner ist bereits mit dem Item verknüpft.");
  }
  return mapFolder(
    await attachmentLocalFolderRepository.create(
      database,
      {
        owner: input.owner,
        name: normalizedName(input.name, rootPath),
        rootPath,
        rootPathHash: hash
      },
      userId
    )
  );
}

export async function deleteAttachmentLocalFolder(
  database: DbClient,
  id: number,
  expectedVersion: number
): Promise<void> {
  await loadFolder(database, id);
  if ((await attachmentLocalFolderRepository.deleteVersioned(database, id, expectedVersion)) === 0) {
    throw conflict("Der lokale Ordner wurde zwischenzeitlich geändert.");
  }
}

export async function listAttachmentLocalEntries(
  database: DbClient,
  folderId: number,
  relativePath: string | undefined,
  page: number,
  pageSize: number
): Promise<Paginated<AttachmentLocalEntry>> {
  const folder = await loadFolder(database, folderId);
  const resolved = await resolveFolderTarget(folder, relativePath);
  const stats = await fs.stat(resolved.targetPath);
  if (!stats.isDirectory()) {
    throw badRequest("Der angeforderte lokale Pfad ist kein Ordner.");
  }
  const directoryEntries = await fs.readdir(resolved.targetPath, { withFileTypes: true });
  directoryEntries.sort((left, right) => {
    const leftDirectory = left.isDirectory();
    const rightDirectory = right.isDirectory();
    if (leftDirectory !== rightDirectory) {
      return leftDirectory ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "de-DE", { numeric: true, sensitivity: "base" });
  });
  const start = (page - 1) * pageSize;
  const pageEntries = directoryEntries.slice(start, start + pageSize);
  const data: AttachmentLocalEntry[] = [];
  for (const entry of pageEntries) {
    const candidate = path.join(resolved.targetPath, entry.name);
    let canonicalEntry: string;
    let entryStats;
    try {
      canonicalEntry = await fs.realpath(candidate);
      if (!isSameOrInside(canonicalEntry, resolved.rootPath)) {
        continue;
      }
      entryStats = await fs.stat(canonicalEntry);
    } catch {
      continue;
    }
    if (!entryStats.isDirectory() && !entryStats.isFile()) {
      continue;
    }
    const apiRelativePath = toApiRelativePath(resolved.rootPath, canonicalEntry);
    const isDirectory = entryStats.isDirectory();
    data.push({
      folderId,
      kind: isDirectory ? "directory" : "file",
      name: entry.name,
      relativePath: apiRelativePath,
      mimetype: isDirectory ? null : mimetypeForName(entry.name),
      size: isDirectory ? null : entryStats.size,
      updatedAt: entryStats.mtime.toISOString(),
      url: isDirectory
        ? null
        : `/api/attachment-local-folders/${folderId}/content?relativePath=${encodeURIComponent(apiRelativePath)}`
    });
  }
  return {
    data,
    total: directoryEntries.length,
    page,
    pageSize
  };
}

export async function getAttachmentLocalFile(
  database: DbClient,
  folderId: number,
  relativePath: string
): Promise<AttachmentLocalFile> {
  const folderRecord = await loadFolder(database, folderId);
  const resolved = await resolveFolderTarget(folderRecord, relativePath);
  const stats = await fs.stat(resolved.targetPath);
  if (!stats.isFile()) {
    throw badRequest("Der angeforderte lokale Pfad ist keine Datei.");
  }
  return {
    diskPath: resolved.targetPath,
    name: path.basename(resolved.targetPath),
    mimetype: mimetypeForName(resolved.targetPath),
    size: stats.size,
    relativePath: resolved.relativePath,
    folder: mapFolder(folderRecord)
  };
}

export async function getAttachmentLocalFileForOwner(
  database: DbClient,
  owner: AttachmentOwner,
  folderId: number,
  relativePath: string
): Promise<AttachmentLocalFile> {
  const file = await getAttachmentLocalFile(database, folderId, relativePath);
  if (file.folder.owner.type !== owner.type || file.folder.owner.id !== owner.id) {
    throw notFound(`Local attachment folder with id ${folderId} not found for owner`);
  }
  return file;
}

export async function openAttachmentLocalFile(
  database: DbClient,
  folderId: number,
  relativePath: string,
  fileOpener: FileOpener
): Promise<void> {
  const file = await getAttachmentLocalFile(database, folderId, relativePath);
  try {
    await fileOpener(file.diskPath);
  } catch {
    throw internalError("Lokale Datei konnte nicht geöffnet werden.");
  }
}

export async function pickWindowsDirectory(): Promise<string | null> {
  if (process.platform !== "win32") {
    throw badRequest("Der native Ordnerdialog ist nur auf dem lokalen Windows-System verfügbar.");
  }
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = 'Lokalen Ordner mit dem Projekt Manager verknüpfen'",
    "$dialog.ShowNewFolderButton = $false",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()",
    "  Write-Output $dialog.SelectedPath",
    "}"
  ].join("\r\n");
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  try {
    const result = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-STA", "-EncodedCommand", encoded],
      { windowsHide: true, maxBuffer: 64 * 1024 }
    );
    const selectedPath = result.stdout.trim();
    return selectedPath ? canonicalDirectory(selectedPath) : null;
  } catch {
    throw internalError("Der Windows-Ordnerdialog konnte nicht geöffnet werden.");
  }
}
