import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { attachments } from "../db/schema.js";

export type AttachmentRecord = typeof attachments.$inferSelect;
export type AttachmentCreateData = Omit<typeof attachments.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;

function nowIso(): string {
  return new Date().toISOString();
}

export const attachmentRepository = {
  findById(database: DbClient, id: number): AttachmentRecord | undefined {
    return database.select().from(attachments).where(eq(attachments.id, id)).get();
  },

  findCleanupRecords(database: DbClient, ids: number[]): Array<Pick<AttachmentRecord, "id" | "filename">> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select({ id: attachments.id, filename: attachments.filename }).from(attachments).where(inArray(attachments.id, uniqueIds)).all();
  },

  create(database: DbClient, data: AttachmentCreateData, userId?: number): AttachmentRecord {
    const now = nowIso();
    return database
      .insert(attachments)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  },

  deleteByIds(database: DbClient, ids: number[]): number {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return 0;
    }
    return database.delete(attachments).where(inArray(attachments.id, uniqueIds)).run().changes;
  }
};
