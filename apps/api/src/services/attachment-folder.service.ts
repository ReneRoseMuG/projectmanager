import type { AttachmentFolder } from "@taskmanager/shared-types";
import { eq, inArray, sql } from "drizzle-orm";
import type { DbClient, DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { attachmentFolders, folderAttachments, projects } from "../db/schema.js";
import { attachmentFolderRepository, type AttachmentFolderRecord } from "../repositories/attachment-folder.repository.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { assertVersion } from "../repositories/base.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { buildJournalChanges, makeJournalObject, recordJournalEntry, type JournalActor } from "./journal.service.js";

interface FolderUsage {
  childCount: number;
  directDocumentCount: number;
}

function mapFolder(record: AttachmentFolderRecord, usage?: FolderUsage): AttachmentFolder {
  return {
    id: record.id,
    parentId: record.parentId,
    projectId: record.projectId,
    name: record.name,
    childCount: usage?.childCount ?? 0,
    directDocumentCount: usage?.directDocumentCount ?? 0,
    version: record.version
  };
}

function cleanName(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw badRequest("Ein Sammlungsname ist erforderlich.");
  }
  return trimmed;
}

async function ensureAttachmentExists(database: DbClient, attachmentId: number) {
  const attachment = await attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  return attachment;
}

async function ensureFolderExists(database: DbSession, id: number): Promise<AttachmentFolderRecord> {
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

function assertNoCycle(folders: AttachmentFolderRecord[], folderId: number, newParentId: number | null): void {
  if (newParentId === null) {
    return;
  }
  if (newParentId === folderId) {
    throw badRequest("Eine Sammlung kann nicht sich selbst untergeordnet werden.");
  }
  const parentById = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  let currentId: number | null = newParentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (currentId === folderId) {
      throw badRequest("Eine Sammlung kann nicht unter eine ihrer Untersammlungen verschoben werden.");
    }
    if (visited.has(currentId)) {
      throw badRequest("Die Sammlungshierarchie enthält bereits einen Zyklus.");
    }
    visited.add(currentId);
    const parentId = parentById.get(currentId);
    if (parentId === undefined) {
      throw badRequest("Die gewählte übergeordnete Sammlung ist ungültig.");
    }
    currentId = parentId;
  }
}

async function loadFolderUsage(database: DbClient, folderIds: number[]): Promise<Map<number, FolderUsage>> {
  const usage = new Map<number, FolderUsage>();
  for (const folderId of folderIds) {
    usage.set(folderId, { childCount: 0, directDocumentCount: 0 });
  }
  if (folderIds.length === 0) {
    return usage;
  }

  const childRows = await database
    .select({ folderId: attachmentFolders.parentId, count: sql<number>`count(*)` })
    .from(attachmentFolders)
    .where(inArray(attachmentFolders.parentId, folderIds))
    .groupBy(attachmentFolders.parentId);
  for (const row of childRows) {
    if (row.folderId !== null) {
      const entry = usage.get(row.folderId);
      if (entry) {
        entry.childCount = Number(row.count);
      }
    }
  }

  const documentRows = await database
    .select({ folderId: folderAttachments.folderId, count: sql<number>`count(*)` })
    .from(folderAttachments)
    .where(inArray(folderAttachments.folderId, folderIds))
    .groupBy(folderAttachments.folderId);
  for (const row of documentRows) {
    const entry = usage.get(row.folderId);
    if (entry) {
      entry.directDocumentCount = Number(row.count);
    }
  }
  return usage;
}

export async function listAttachmentFolders(database: DbClient): Promise<AttachmentFolder[]> {
  const rows = await attachmentFolderRepository.findAll(database);
  const usage = await loadFolderUsage(database, rows.map((row) => row.id));
  return rows.map((row) => mapFolder(row, usage.get(row.id)));
}

export async function listFolderAndDescendantIds(database: DbClient, folderId: number): Promise<number[]> {
  const rows = await attachmentFolderRepository.findAll(database);
  if (!rows.some((folder) => folder.id === folderId)) {
    throw notFound(`Attachment folder with id ${folderId} not found`);
  }
  const childrenByParent = new Map<number, number[]>();
  for (const folder of rows) {
    if (folder.parentId !== null) {
      const children = childrenByParent.get(folder.parentId);
      if (children) {
        children.push(folder.id);
      } else {
        childrenByParent.set(folder.parentId, [folder.id]);
      }
    }
  }
  const result: number[] = [];
  const visited = new Set<number>();
  const queue = [folderId];
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    if (currentId === undefined || visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);
    result.push(currentId);
    queue.push(...(childrenByParent.get(currentId) ?? []));
  }
  return result;
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
  const created = await attachmentFolderRepository.create(
    database,
    { name, parentId, projectId: input.projectId ?? null },
    userId
  );
  return mapFolder(created);
}

export async function updateAttachmentFolder(
  database: DbClient,
  id: number,
  input: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number },
  userId?: number
): Promise<AttachmentFolder> {
  const current = await ensureFolderExists(database, id);
  assertVersion(current.version, input.expectedVersion);
  const data: { name?: string; parentId?: number | null; projectId?: number | null } = {};

  const nextParentId = input.parentId !== undefined ? input.parentId : current.parentId;
  if (input.parentId !== undefined && input.parentId !== current.parentId) {
    const folders = await attachmentFolderRepository.findAll(database);
    assertNoCycle(folders, id, input.parentId);
    data.parentId = input.parentId;
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
    throw conflict("Die Sammlung wurde zwischenzeitlich geändert.");
  }
  const usage = await loadFolderUsage(database, [id]);
  return mapFolder(updated, usage.get(id));
}

export async function deleteAttachmentFolder(
  database: DbClient,
  id: number,
  expectedVersion: number
): Promise<void> {
  const current = await ensureFolderExists(database, id);
  assertVersion(current.version, expectedVersion);
  const usage = (await loadFolderUsage(database, [id])).get(id) ?? { childCount: 0, directDocumentCount: 0 };
  if (usage.childCount > 0 || usage.directDocumentCount > 0) {
    throw conflict(
      `Die Sammlung ist nicht leer (${usage.childCount} direkte Untersammlung(en), ${usage.directDocumentCount} direkt zugeordnete Dokument(e)). Verschieben oder entfernen Sie diese Inhalte zuerst.`
    );
  }
  if (await attachmentFolderRepository.deleteVersioned(database, id, expectedVersion) === 0) {
    throw conflict("Die Sammlung wurde zwischenzeitlich geändert.");
  }
}

export async function setAttachmentFolder(
  database: DbClient,
  attachmentId: number,
  input: { folderId: number | null; expectedVersion: number },
  actor?: JournalActor | null
): Promise<number> {
  const attachment = await ensureAttachmentExists(database, attachmentId);
  assertVersion(attachment.version, input.expectedVersion);
  let nextFolder: AttachmentFolderRecord | null = null;
  if (input.folderId !== null) {
    nextFolder = await ensureFolderExists(database, input.folderId);
  }

  const currentLink = firstRow(
    await database
      .select({ folderId: folderAttachments.folderId })
      .from(folderAttachments)
      .where(eq(folderAttachments.attachmentId, attachmentId))
  );
  if ((currentLink?.folderId ?? null) === input.folderId) {
    return attachment.version;
  }

  const currentFolder = currentLink ? await ensureFolderExists(database, currentLink.folderId) : null;

  return database.transaction(async (tx) => {
    await tx.delete(folderAttachments).where(eq(folderAttachments.attachmentId, attachmentId));
    if (input.folderId !== null) {
      await tx.insert(folderAttachments).values({ folderId: input.folderId, attachmentId });
    }
    const updated = await attachmentRepository.bumpVersion(tx, attachmentId, input.expectedVersion, actor?.actorUserId ?? undefined);
    if (!updated) {
      throw conflict("Das Dokument wurde zwischenzeitlich geändert.");
    }
    const journalObject = makeJournalObject("attachment", attachment.id, attachment.originalName);
    const before = { folderId: currentFolder?.id ?? null };
    const after = { folderId: nextFolder?.id ?? null };
    const changes = buildJournalChanges(before, after, [{
      key: "folderId",
      label: "Sammlung",
      format: (value) => value === null
        ? null
        : value === currentFolder?.id
          ? currentFolder?.name ?? String(value)
          : nextFolder?.name ?? String(value)
    }]);
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: `${journalObject.label} wurde von ${currentFolder?.name ?? "Nicht einsortiert"} nach ${nextFolder?.name ?? "Nicht einsortiert"} verschoben.`,
      changes,
      actor
    });
    return updated.version;
  });
}
