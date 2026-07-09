import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { attachments } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type AttachmentRecord = typeof attachments.$inferSelect;
export type AttachmentCreateData = Omit<typeof attachments.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type AttachmentMetadataUpdateData = Partial<Pick<AttachmentRecord, "displayName" | "description">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const attachmentRepository = {
  async findById(database: DbSession, id: number): Promise<AttachmentRecord | undefined> {
    return firstRow(await database.select().from(attachments).where(eq(attachments.id, id)));
  },

  async findCleanupRecords(database: DbSession, ids: number[]): Promise<Array<Pick<AttachmentRecord, "id" | "filename">>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.id, uniqueIds));
  },

  // Für den Bulk-Download benötigte Felder: Ablagename (Platte) + Originalname (Zip-Eintrag).
  async findDownloadRecords(
    database: DbSession,
    ids: number[]
  ): Promise<Array<Pick<AttachmentRecord, "id" | "filename" | "originalName">>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database
      .select({ id: attachments.id, filename: attachments.filename, originalName: attachments.originalName })
      .from(attachments)
      .where(inArray(attachments.id, uniqueIds));
  },

  async findByContentHash(database: DbSession, contentHash: string): Promise<AttachmentRecord[]> {
    return database
      .select()
      .from(attachments)
      .where(eq(attachments.contentHash, contentHash))
      .orderBy(asc(attachments.id));
  },

  async findHashBackfillCandidates(
    database: DbSession,
    size: number
  ): Promise<Array<Pick<AttachmentRecord, "id" | "filename" | "originalName" | "size" | "contentHash">>> {
    return database
      .select({
        id: attachments.id,
        filename: attachments.filename,
        originalName: attachments.originalName,
        size: attachments.size,
        contentHash: attachments.contentHash
      })
      .from(attachments)
      .where(and(eq(attachments.size, size), isNull(attachments.contentHash)))
      .orderBy(asc(attachments.id));
  },

  async create(database: DbSession, data: AttachmentCreateData, userId?: number): Promise<AttachmentRecord> {
    const now = nowIso();
    const result = await database
      .insert(attachments)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      });
    const created = await this.findById(database, insertId(result));
    if (!created) {
      throw new Error("Created attachment could not be loaded");
    }
    return created;
  },

  async updateMetadata(
    database: DbSession,
    id: number,
    expectedVersion: number,
    data: AttachmentMetadataUpdateData,
    userId?: number
  ): Promise<AttachmentRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(attachments)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(attachments.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async deleteByIds(database: DbSession, ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return 0;
    }
    return mutationAffectedRows(await database.delete(attachments).where(inArray(attachments.id, uniqueIds)));
  },

  async updateSizeAndVersion(database: DbSession, id: number, data: { size: number; contentHash: string; updatedBy: number | null }): Promise<void> {
    await database
      .update(attachments)
      .set({
        size: data.size,
        contentHash: data.contentHash,
        updatedBy: data.updatedBy,
        updatedAt: nowIso(),
        version: sql`${attachments.version} + 1`
      })
      .where(eq(attachments.id, id));
  },

  async backfillContentHash(database: DbSession, id: number, contentHash: string): Promise<void> {
    await database
      .update(attachments)
      .set({ contentHash })
      .where(and(eq(attachments.id, id), isNull(attachments.contentHash)));
  }
};
