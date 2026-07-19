import type { Attachment, AttachmentFolder, AttachmentOwner, Paginated, Tag, TagDomain } from "@taskmanager/shared-types";
import { and, desc, eq, exists, inArray, like, notExists, or, sql, type SQL } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import {
  attachmentFolders,
  attachmentTags,
  attachments,
  folderAttachments,
  tags
} from "../db/schema.js";
import { attachmentRepository, type AttachmentRecord } from "../repositories/attachment.repository.js";
import { assertVersion } from "../repositories/base.repository.js";
import { tagRepository } from "../repositories/tag.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";
import { listAttachmentOwners, listAttachmentOwnersForIds } from "./attachments.service.js";
import { listFolderAndDescendantIds } from "./attachment-folder.service.js";
import {
  buildJournalChanges,
  buildUpdateSummary,
  makeJournalObject,
  recordJournalEntry,
  type JournalActor
} from "./journal.service.js";

// DMS-Bibliothek: Sichtbarkeit, Suche und sämtliche Organisationsfilter werden vor
// COUNT/LIMIT/OFFSET in SQL ausgewertet. Nur die IDs der angeforderten Seite werden danach
// gebündelt um Owner, Tags und die direkte Sammlung ergänzt.

export interface DocumentLibraryFilter {
  folder?: number | "unsorted";
  tags?: number[];
  type?: string;
  q?: string;
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
    .select({ id: attachmentFolders.id, parentId: attachmentFolders.parentId, projectId: attachmentFolders.projectId, name: attachmentFolders.name, childCount: sql<number>`0`, directDocumentCount: sql<number>`0`, version: attachmentFolders.version })
    .from(folderAttachments)
    .innerJoin(attachmentFolders, eq(folderAttachments.folderId, attachmentFolders.id))
    .where(eq(folderAttachments.attachmentId, attachmentId))
    .orderBy(attachmentFolders.name);
}

// Gebündelte Batch-Loader für die Bibliotheks-Liste: je Relation EINE Query über alle
// Attachment-IDs; Ergebnis als Map<attachmentId, X[]> zur In-Memory-Zuordnung.
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
    .select({ attachmentId: folderAttachments.attachmentId, id: attachmentFolders.id, parentId: attachmentFolders.parentId, projectId: attachmentFolders.projectId, name: attachmentFolders.name, childCount: sql<number>`0`, directDocumentCount: sql<number>`0`, version: attachmentFolders.version })
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
    url: `/api/attachments/${record.id}/content`,
    contentHash: record.contentHash,
    isInDocumentLibrary: record.isInDocumentLibrary,
    tags: documentTags,
    folder: folders[0] ?? null,
    folders,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version
  };
}

// Einzelabruf-Variante (getDocument/Metadaten/Labels): fixer Fan-out für EIN Dokument.
async function mapDocument(database: DbClient, record: AttachmentRecord): Promise<Attachment> {
  const [owners, documentTags, folders] = await Promise.all([
    listAttachmentOwners(database, record.id),
    loadTags(database, record.id),
    loadFolders(database, record.id)
  ]);
  return buildDocument(record, owners, documentTags, folders);
}

export async function getDocument(database: DbClient, id: number): Promise<Attachment> {
  const record = await attachmentRepository.findById(database, id);
  if (!record || !record.isInDocumentLibrary) {
    throw notFound(`Attachment with id ${id} not found`);
  }
  return mapDocument(database, record);
}

const supportedDocumentTypes = new Set(["image/", "application/pdf", "text/", "video/", "audio/"]);

async function buildDocumentLibraryWhere(database: DbClient, filter: DocumentLibraryFilter): Promise<SQL> {
  const conditions: SQL[] = [eq(attachments.isInDocumentLibrary, true)];

  if (typeof filter.folder === "number") {
    const folderIds = await listFolderAndDescendantIds(database, filter.folder);
    const folderMatch = database
      .select({ value: sql<number>`1` })
      .from(folderAttachments)
      .where(and(
        eq(folderAttachments.attachmentId, attachments.id),
        inArray(folderAttachments.folderId, folderIds)
      ));
    conditions.push(exists(folderMatch));
  } else if (filter.folder === "unsorted") {
    const anyFolder = database
      .select({ value: sql<number>`1` })
      .from(folderAttachments)
      .where(eq(folderAttachments.attachmentId, attachments.id));
    conditions.push(notExists(anyFolder));
  }

  const tagIds = [...new Set(filter.tags ?? [])];
  if (tagIds.length > 20) {
    throw badRequest("Höchstens 20 Tags können gleichzeitig gefiltert werden.");
  }
  if (tagIds.length > 0) {
    const selectedTags = await tagRepository.findByIds(database, tagIds);
    if (selectedTags.length !== tagIds.length || selectedTags.some((tag) => tag.domain !== "dms")) {
      throw badRequest("Ein oder mehrere DMS-Tag-Filter sind ungültig.");
    }
    for (const tagId of tagIds) {
      const tagMatch = database
        .select({ value: sql<number>`1` })
        .from(attachmentTags)
        .where(and(
          eq(attachmentTags.attachmentId, attachments.id),
          eq(attachmentTags.tagId, tagId)
        ));
      conditions.push(exists(tagMatch));
    }
  }

  if (filter.type) {
    if (!supportedDocumentTypes.has(filter.type)) {
      throw badRequest("Der Dokumenttyp-Filter ist ungültig.");
    }
    conditions.push(like(attachments.mimetype, `${filter.type}%`));
  }

  const search = filter.q?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      like(attachments.originalName, pattern),
      like(attachments.displayName, pattern),
      like(attachments.description, pattern)
    ) as SQL);
  }

  return and(...conditions) as SQL;
}

async function enrichDocuments(database: DbClient, records: AttachmentRecord[]): Promise<Attachment[]> {
  const ids = records.map((record) => record.id);
  const ownersMap = await listAttachmentOwnersForIds(database, ids);
  const [tagsMap, foldersMap] = await Promise.all([
    loadTagsForIds(database, ids),
    loadFoldersForIds(database, ids)
  ]);
  return records.map((record) =>
    buildDocument(
      record,
      ownersMap.get(record.id) ?? [],
      tagsMap.get(record.id) ?? [],
      foldersMap.get(record.id) ?? []
    )
  );
}

export async function listDocumentLibrary(database: DbClient, filter: DocumentLibraryFilter): Promise<Attachment[]> {
  const where = await buildDocumentLibraryWhere(database, filter);
  const records = await database
    .select()
    .from(attachments)
    .where(where)
    .orderBy(desc(attachments.createdAt), desc(attachments.id));

  // The unpaginated compatibility path filters in SQL and enriches all matches in batches.
  // The web client exclusively uses the paginated path.
  return enrichDocuments(database, records);
}

// The same SQL WHERE clause determines COUNT(*) and the stable page. Only page IDs are
// enriched afterwards using a constant number of batch queries.
export async function listDocumentLibraryPaginated(
  database: DbClient,
  filter: DocumentLibraryFilter,
  page: number,
  pageSize: number
): Promise<Paginated<Attachment>> {
  const where = await buildDocumentLibraryWhere(database, filter);
  const countRow = firstRow(
    await database.select({ count: sql<number>`count(*)` }).from(attachments).where(where)
  );
  const total = Number(countRow?.count ?? 0);
  const records = await database
    .select()
    .from(attachments)
    .where(where)
    .orderBy(desc(attachments.createdAt), desc(attachments.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const data = await enrichDocuments(database, records);
  return { data, total, page, pageSize };
}

export async function updateDocumentMetadata(
  database: DbClient,
  id: number,
  input: { displayName?: string | null; description?: string | null; expectedVersion: number },
  actor?: JournalActor | null
): Promise<Attachment> {
  const current = await attachmentRepository.findById(database, id);
  if (!current || !current.isInDocumentLibrary) {
    throw notFound(`Attachment with id ${id} not found in document library`);
  }
  assertVersion(current.version, input.expectedVersion);
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
  const updated = await database.transaction(async (tx) => {
    const next = await attachmentRepository.updateMetadata(tx, id, input.expectedVersion, data, actor?.actorUserId ?? undefined);
    if (!next) {
      throw conflict("Das Dokument wurde zwischenzeitlich geändert.");
    }
    const journalObject = makeJournalObject("attachment", current.id, current.originalName);
    const changes = buildJournalChanges(current, next, [
      { key: "displayName", label: "Anzeigename" },
      { key: "description", label: "Beschreibung" }
    ]);
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: buildUpdateSummary(journalObject, changes),
      changes,
      actor
    });
    return next;
  });
  return mapDocument(database, updated);
}

// Labels an einem Dokument setzen. Geschützte System-Labels (tags.is_system) sind über
// die generische Label-Funktion nicht setz- oder entfernbar (UC 16/04): bestehende
// System-Zuordnungen bleiben erhalten, System-Tags in der Eingabe werden abgelehnt.
export async function setDocumentTags(
  database: DbClient,
  attachmentId: number,
  tagIds: number[],
  expectedVersion: number,
  actor?: JournalActor | null
): Promise<Attachment> {
  const record = await attachmentRepository.findById(database, attachmentId);
  if (!record || !record.isInDocumentLibrary) {
    throw notFound(`Attachment with id ${attachmentId} not found in document library`);
  }
  assertVersion(record.version, expectedVersion);
  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length > 20) {
    throw badRequest("Höchstens 20 DMS-Tags können einem Dokument zugeordnet werden.");
  }
  if (uniqueIds.length > 0) {
    const requested = await tagRepository.findByIds(database, uniqueIds);
    if (requested.length !== uniqueIds.length) {
      throw badRequest("Ein oder mehrere Tag-IDs sind ungültig.");
    }
    if (requested.some((tag) => tag.isSystem)) {
      throw badRequest("Geschützte System-Labels können nicht über die Label-Funktion gesetzt werden.");
    }
    if (requested.some((tag) => tag.domain !== "dms")) {
      throw badRequest("Dokumenten können ausschließlich Tags der Domäne 'dms' zugeordnet werden.");
    }
  }

  const updated = await database.transaction(async (tx) => {
    const currentLinks = await tx
      .select({ tagId: attachmentTags.tagId, name: tags.name, isSystem: tags.isSystem })
      .from(attachmentTags)
      .innerJoin(tags, eq(attachmentTags.tagId, tags.id))
      .where(eq(attachmentTags.attachmentId, attachmentId));
    const nonSystemTagIds = currentLinks.filter((link) => !link.isSystem).map((link) => link.tagId);
    const normalizedCurrentIds = [...nonSystemTagIds].sort((left, right) => left - right);
    const normalizedNextIds = [...uniqueIds].sort((left, right) => left - right);
    if (JSON.stringify(normalizedCurrentIds) === JSON.stringify(normalizedNextIds)) {
      return record;
    }
    if (nonSystemTagIds.length > 0) {
      await tx.delete(attachmentTags).where(and(eq(attachmentTags.attachmentId, attachmentId), inArray(attachmentTags.tagId, nonSystemTagIds)));
    }
    if (uniqueIds.length > 0) {
      await tx.insert(attachmentTags).ignore().values(uniqueIds.map((tagId) => ({ attachmentId, tagId })));
    }
    const next = await attachmentRepository.bumpVersion(tx, attachmentId, expectedVersion, actor?.actorUserId ?? undefined);
    if (!next) {
      throw conflict("Das Dokument wurde zwischenzeitlich geändert.");
    }
    const nextTags = uniqueIds.length > 0 ? await tagRepository.findByIds(tx, uniqueIds) : [];
    const oldNames = currentLinks.map((link) => link.name).sort((left, right) => left.localeCompare(right, "de"));
    const newNames = [
      ...currentLinks.filter((link) => link.isSystem).map((link) => link.name),
      ...nextTags.map((tag) => tag.name)
    ].sort((left, right) => left.localeCompare(right, "de"));
    const journalObject = makeJournalObject("attachment", record.id, record.originalName);
    const changes = buildJournalChanges(
      { tags: oldNames },
      { tags: newNames },
      [{ key: "tags", label: "Tags", format: (value) => (value as string[]).join(", ") || null }]
    );
    await recordJournalEntry(tx, {
      operation: "update",
      object: journalObject,
      summary: `${journalObject.label} erhielt eine neue Tag-Zuordnung: ${oldNames.join(", ") || "keine"} → ${newNames.join(", ") || "keine"}.`,
      changes,
      actor
    });
    return next;
  });

  return mapDocument(database, updated);
}
