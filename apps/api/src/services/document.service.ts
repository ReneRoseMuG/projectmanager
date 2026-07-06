import type { Attachment, AttachmentCategory, AttachmentFolder, AttachmentOwner, Paginated, Tag, TagDomain } from "@taskmanager/shared-types";
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
import { listAttachmentOwners, listAttachmentOwnersForIds } from "./attachments.service.js";

// MS-75 (DMS): Dokument-Sicht auf Anhänge — Bibliotheks-Abfrage, Metadaten und Labels.
// Anreicherung (owners/categories/tags/folders) erfolgt für die Bibliotheks-Liste
// GEBÜNDELT über alle Dokumente (je Relation eine inArray-Query), damit die Query-Zahl
// unabhängig von der Dokumentanzahl konstant bleibt. Die Filter für Typ/Suche/„Nicht
// einsortiert" werden nach dem Laden im Speicher angewandt (SQL-seitige Filterung ist ein
// Folgeschritt). Seitenbasierte Pagination liefert listDocumentLibraryPaginated (opt-in
// über den Query-Parameter `page`); listDocumentLibrary bleibt der Array-Alt-Pfad.

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
  const rows = await database
    .select({ id: tags.id, name: tags.name, color: tags.color, isSystem: tags.isSystem, domain: tags.domain, version: tags.version })
    .from(attachmentTags)
    .innerJoin(tags, eq(attachmentTags.tagId, tags.id))
    .where(eq(attachmentTags.attachmentId, attachmentId))
    .orderBy(tags.name);
  return rows.map((row) => ({ ...row, domain: row.domain as TagDomain }));
}

async function loadFolders(database: DbClient, attachmentId: number): Promise<AttachmentFolder[]> {
  return database
    .select({ id: attachmentFolders.id, parentId: attachmentFolders.parentId, projectId: attachmentFolders.projectId, name: attachmentFolders.name, version: attachmentFolders.version })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(eq(folderAttachments.attachmentId, attachmentId))
    .orderBy(attachmentFolders.name);
}

// Gebündelte Batch-Loader für die Bibliotheks-Liste: je Relation EINE Query über alle
// Attachment-IDs; Ergebnis als Map<attachmentId, X[]> zur In-Memory-Zuordnung.
async function loadCategoriesForIds(database: DbClient, attachmentIds: number[]): Promise<Map<number, AttachmentCategory[]>> {
  const result = new Map<number, AttachmentCategory[]>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const rows = await database
    .select({ attachmentId: attachmentCategoryLinks.attachmentId, id: attachmentCategories.id, name: attachmentCategories.name, color: attachmentCategories.color, version: attachmentCategories.version })
    .from(attachmentCategoryLinks)
    .innerJoin(attachmentCategories, eq(attachmentCategoryLinks.categoryId, attachmentCategories.id))
    .where(inArray(attachmentCategoryLinks.attachmentId, attachmentIds))
    .orderBy(attachmentCategories.name);
  for (const { attachmentId, ...category } of rows) {
    const existing = result.get(attachmentId);
    if (existing) {
      existing.push(category);
    } else {
      result.set(attachmentId, [category]);
    }
  }
  return result;
}

async function loadTagsForIds(database: DbClient, attachmentIds: number[]): Promise<Map<number, Tag[]>> {
  const result = new Map<number, Tag[]>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const rows = await database
    .select({ attachmentId: attachmentTags.attachmentId, id: tags.id, name: tags.name, color: tags.color, isSystem: tags.isSystem, domain: tags.domain, version: tags.version })
    .from(attachmentTags)
    .innerJoin(tags, eq(attachmentTags.tagId, tags.id))
    .where(inArray(attachmentTags.attachmentId, attachmentIds))
    .orderBy(tags.name);
  for (const { attachmentId, ...tag } of rows) {
    const typedTag: Tag = { ...tag, domain: tag.domain as TagDomain };
    const existing = result.get(attachmentId);
    if (existing) {
      existing.push(typedTag);
    } else {
      result.set(attachmentId, [typedTag]);
    }
  }
  return result;
}

async function loadFoldersForIds(database: DbClient, attachmentIds: number[]): Promise<Map<number, AttachmentFolder[]>> {
  const result = new Map<number, AttachmentFolder[]>();
  if (attachmentIds.length === 0) {
    return result;
  }
  const rows = await database
    .select({ attachmentId: folderAttachments.attachmentId, id: attachmentFolders.id, parentId: attachmentFolders.parentId, projectId: attachmentFolders.projectId, name: attachmentFolders.name, version: attachmentFolders.version })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(inArray(folderAttachments.attachmentId, attachmentIds))
    .orderBy(attachmentFolders.name);
  for (const { attachmentId, ...folder } of rows) {
    const existing = result.get(attachmentId);
    if (existing) {
      existing.push(folder);
    } else {
      result.set(attachmentId, [folder]);
    }
  }
  return result;
}

// Baut das Attachment-DTO synchron aus bereits geladenen Teilen (kein DB-Zugriff).
function buildDocument(
  record: AttachmentRecord,
  owners: AttachmentOwner[],
  categories: AttachmentCategory[],
  documentTags: Tag[],
  folders: AttachmentFolder[]
): Attachment {
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

// Einzelabruf-Variante (getDocument/Metadaten/Labels): fixer Fan-out für EIN Dokument.
async function mapDocument(database: DbClient, record: AttachmentRecord): Promise<Attachment> {
  const [owners, categories, documentTags, folders] = await Promise.all([
    listAttachmentOwners(database, record.id),
    loadCategories(database, record.id),
    loadTags(database, record.id),
    loadFolders(database, record.id)
  ]);
  return buildDocument(record, owners, categories, documentTags, folders);
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

  // Anreicherung GEBÜNDELT: konstant 4 Queries (owners + categories + tags + folders)
  // über alle Dokument-IDs — unabhängig von der Anzahl der Dokumente. Vorher: N×9 Queries,
  // die bei wenigen Dutzend Dokumenten den Pool (limit 10 / queue 50) sprengten.
  const ids = records.map((record) => record.id);
  const [ownersMap, categoriesMap, tagsMap, foldersMap] = await Promise.all([
    listAttachmentOwnersForIds(database, ids),
    loadCategoriesForIds(database, ids),
    loadTagsForIds(database, ids),
    loadFoldersForIds(database, ids)
  ]);
  let documents = records.map((record) =>
    buildDocument(
      record,
      ownersMap.get(record.id) ?? [],
      categoriesMap.get(record.id) ?? [],
      tagsMap.get(record.id) ?? [],
      foldersMap.get(record.id) ?? []
    )
  );

  return applyLibraryFilters(documents, filter);
}

// Wendet die In-Memory-Filter (unsorted/category/tag/type/q) auf bereits angereicherte
// Dokumente an. Geteilt zwischen Array- und paginiertem Pfad, damit die Filter-Semantik
// GARANTIERT identisch bleibt. `folder` als Zahl wird bereits SQL-seitig aufgelöst.
function applyLibraryFilters(documents: Attachment[], filter: DocumentLibraryFilter): Attachment[] {
  let result = documents;
  if (filter.folder === "unsorted") {
    // „Nicht einsortiert" = in keiner Sammlung. Eine Fachobjekt-Bindung (owners) zählt
    // bewusst NICHT als einsortiert, sonst blieben alle als Anhang entstandenen Dokumente
    // hier unsichtbar (sie haben fast immer einen Owner).
    result = result.filter((document) => (document.folders?.length ?? 0) === 0);
  }
  if (filter.category !== undefined) {
    result = result.filter((document) => (document.categories ?? []).some((category) => category.id === filter.category));
  }
  if (filter.tag !== undefined) {
    result = result.filter((document) => (document.tags ?? []).some((tag) => tag.id === filter.tag));
  }
  if (filter.type) {
    const type = filter.type.toLowerCase();
    result = result.filter((document) => document.mimetype.toLowerCase().startsWith(type));
  }
  if (filter.q) {
    const q = filter.q.toLowerCase();
    result = result.filter(
      (document) => document.originalName.toLowerCase().includes(q) || (document.displayName ?? "").toLowerCase().includes(q)
    );
  }
  return result;
}

// Seitenbasierte Variante der Bibliotheks-Abfrage (MS-75 Pagination-Referenz).
// Ablauf: (1) Kandidaten-Records laden (folder-by-number SQL-seitig wie im Alt-Pfad).
// (2) Für die filterrelevanten Relationen (owners/folders/categories/tags) über ALLE
// Kandidaten je EINE gebündelte Query — nötig, weil unsorted/category/tag nur mit diesen
// Relationen entschieden werden können und `total` VOR der Pagination korrekt sein muss.
// (3) Filter anwenden → `total` = gefilterte Länge. (4) Nur die Seite zuschneiden; die
// finale DTO-Anreicherung erfolgt so ohnehin für alle Kandidaten (Relationen sind bereits
// geladen), aber der teure Fan-out bleibt auf die 4 Batch-Queries begrenzt — unabhängig
// von der Dokumentanzahl, exakt wie im Array-Pfad.
export async function listDocumentLibraryPaginated(
  database: DbClient,
  filter: DocumentLibraryFilter,
  page: number,
  pageSize: number
): Promise<Paginated<Attachment>> {
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

  const ids = records.map((record) => record.id);
  const [ownersMap, categoriesMap, tagsMap, foldersMap] = await Promise.all([
    listAttachmentOwnersForIds(database, ids),
    loadCategoriesForIds(database, ids),
    loadTagsForIds(database, ids),
    loadFoldersForIds(database, ids)
  ]);
  const enriched = records.map((record) =>
    buildDocument(
      record,
      ownersMap.get(record.id) ?? [],
      categoriesMap.get(record.id) ?? [],
      tagsMap.get(record.id) ?? [],
      foldersMap.get(record.id) ?? []
    )
  );

  const filtered = applyLibraryFilters(enriched, filter);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);
  return { data, total, page, pageSize };
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
