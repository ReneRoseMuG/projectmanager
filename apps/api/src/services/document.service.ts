import type { Attachment, AttachmentCategory, AttachmentFolder, Tag } from "@taskmanager/shared-types";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import {
  attachmentCategories,
  attachmentCategoryLinks,
  attachmentFolders,
  attachmentTags,
  attachments,
  folderAttachments,
  tags
} from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { tagRepository } from "../repositories/tag.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { listAttachmentOwners } from "./attachments.service.js";

// MS-75 (DMS): Dokument-Sicht auf Anhänge — Bibliotheks-Abfrage, Metadaten und Labels.
// Anreicherung (owners/categories/tags/folders) erfolgt je Dokument; die Filter für
// Typ/Suche/„Nicht einsortiert" werden nach dem Laden angewandt. Für sehr große
// Bestände ist eine reine SQL-Filterung ein Folgeschritt.

export interface DocumentLibraryFilter {
  folder?: number | "unsorted";
  category?: number;
  tag?: number;
  type?: string;
  q?: string;
}

async function loadCategories(database: DbClient, attachmentId: number): Promise<AttachmentCategory[]> {
  return database
    .select({ id: attachmentCategories.id, name: attachmentCategories.name, color: attachmentCategories.color, version: attachmentCategories.version })
    .from(attachmentCategoryLinks)
    .innerJoin(attachmentCategories, eq(attachmentCategoryLinks.categoryId, attachmentCategories.id))
    .where(eq(attachmentCategoryLinks.attachmentId, attachmentId))
    .orderBy(attachmentCategories.name);
}

async function loadTags(database: DbClient, attachmentId: number): Promise<Tag[]> {
  return database
    .select({ id: tags.id, name: tags.name, color: tags.color, isSystem: tags.isSystem, version: tags.version })
    .from(attachmentTags)
    .innerJoin(tags, eq(attachmentTags.tagId, tags.id))
    .where(eq(attachmentTags.attachmentId, attachmentId))
    .orderBy(tags.name);
}

async function loadFolders(database: DbClient, attachmentId: number): Promise<AttachmentFolder[]> {
  return database
    .select({ id: attachmentFolders.id, parentId: attachmentFolders.parentId, projectId: attachmentFolders.projectId, name: attachmentFolders.name, version: attachmentFolders.version })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(eq(folderAttachments.attachmentId, attachmentId))
    .orderBy(attachmentFolders.name);
}

async function mapDocument(database: DbClient, record: AttachmentRecord): Promise<Attachment> {
  const [owners, categories, documentTags, folders] = await Promise.all([
    listAttachmentOwners(database, record.id),
    loadCategories(database, record.id),
    loadTags(database, record.id),
    loadFolders(database, record.id)
  ]);
  return {
    id: record.id,
    owners,
    originalName: record.originalName,
    displayName: record.displayName,
    description: record.description,
    filename: record.filename,
    mimetype: record.mimetype,
    size: record.size,
    url: `/uploads/${record.filename}`,
    categories,
    tags: documentTags,
    folders,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
}

export async function getDocument(database: DbClient, id: number): Promise<Attachment> {
  const record = await attachmentRepository.findById(database, id);
  if (!record) {
    throw notFound(`Attachment with id ${id} not found`);
  }
  return mapDocument(database, record);
}

export async function listDocumentLibrary(database: DbClient, filter: DocumentLibraryFilter): Promise<Attachment[]> {
  let records: AttachmentRecord[];
  if (typeof filter.folder === "number") {
    const rows = await database
      .select({ record: attachments })
      .from(folderAttachments)
      .innerJoin(attachments, eq(folderAttachments.attachmentId, attachments.id))
      .where(eq(folderAttachments.folderId, filter.folder))
      .orderBy(desc(attachments.createdAt));
    records = rows.map((row) => row.record);
  } else {
    records = await database.select().from(attachments).orderBy(desc(attachments.createdAt));
  }

  let documents = await Promise.all(records.map((record) => mapDocument(database, record)));

  if (filter.folder === "unsorted") {
    documents = documents.filter((document) => document.owners.length === 0 && (document.folders?.length ?? 0) === 0);
  }
  if (filter.category !== undefined) {
    documents = documents.filter((document) => (document.categories ?? []).some((category) => category.id === filter.category));
  }
  if (filter.tag !== undefined) {
    documents = documents.filter((document) => (document.tags ?? []).some((tag) => tag.id === filter.tag));
  }
  if (filter.type) {
    const type = filter.type.toLowerCase();
    documents = documents.filter((document) => document.mimetype.toLowerCase().startsWith(type));
  }
  if (filter.q) {
    const q = filter.q.toLowerCase();
    documents = documents.filter(
      (document) => document.originalName.toLowerCase().includes(q) || (document.displayName ?? "").toLowerCase().includes(q)
    );
  }
  return documents;
}

export async function updateDocumentMetadata(
  database: DbClient,
  id: number,
  input: { displayName?: string | null; description?: string | null; expectedVersion: number },
  userId?: number
): Promise<Attachment> {
  const data: { displayName?: string | null; description?: string | null } = {};
  if (input.displayName !== undefined) {
    const trimmed = input.displayName?.trim();
    data.displayName = trimmed && trimmed.length > 0 ? trimmed : null;
  }
  if (input.description !== undefined) {
    const trimmed = input.description?.trim();
    data.description = trimmed && trimmed.length > 0 ? trimmed : null;
  }
  if (Object.keys(data).length === 0) {
    throw badRequest("Es wurden keine Änderungen übergeben.");
  }
  const updated = await attachmentRepository.updateMetadata(database, id, input.expectedVersion, data, userId);
  if (!updated) {
    throw notFound(`Attachment with id ${id} not found`);
  }
  return mapDocument(database, updated);
}

// Labels an einem Dokument setzen. Geschützte System-Labels (tags.is_system) sind über
// die generische Label-Funktion nicht setz- oder entfernbar (UC 16/04): bestehende
// System-Zuordnungen bleiben erhalten, System-Tags in der Eingabe werden abgelehnt.
export async function setDocumentTags(database: DbClient, attachmentId: number, tagIds: number[]): Promise<Attachment> {
  const record = await attachmentRepository.findById(database, attachmentId);
  if (!record) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length > 0) {
    const requested = await tagRepository.findByIds(database, uniqueIds);
    if (requested.length !== uniqueIds.length) {
      throw badRequest("Ein oder mehrere Tag-IDs sind ungültig.");
    }
    if (requested.some((tag) => tag.isSystem)) {
      throw badRequest("Geschützte System-Labels können nicht über die Label-Funktion gesetzt werden.");
    }
  }

  await database.transaction(async (tx) => {
    const currentLinks = await tx
      .select({ tagId: attachmentTags.tagId, isSystem: tags.isSystem })
      .from(attachmentTags)
      .innerJoin(tags, eq(attachmentTags.tagId, tags.id))
      .where(eq(attachmentTags.attachmentId, attachmentId));
    const nonSystemTagIds = currentLinks.filter((link) => !link.isSystem).map((link) => link.tagId);
    if (nonSystemTagIds.length > 0) {
      await tx.delete(attachmentTags).where(and(eq(attachmentTags.attachmentId, attachmentId), inArray(attachmentTags.tagId, nonSystemTagIds)));
    }
    if (uniqueIds.length > 0) {
      await tx.insert(attachmentTags).ignore().values(uniqueIds.map((tagId) => ({ attachmentId, tagId })));
    }
  });

  return mapDocument(database, record);
}
