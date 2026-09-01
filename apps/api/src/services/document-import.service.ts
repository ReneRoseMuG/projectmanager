import type { Attachment } from "@taskmanager/shared-types";
import type { DbClient } from "../db/client.js";
import { attachmentFolderRepository } from "../repositories/attachment-folder.repository.js";
import { tagRepository } from "../repositories/tag.repository.js";
import { badRequest, notFound } from "../utils/errors.js";
import { createUnboundAttachment, type AttachmentUpload } from "./attachments.service.js";
import { setAttachmentFolder } from "./attachment-folder.service.js";
import { getDocument, setDocumentTags } from "./document.service.js";
import type { JournalActor } from "./journal.service.js";

export interface DocumentImportAssignments {
  folderId?: number | null;
  tagIds?: number[];
}

interface ValidatedAssignments {
  folderId: number | null;
  tagIds: number[];
}

async function validateAssignments(database: DbClient, assignments: DocumentImportAssignments): Promise<ValidatedAssignments> {
  const folderId = assignments.folderId ?? null;
  if (folderId !== null && !(await attachmentFolderRepository.findById(database, folderId))) {
    throw notFound(`Sammlung mit ID ${folderId} wurde nicht gefunden.`);
  }

  const tagIds = [...new Set(assignments.tagIds ?? [])];
  if (tagIds.length > 20) {
    throw badRequest("Höchstens 20 DMS-Tags können beim Import zugeordnet werden.");
  }
  if (tagIds.length === 0) {
    return { folderId, tagIds };
  }

  const tags = await tagRepository.findByIds(database, tagIds);
  if (tags.length !== tagIds.length) {
    throw badRequest("Ein oder mehrere DMS-Tags wurden nicht gefunden.");
  }
  if (tags.some((tag) => tag.domain !== "dms")) {
    throw badRequest("Für Dokumentimporte sind ausschließlich Tags der Domäne 'dms' zulässig.");
  }
  if (tags.some((tag) => tag.isSystem)) {
    throw badRequest("Geschützte System-Tags können nicht über den Dokumentimport gesetzt werden.");
  }
  return { folderId, tagIds };
}

export async function importDocument(
  database: DbClient,
  upload: AttachmentUpload,
  assignments: DocumentImportAssignments,
  actor?: JournalActor | null
): Promise<Attachment> {
  const validated = await validateAssignments(database, assignments);
  const document = await createUnboundAttachment(database, upload, actor);
  let currentVersion = document.version;

  if (validated.folderId !== null) {
    currentVersion = await setAttachmentFolder(
      database,
      document.id,
      { folderId: validated.folderId, expectedVersion: document.version },
      actor
    );
  }
  if (validated.tagIds.length > 0) {
    await setDocumentTags(database, document.id, validated.tagIds, currentVersion, actor);
  }
  return getDocument(database, document.id);
}
