import type {
  Attachment,
  AttachmentOwner,
  ParentAttachmentFolder,
  ParentAttachmentFolderInput,
  ParentAttachmentFolderUpdate,
  ParentDocumentLink,
  ParentDocumentLinkInput,
  ParentFileMoveInput
} from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { assertVersion } from "../repositories/base.repository.js";
import {
  parentFileRepository,
  type ParentDocumentLinkRecord,
  type ParentFolderRecord
} from "../repositories/parent-file.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import {
  ensureAttachmentOwnerExists,
  getAttachmentOwnerJournalObject,
  listOwnerAttachments
} from "./attachments.service.js";
import { getDocument, listDocumentsByIds } from "./document.service.js";
import {
  makeJournalContext,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor
} from "./journal.service.js";

function normalizeFolderName(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    throw badRequest("Der Ordnername darf nicht leer sein.");
  }
  return normalized;
}

function mapFolders(
  owner: AttachmentOwner,
  records: ParentFolderRecord[],
  attachmentFolderIds: Array<number | null>,
  documentFolderIds: Array<number | null>
): ParentAttachmentFolder[] {
  const childCounts = new Map<number, number>();
  const entryCounts = new Map<number, number>();
  for (const record of records) {
    if (record.parentId !== null) {
      childCounts.set(record.parentId, (childCounts.get(record.parentId) ?? 0) + 1);
    }
  }
  for (const folderId of [...attachmentFolderIds, ...documentFolderIds]) {
    if (folderId !== null) {
      entryCounts.set(folderId, (entryCounts.get(folderId) ?? 0) + 1);
    }
  }
  return records.map((record) => ({
    id: record.id,
    owner,
    parentId: record.parentId,
    name: record.name,
    childCount: childCounts.get(record.id) ?? 0,
    directEntryCount: entryCounts.get(record.id) ?? 0,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }));
}

async function loadMappedFolders(database: DbClient, owner: AttachmentOwner): Promise<ParentAttachmentFolder[]> {
  const records = await parentFileRepository.listFolders(database, owner);
  const assignments = await parentFileRepository.listAttachmentFolderAssignments(database, owner);
  const links = await parentFileRepository.listDocumentLinks(database, owner);
  return mapFolders(
    owner,
    records,
    assignments.map((assignment) => assignment.folderId),
    links.map((link) => link.folderId)
  );
}

async function requireFolder(database: DbClient, owner: AttachmentOwner, folderId: number): Promise<ParentFolderRecord> {
  const folder = await parentFileRepository.findFolder(database, owner, folderId);
  if (!folder) {
    throw notFound(`Parent attachment folder with id ${folderId} not found`);
  }
  return folder;
}

async function validateFolderTarget(
  database: DbClient,
  owner: AttachmentOwner,
  folderId: number,
  parentId: number | null
): Promise<void> {
  if (parentId === null) {
    return;
  }
  await requireFolder(database, owner, parentId);
  if (parentId === folderId) {
    throw badRequest("Ein Ordner kann nicht sein eigener Unterordner sein.");
  }
  const folders = await parentFileRepository.listFolders(database, owner);
  const parentById = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  let currentId: number | null = parentId;
  while (currentId !== null) {
    if (currentId === folderId) {
      throw badRequest("Ein Ordner kann nicht in einen eigenen Unterordner verschoben werden.");
    }
    currentId = parentById.get(currentId) ?? null;
  }
}

async function ensureUniqueSibling(
  database: DbClient,
  owner: AttachmentOwner,
  parentId: number | null,
  name: string,
  excludedId?: number
): Promise<void> {
  const sibling = await parentFileRepository.findFolderSibling(database, owner, parentId, name);
  if (sibling && sibling.id !== excludedId) {
    throw conflict(`Im Zielordner existiert bereits ein Ordner mit dem Namen "${name}".`);
  }
}

function mapDocumentLink(
  owner: AttachmentOwner,
  record: ParentDocumentLinkRecord,
  document: Attachment,
  folder: ParentAttachmentFolder | null
): ParentDocumentLink {
  return {
    id: record.id,
    owner,
    document,
    folder,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listParentAttachmentFolders(database: DbClient, owner: AttachmentOwner): Promise<ParentAttachmentFolder[]> {
  await ensureAttachmentOwnerExists(database, owner);
  return loadMappedFolders(database, owner);
}

export async function createParentAttachmentFolder(
  database: DbClient,
  owner: AttachmentOwner,
  input: ParentAttachmentFolderInput,
  actor?: JournalActor | null
): Promise<ParentAttachmentFolder> {
  await ensureAttachmentOwnerExists(database, owner);
  const name = normalizeFolderName(input.name);
  const parentId = input.parentId ?? null;
  if (parentId !== null) {
    await requireFolder(database, owner, parentId);
  }
  await ensureUniqueSibling(database, owner, parentId, name);
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  const created = await database.transaction(async (tx) => {
    const folder = await parentFileRepository.createFolder(tx, owner, { name, parentId }, actor?.actorUserId ?? undefined);
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: `Attachment-Ordner "${name}" wurde angelegt.`,
      actor
    });
    return folder;
  });
  const folders = await loadMappedFolders(database, owner);
  const mapped = folders.find((folder) => folder.id === created.id);
  if (!mapped) {
    throw notFound(`Parent attachment folder with id ${created.id} not found`);
  }
  return mapped;
}

export async function updateParentAttachmentFolder(
  database: DbClient,
  owner: AttachmentOwner,
  folderId: number,
  input: ParentAttachmentFolderUpdate,
  actor?: JournalActor | null
): Promise<ParentAttachmentFolder> {
  await ensureAttachmentOwnerExists(database, owner);
  const current = await requireFolder(database, owner, folderId);
  assertVersion(current.version, input.expectedVersion);
  const name = input.name === undefined ? current.name : normalizeFolderName(input.name);
  const parentId = input.parentId === undefined ? current.parentId : input.parentId;
  await validateFolderTarget(database, owner, folderId, parentId);
  await ensureUniqueSibling(database, owner, parentId, name, folderId);
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  await database.transaction(async (tx) => {
    const updated = await parentFileRepository.updateFolder(
      tx,
      owner,
      folderId,
      input.expectedVersion,
      { name, parentId },
      actor?.actorUserId ?? undefined
    );
    if (!updated) {
      throw conflict("Der Attachment-Ordner wurde zwischenzeitlich geändert.");
    }
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: `Attachment-Ordner "${current.name}" wurde aktualisiert.`,
      actor
    });
  });
  const folders = await loadMappedFolders(database, owner);
  const mapped = folders.find((folder) => folder.id === folderId);
  if (!mapped) {
    throw notFound(`Parent attachment folder with id ${folderId} not found`);
  }
  return mapped;
}

export async function deleteParentAttachmentFolder(
  database: DbClient,
  owner: AttachmentOwner,
  folderId: number,
  expectedVersion: number,
  actor?: JournalActor | null
): Promise<void> {
  await ensureAttachmentOwnerExists(database, owner);
  const current = await requireFolder(database, owner, folderId);
  assertVersion(current.version, expectedVersion);
  const folders = await loadMappedFolders(database, owner);
  const mapped = folders.find((folder) => folder.id === folderId);
  if (!mapped) {
    throw notFound(`Parent attachment folder with id ${folderId} not found`);
  }
  if (mapped.childCount > 0 || mapped.directEntryCount > 0) {
    throw conflict("Nur leere Attachment-Ordner können gelöscht werden.");
  }
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  await database.transaction(async (tx) => {
    const deleted = await parentFileRepository.deleteFolder(tx, owner, folderId, expectedVersion);
    if (deleted === 0) {
      throw conflict("Der Attachment-Ordner wurde zwischenzeitlich geändert.");
    }
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: `Attachment-Ordner "${current.name}" wurde gelöscht.`,
      actor
    });
  });
}

export async function listParentDocumentLinks(database: DbClient, owner: AttachmentOwner): Promise<ParentDocumentLink[]> {
  await ensureAttachmentOwnerExists(database, owner);
  const records = await parentFileRepository.listDocumentLinks(database, owner);
  const documents = await listDocumentsByIds(database, records.map((record) => record.documentId));
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const folders = await loadMappedFolders(database, owner);
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  return records.flatMap((record) => {
    const document = documentById.get(record.documentId);
    if (!document) {
      return [];
    }
    return [mapDocumentLink(owner, record, document, record.folderId === null ? null : folderById.get(record.folderId) ?? null)];
  });
}

export async function createParentDocumentLink(
  database: DbClient,
  owner: AttachmentOwner,
  input: ParentDocumentLinkInput,
  actor?: JournalActor | null
): Promise<ParentDocumentLink> {
  await ensureAttachmentOwnerExists(database, owner);
  const document = await getDocument(database, input.documentId);
  const folderId = input.folderId ?? null;
  const folder = folderId === null ? null : await requireFolder(database, owner, folderId);
  if (await parentFileRepository.findDocumentLinkByDocument(database, owner, document.id)) {
    throw conflict("Dieses Dokument ist bereits mit dem Domänenobjekt verknüpft.");
  }
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  const documentObject = makeJournalObject("document", document.id, document.displayName ?? document.originalName);
  const record = await database.transaction(async (tx) => {
    const created = await parentFileRepository.createDocumentLink(tx, owner, document.id, folderId, actor?.actorUserId ?? undefined);
    await recordJournalEntry(tx, {
      operation: "link",
      object: documentObject,
      summary: `Dokument "${documentObject.label}" wurde mit ${ownerObject.label} verknüpft.`,
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
    return created;
  });
  const mappedFolder = folder === null ? null : (await loadMappedFolders(database, owner)).find((entry) => entry.id === folder.id) ?? null;
  return mapDocumentLink(owner, record, document, mappedFolder);
}

export async function moveParentAttachment(
  database: DbClient,
  owner: AttachmentOwner,
  attachmentId: number,
  input: ParentFileMoveInput,
  actor?: JournalActor | null
): Promise<Attachment> {
  await ensureAttachmentOwnerExists(database, owner);
  if (input.folderId !== null) {
    await requireFolder(database, owner, input.folderId);
  }
  const attachment = await attachmentRepository.findById(database, attachmentId);
  if (!attachment || attachment.kind !== "parent_attachment") {
    throw notFound(`Parent attachment with id ${attachmentId} not found`);
  }
  assertVersion(attachment.version, input.expectedVersion);
  const assignments = await parentFileRepository.listAttachmentFolderAssignments(database, owner);
  if (!assignments.some((assignment) => assignment.attachmentId === attachmentId)) {
    throw notFound(`Parent attachment with id ${attachmentId} not found`);
  }
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  await database.transaction(async (tx) => {
    if ((await parentFileRepository.setAttachmentFolder(tx, owner, attachmentId, input.folderId)) === 0) {
      throw conflict("Die Attachment-Zuordnung wurde zwischenzeitlich geändert.");
    }
    const updated = await attachmentRepository.bumpVersion(tx, attachmentId, input.expectedVersion, actor?.actorUserId ?? undefined);
    if (!updated) {
      throw conflict("Das Attachment wurde zwischenzeitlich geändert.");
    }
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: input.folderId === null
        ? `Attachment "${attachment.originalName}" wurde aus seinem Parent-Ordner entfernt.`
        : `Attachment "${attachment.originalName}" wurde in Parent-Ordner ${input.folderId} verschoben.`,
      actor
    });
  });
  const attachments = await listOwnerAttachments(database, owner);
  const updated = attachments.find((item) => item.id === attachmentId);
  if (!updated) {
    throw notFound(`Parent attachment with id ${attachmentId} not found`);
  }
  return updated;
}

export async function moveParentDocumentLink(
  database: DbClient,
  owner: AttachmentOwner,
  linkId: number,
  input: ParentFileMoveInput,
  actor?: JournalActor | null
): Promise<ParentDocumentLink> {
  await ensureAttachmentOwnerExists(database, owner);
  if (input.folderId !== null) {
    await requireFolder(database, owner, input.folderId);
  }
  const current = await parentFileRepository.findDocumentLink(database, owner, linkId);
  if (!current) {
    throw notFound(`Parent document link with id ${linkId} not found`);
  }
  assertVersion(current.version, input.expectedVersion);
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  await database.transaction(async (tx) => {
    const updated = await parentFileRepository.updateDocumentLinkFolder(tx, owner, linkId, input.expectedVersion, input.folderId, actor?.actorUserId ?? undefined);
    if (!updated) {
      throw conflict("Die Dokumentverknüpfung wurde zwischenzeitlich geändert.");
    }
    await recordJournalEntry(tx, {
      operation: "update",
      object: ownerObject,
      summary: input.folderId === null
        ? `Dokumentverknüpfung ${linkId} wurde aus ihrem Parent-Ordner entfernt.`
        : `Dokumentverknüpfung ${linkId} wurde in Parent-Ordner ${input.folderId} verschoben.`,
      actor
    });
  });
  const links = await listParentDocumentLinks(database, owner);
  const updated = links.find((link) => link.id === linkId);
  if (!updated) {
    throw notFound(`Parent document link with id ${linkId} not found`);
  }
  return updated;
}

export async function deleteParentDocumentLink(
  database: DbClient,
  owner: AttachmentOwner,
  linkId: number,
  expectedVersion: number,
  actor?: JournalActor | null
): Promise<void> {
  await ensureAttachmentOwnerExists(database, owner);
  const current = await parentFileRepository.findDocumentLink(database, owner, linkId);
  if (!current) {
    throw notFound(`Parent document link with id ${linkId} not found`);
  }
  assertVersion(current.version, expectedVersion);
  const document = await getDocument(database, current.documentId);
  const ownerObject = await getAttachmentOwnerJournalObject(database, owner);
  const documentObject = makeJournalObject("document", document.id, document.displayName ?? document.originalName);
  await database.transaction(async (tx) => {
    const deleted = await parentFileRepository.deleteDocumentLink(tx, owner, linkId, expectedVersion);
    if (deleted === 0) {
      throw conflict("Die Dokumentverknüpfung wurde zwischenzeitlich geändert.");
    }
    await recordJournalEntry(tx, {
      operation: "unlink",
      object: documentObject,
      summary: `Verknüpfung von Dokument "${documentObject.label}" zu ${ownerObject.label} wurde gelöst. Das DMS-Dokument bleibt bestehen.`,
      actor,
      contexts: [makeJournalContext(ownerObject, "owner")]
    });
  });
}
