import type { AttachmentFolder, AttachmentFolderOrderInput } from "@taskmanager/shared-types";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { attachmentFolders, folderAttachments, projects } from "../db/schema.js";
import { attachmentFolderRepository, type AttachmentFolderRecord } from "../repositories/attachment-folder.repository.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { assertVersion } from "../repositories/base.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";

// MS-75 (DMS): Sammlungen ("virtuelle Ordner") sind hierarchisch (Selbst-FK parent_id)
// und n:m zu Dokumenten (folder_attachments). Journaling ist bewusst noch nicht
// angebunden — Folgeschritt (analog Kategorien).

function mapFolder(record: AttachmentFolderRecord): AttachmentFolder {
  return { id: record.id, parentId: record.parentId, projectId: record.projectId, name: record.name, sortOrder: record.sortOrder, version: record.version };
}

function flattenFolders(rows: AttachmentFolderRecord[]): AttachmentFolderRecord[] {
  const childrenByParent = new Map<number | null, AttachmentFolderRecord[]>();
  for (const row of rows) {
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parentId, siblings);
  }
  const result: AttachmentFolderRecord[] = [];
  const appendChildren = (parentId: number | null) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      result.push(child);
      appendChildren(child.id);
    }
  };
  appendChildren(null);
  return result;
}

function assertCompleteFolderOrder(rows: AttachmentFolderRecord[], input: AttachmentFolderOrderInput): void {
  if (input.items.length === 0) {
    throw badRequest("Die Sammlungsreihenfolge darf nicht leer sein.");
  }
  const ids = input.items.map((item) => item.id);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) {
    throw badRequest("Die Sammlungsreihenfolge enthält doppelte Einträge.");
  }
  if (rows.length !== ids.length || rows.some((row) => !idSet.has(row.id))) {
    throw badRequest("Die Sammlungsreihenfolge muss alle Sammlungen derselben Ebene enthalten.");
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const item of input.items) {
    const current = byId.get(item.id);
    if (!current) {
      throw badRequest("Die Sammlungsreihenfolge enthält einen unbekannten Eintrag.");
    }
    assertVersion(current.version, item.expectedVersion);
  }
}

function cleanName(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw badRequest("Ein Sammlungsname ist erforderlich.");
  }
  return trimmed;
}

async function ensureAttachmentExists(database: DbClient, attachmentId: number): Promise<void> {
  const attachment = await attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
}

async function ensureFolderExists(database: DbClient, id: number): Promise<AttachmentFolderRecord> {
  const folder = await attachmentFolderRepository.findById(database, id);
  if (!folder) {
    throw notFound(`Attachment folder with id ${id} not found`);
  }
  return folder;
}

async function ensureProjectExists(database: DbClient, projectId: number): Promise<void> {
  const project = firstRow(await database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)));
  if (!project) {
    throw notFound(`Project with id ${projectId} not found`);
  }
}

async function assertNameUniquePerLevel(
  database: DbClient,
  parentId: number | null,
  name: string,
  ignoreId?: number
): Promise<void> {
  const sibling = await attachmentFolderRepository.findSiblingByName(database, parentId, name);
  if (sibling && sibling.id !== ignoreId) {
    throw conflict(`Auf dieser Ebene existiert bereits eine Sammlung mit dem Namen "${name}".`);
  }
}

async function assertNoCycle(database: DbClient, folderId: number, newParentId: number | null): Promise<void> {
  if (newParentId === null) {
    return;
  }
  if (newParentId === folderId) {
    throw badRequest("Eine Sammlung kann nicht sich selbst untergeordnet werden.");
  }
  let currentId: number | null = newParentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (currentId === folderId) {
      throw badRequest("Eine Sammlung kann nicht unter eine ihrer Unter-Sammlungen verschoben werden.");
    }
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);
    const parent: AttachmentFolderRecord | undefined = await attachmentFolderRepository.findById(database, currentId);
    currentId = parent?.parentId ?? null;
  }
}

async function deleteFolderRecursive(database: DbClient, id: number): Promise<void> {
  const children = await attachmentFolderRepository.findChildren(database, id);
  for (const child of children) {
    await deleteFolderRecursive(database, child.id);
  }
  await attachmentFolderRepository.delete(database, id);
}

export async function listAttachmentFolders(database: DbClient): Promise<AttachmentFolder[]> {
  const rows = await attachmentFolderRepository.findAll(database);
  return flattenFolders(rows).map(mapFolder);
}

export async function createAttachmentFolder(
  database: DbClient,
  input: { name?: string; parentId?: number | null; projectId?: number | null },
  userId?: number
): Promise<AttachmentFolder> {
  const name = cleanName(input.name);
  const parentId = input.parentId ?? null;
  if (parentId !== null) {
    await ensureFolderExists(database, parentId);
  }
  if (input.projectId != null) {
    await ensureProjectExists(database, input.projectId);
  }
  await assertNameUniquePerLevel(database, parentId, name);
  const sortOrder = await attachmentFolderRepository.nextSortOrder(database, parentId);
  const created = await attachmentFolderRepository.create(
    database,
    { name, parentId, projectId: input.projectId ?? null, sortOrder },
    userId
  );
  return mapFolder(created);
}

export async function reorderAttachmentFolders(
  database: DbClient,
  input: AttachmentFolderOrderInput,
  userId?: number
): Promise<AttachmentFolder[]> {
  if (input.parentId !== null) {
    await ensureFolderExists(database, input.parentId);
  }
  await database.transaction(async (tx) => {
    const rows = input.parentId === null
      ? await attachmentFolderRepository.findRootFolders(tx)
      : await attachmentFolderRepository.findChildren(tx, input.parentId);
    assertCompleteFolderOrder(rows, input);
    const affected = await attachmentFolderRepository.updateOrder(
      tx,
      input.items.map((item, index) => ({ ...item, sortOrder: index * 1024 })),
      userId
    );
    if (affected !== input.items.length) {
      throw conflict("Die Sammlungen wurden zwischenzeitlich geändert. Bitte neu laden.");
    }
  });
  return listAttachmentFolders(database);
}

export async function updateAttachmentFolder(
  database: DbClient,
  id: number,
  input: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number },
  userId?: number
): Promise<AttachmentFolder> {
  const current = await ensureFolderExists(database, id);
  const data: { name?: string; parentId?: number | null; projectId?: number | null; sortOrder?: number } = {};

  const nextParentId = input.parentId !== undefined ? input.parentId : current.parentId;
  if (input.parentId !== undefined && input.parentId !== current.parentId) {
    if (input.parentId !== null) {
      await ensureFolderExists(database, input.parentId);
    }
    await assertNoCycle(database, id, input.parentId);
    data.parentId = input.parentId;
    data.sortOrder = await attachmentFolderRepository.nextSortOrder(database, input.parentId);
  }
  if (input.name !== undefined) {
    data.name = cleanName(input.name);
  }
  if (input.projectId !== undefined) {
    if (input.projectId !== null) {
      await ensureProjectExists(database, input.projectId);
    }
    data.projectId = input.projectId;
  }
  if (Object.keys(data).length === 0) {
    throw badRequest("Es wurden keine Änderungen übergeben.");
  }
  if (data.name !== undefined || data.parentId !== undefined) {
    await assertNameUniquePerLevel(database, nextParentId, data.name ?? current.name, id);
  }

  const updated = await attachmentFolderRepository.update(database, id, input.expectedVersion, data, userId);
  if (!updated) {
    throw notFound(`Attachment folder with id ${id} not found`);
  }
  return mapFolder(updated);
}

export async function deleteAttachmentFolder(database: DbClient, id: number, options?: { recursive?: boolean }): Promise<void> {
  await ensureFolderExists(database, id);
  const children = await attachmentFolderRepository.findChildren(database, id);
  if (children.length > 0 && !options?.recursive) {
    throw conflict("Die Sammlung enthält Unter-Sammlungen und kann nur mit ausdrücklicher Bestätigung gelöscht werden.");
  }
  // Dokumente bleiben erhalten: folder_attachments wird per FK-Cascade gelöst, nicht das Attachment.
  await deleteFolderRecursive(database, id);
}

export async function addAttachmentToFolder(database: DbClient, folderId: number, attachmentId: number): Promise<void> {
  await ensureFolderExists(database, folderId);
  await ensureAttachmentExists(database, attachmentId);
  await database.insert(folderAttachments).ignore().values({ folderId, attachmentId });
}

// Bulk-Variante (Mehrfachauswahl): weist mehrere Dokumente EINER Sammlung zu. Nicht
// existierende Attachment-IDs werden vorab gefiltert (kein FK-Fehler), die Zuordnung erfolgt
// als EIN gebündelter Insert — konstante Roundtrip-Zahl statt einer Query pro Dokument.
export async function addAttachmentsToFolder(database: DbClient, folderId: number, attachmentIds: number[]): Promise<void> {
  await ensureFolderExists(database, folderId);
  const uniqueIds = [...new Set(attachmentIds)];
  if (uniqueIds.length === 0) {
    return;
  }
  const existing = await attachmentRepository.findCleanupRecords(database, uniqueIds);
  if (existing.length === 0) {
    return;
  }
  await database.insert(folderAttachments).ignore().values(existing.map((row) => ({ folderId, attachmentId: row.id })));
}

export async function removeAttachmentFromFolder(database: DbClient, folderId: number, attachmentId: number): Promise<void> {
  await database
    .delete(folderAttachments)
    .where(and(eq(folderAttachments.folderId, folderId), eq(folderAttachments.attachmentId, attachmentId)));
}

export async function moveAttachmentBetweenFolders(
  database: DbClient,
  attachmentId: number,
  fromFolderId: number,
  toFolderId: number
): Promise<void> {
  await ensureFolderExists(database, toFolderId);
  await ensureAttachmentExists(database, attachmentId);
  await database.transaction(async (tx) => {
    await tx
      .delete(folderAttachments)
      .where(and(eq(folderAttachments.folderId, fromFolderId), eq(folderAttachments.attachmentId, attachmentId)));
    await tx.insert(folderAttachments).ignore().values({ folderId: toFolderId, attachmentId });
  });
}
