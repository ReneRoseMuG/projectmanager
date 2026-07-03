import type { AttachmentCategory } from "@taskmanager/shared-types";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { attachmentCategoryLinks } from "../db/schema.js";
import { attachmentCategoryRepository, type AttachmentCategoryRecord } from "../repositories/attachment-category.repository.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";
import { badRequest, conflict, notFound } from "../utils/errors.js";

// MS-75 (DMS): Kategorien sind ein dokumenteigenes Sachklassifikations-Vokabular.
// Journaling der Kategorie-Entität ist bewusst noch nicht angebunden (bräuchte einen
// neuen Journal-Objekttyp inkl. Migration) — Folgeschritt.

function mapCategory(record: AttachmentCategoryRecord): AttachmentCategory {
  return { id: record.id, name: record.name, color: record.color, version: record.version };
}

function cleanName(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw badRequest("Ein Kategoriename ist erforderlich.");
  }
  return trimmed;
}

async function ensureAttachmentExists(database: DbClient, attachmentId: number): Promise<void> {
  const attachment = await attachmentRepository.findById(database, attachmentId);
  if (!attachment) {
    throw notFound(`Attachment with id ${attachmentId} not found`);
  }
}

async function ensureCategoryExists(database: DbClient, categoryId: number): Promise<AttachmentCategoryRecord> {
  const category = await attachmentCategoryRepository.findById(database, categoryId);
  if (!category) {
    throw notFound(`Attachment category with id ${categoryId} not found`);
  }
  return category;
}

export async function listAttachmentCategories(database: DbClient): Promise<AttachmentCategory[]> {
  const rows = await attachmentCategoryRepository.findAll(database);
  return rows.map(mapCategory);
}

export async function createAttachmentCategory(
  database: DbClient,
  input: { name?: string; color?: string },
  userId?: number
): Promise<AttachmentCategory> {
  const name = cleanName(input.name);
  const existing = await attachmentCategoryRepository.findByName(database, name);
  if (existing) {
    throw conflict(`Eine Kategorie mit dem Namen "${name}" existiert bereits.`);
  }
  const created = await attachmentCategoryRepository.create(database, { name, color: input.color ?? "#94a3b8" }, userId);
  return mapCategory(created);
}

export async function updateAttachmentCategory(
  database: DbClient,
  id: number,
  input: { name?: string; color?: string; expectedVersion: number },
  userId?: number
): Promise<AttachmentCategory> {
  const current = await ensureCategoryExists(database, id);
  const data: { name?: string; color?: string } = {};
  if (input.name !== undefined) {
    const name = cleanName(input.name);
    if (name !== current.name) {
      const duplicate = await attachmentCategoryRepository.findByName(database, name);
      if (duplicate && duplicate.id !== id) {
        throw conflict(`Eine Kategorie mit dem Namen "${name}" existiert bereits.`);
      }
    }
    data.name = name;
  }
  if (input.color !== undefined) {
    data.color = input.color;
  }
  if (Object.keys(data).length === 0) {
    throw badRequest("Es wurden keine Änderungen übergeben.");
  }
  const updated = await attachmentCategoryRepository.update(database, id, input.expectedVersion, data, userId);
  if (!updated) {
    throw notFound(`Attachment category with id ${id} not found`);
  }
  return mapCategory(updated);
}

export async function deleteAttachmentCategory(database: DbClient, id: number): Promise<void> {
  const affected = await attachmentCategoryRepository.delete(database, id);
  if (affected === 0) {
    throw notFound(`Attachment category with id ${id} not found`);
  }
  // Zuordnungen in attachment_category_links werden per FK-Cascade entfernt; Dokumente bleiben.
}

export async function assignCategoryToAttachment(database: DbClient, attachmentId: number, categoryId: number): Promise<void> {
  await ensureAttachmentExists(database, attachmentId);
  await ensureCategoryExists(database, categoryId);
  await database.insert(attachmentCategoryLinks).ignore().values({ categoryId, attachmentId });
}

export async function removeCategoryFromAttachment(database: DbClient, attachmentId: number, categoryId: number): Promise<void> {
  await database
    .delete(attachmentCategoryLinks)
    .where(and(eq(attachmentCategoryLinks.categoryId, categoryId), eq(attachmentCategoryLinks.attachmentId, attachmentId)));
}
