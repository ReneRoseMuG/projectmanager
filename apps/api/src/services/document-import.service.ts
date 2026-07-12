import type { Attachment } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { attachmentCategoryLinks, attachmentTags, folderAttachments } from "../db/schema.js";
import { attachmentCategoryRepository } from "../repositories/attachment-category.repository.js";
import { attachmentFolderRepository } from "../repositories/attachment-folder.repository.js";
import { tagRepository } from "../repositories/tag.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { createUnboundAttachment, type AttachmentUpload } from "./attachments.service.js";
import { getDocument } from "./document.service.js";
import type { JournalActor } from "./journal.service.js";

export interface DocumentImportAssignments {
  folderIds?: number[];
  categoryIds?: number[];
  tagIds?: number[];
}

interface ValidatedAssignments {
  folderIds: number[];
  categoryIds: number[];
  tagIds: number[];
}

async function validateAssignments(database: DbClient, assignments: DocumentImportAssignments): Promise<ValidatedAssignments> {
  const folderIds = [...new Set(assignments.folderIds ?? [])];
  if (folderIds.length > 0) {
    const folders = await attachmentFolderRepository.findByIds(database, folderIds);
    if (folders.length !== folderIds.length) {
      throw notFound("Eine oder mehrere Sammlungen wurden nicht gefunden.");
    }
  }

  const categoryIds = [...new Set(assignments.categoryIds ?? [])];
  if (categoryIds.length > 0) {
    const categories = await attachmentCategoryRepository.findByIds(database, categoryIds);
    if (categories.length !== categoryIds.length) {
      throw notFound("Eine oder mehrere Kategorien wurden nicht gefunden.");
    }
  }

  const tagIds = [...new Set(assignments.tagIds ?? [])];
  if (tagIds.length === 0) {
    return { folderIds, categoryIds, tagIds };
  }

  const requestedTags = await tagRepository.findByIds(database, tagIds);
  if (requestedTags.length !== tagIds.length) {
    throw badRequest("Ein oder mehrere Tag-IDs sind ungültig.");
  }
  if (requestedTags.some((tag) => tag.domain !== "dms")) {
    throw badRequest("Für Dokumentimporte sind nur DMS-Tags zulässig.");
  }
  if (requestedTags.some((tag) => tag.isSystem)) {
    throw badRequest("Geschützte System-Labels können nicht über den Dokumentimport gesetzt werden.");
  }
  return { folderIds, categoryIds, tagIds };
}

export async function importDocument(
  database: DbClient,
  upload: AttachmentUpload,
  assignments: DocumentImportAssignments,
  actor?: JournalActor | null
): Promise<Attachment> {
  const validated = await validateAssignments(database, assignments);
  const document = await createUnboundAttachment(database, upload, actor);

  await database.transaction(async (tx) => {
    if (validated.folderIds.length > 0) {
      await tx.insert(folderAttachments).ignore().values(validated.folderIds.map((folderId) => ({ folderId, attachmentId: document.id })));
    }
    if (validated.categoryIds.length > 0) {
      await tx.insert(attachmentCategoryLinks).ignore().values(validated.categoryIds.map((categoryId) => ({ categoryId, attachmentId: document.id })));
    }
    if (validated.tagIds.length > 0) {
      await tx.insert(attachmentTags).ignore().values(validated.tagIds.map((tagId) => ({ tagId, attachmentId: document.id })));
    }
  });
  return getDocument(database, document.id);
}
