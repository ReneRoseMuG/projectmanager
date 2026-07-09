import type { Archiver } from "archiver";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import type { DbClient } from "../db/client.js";
import { config } from "../config.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { badRequest, notFound } from "../utils/errors.js";

// archiver v8 exportiert Format-Klassen (ZipArchive/TarArchive/…) statt einer aufrufbaren
// Default-Funktion und stellt unter ESM keinen Default-Export bereit; die installierten
// @types/archiver (v7) beschreiben noch die alte aufrufbare API. Daher wird die Zip-Klasse zur
// Laufzeit über createRequire geladen (der bekannte Instanztyp Archiver bleibt für die
// Typisierung). Wichtig: die generische new Archiver("zip", …) initialisiert das Zip-Modul in
// v8 NICHT (this._module.append fehlt) — nur die Format-Klasse ZipArchive trägt es fest in sich.
const nodeRequire = createRequire(import.meta.url);
const { ZipArchive } = nodeRequire("archiver") as {
  ZipArchive: new (options?: { zlib?: { level?: number } }) => Archiver;
};

// MS-75 (DMS): Bulk-Download der Mehrfachauswahl. Ein Browser lädt immer nur EINE Datei,
// daher werden die gewählten Dokumente serverseitig zu einem Zip-Stream gebündelt. Robust
// gegen Prod-Drift: fehlt eine Datei auf der Platte (oder läge ihr Pfad außerhalb des
// Upload-Verzeichnisses), wird sie übersprungen statt den ganzen Download abzubrechen.

function isSameOrInside(targetPath: string, rootPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export interface DocumentDownloadFile {
  diskPath: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export async function getDocumentDownloadFile(database: DbClient, attachmentId: number): Promise<DocumentDownloadFile> {
  const record = await attachmentRepository.findById(database, attachmentId);
  if (!record) {
    throw notFound(`Document with id ${attachmentId} not found`);
  }
  const diskPath = path.resolve(config.uploadDir, record.filename);
  if (!isSameOrInside(diskPath, config.uploadDir)) {
    throw badRequest("Attachment filename points outside the upload directory");
  }
  if (!(await fileExists(diskPath))) {
    throw notFound("Die Datei wurde im Upload-Verzeichnis nicht gefunden.");
  }
  return {
    diskPath,
    originalName: record.originalName,
    mimetype: record.mimetype,
    size: record.size
  };
}

// Kollisionsfreier Eintragsname im Zip: gleiche Originalnamen bekommen " (2)", " (3)" …
function uniqueEntryName(originalName: string, used: Set<string>): string {
  if (!used.has(originalName)) {
    used.add(originalName);
    return originalName;
  }
  const extension = path.extname(originalName);
  const base = originalName.slice(0, originalName.length - extension.length);
  let counter = 2;
  let candidate = `${base} (${counter})${extension}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${extension}`;
  }
  used.add(candidate);
  return candidate;
}

// Baut das Zip-Archiv (Readable-Stream) aus den ausgewählten Dokumenten. Das Archiv ist noch
// NICHT finalisiert — der Aufrufer setzt die Antwort-Header, ruft finalize() und streamt es.
export async function buildDocumentsArchive(database: DbClient, attachmentIds: number[]): Promise<Archiver> {
  const uniqueIds = [...new Set(attachmentIds)];
  if (uniqueIds.length === 0) {
    throw badRequest("Es wurden keine Dokumente ausgewählt.");
  }
  const records = await attachmentRepository.findDownloadRecords(database, uniqueIds);
  if (records.length === 0) {
    throw notFound("Keine der ausgewählten Dokumente wurde gefunden.");
  }

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const usedNames = new Set<string>();
  let appended = 0;
  for (const record of records) {
    const diskPath = path.resolve(config.uploadDir, record.filename);
    if (!isSameOrInside(diskPath, config.uploadDir)) {
      continue;
    }
    if (!(await fileExists(diskPath))) {
      continue;
    }
    archive.file(diskPath, { name: uniqueEntryName(record.originalName, usedNames) });
    appended += 1;
  }
  if (appended === 0) {
    throw notFound("Keine der ausgewählten Dateien wurde im Upload-Verzeichnis gefunden.");
  }
  return archive;
}
