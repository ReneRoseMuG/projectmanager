import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { attachmentFolders } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type AttachmentFolderRecord = typeof attachmentFolders.$inferSelect;
export type AttachmentFolderCreateData = Omit<
  typeof attachmentFolders.$inferInsert,
  "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;
export type AttachmentFolderUpdateData = Partial<Pick<AttachmentFolderCreateData, "parentId" | "projectId" | "name">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const attachmentFolderRepository = {
  async findById(database: DbSession, id: number): Promise<AttachmentFolderRecord | undefined> {
    return firstRow(await database.select().from(attachmentFolders).where(eq(attachmentFolders.id, id)));
  },

  async findByIds(database: DbSession, ids: number[]): Promise<AttachmentFolderRecord[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select().from(attachmentFolders).where(inArray(attachmentFolders.id, uniqueIds));
  },

  async findRootFolders(database: DbSession): Promise<AttachmentFolderRecord[]> {
    return database.select().from(attachmentFolders).where(isNull(attachmentFolders.parentId)).orderBy(attachmentFolders.name);
  },

  async findChildren(database: DbSession, parentId: number): Promise<AttachmentFolderRecord[]> {
    return database.select().from(attachmentFolders).where(eq(attachmentFolders.parentId, parentId)).orderBy(attachmentFolders.name);
  },

  async findSiblingByName(
    database: DbSession,
    parentId: number | null,
    name: string
  ): Promise<AttachmentFolderRecord | undefined> {
    const parentCondition = parentId === null ? isNull(attachmentFolders.parentId) : eq(attachmentFolders.parentId, parentId);
    return firstRow(
      await database
        .select()
        .from(attachmentFolders)
        .where(and(parentCondition, eq(attachmentFolders.name, name)))
    );
  },

  async findAll(database: DbSession): Promise<AttachmentFolderRecord[]> {
    return database.select().from(attachmentFolders).orderBy(attachmentFolders.name);
  },

  async create(database: DbSession, data: AttachmentFolderCreateData, userId?: number): Promise<AttachmentFolderRecord> {
    const now = nowIso();
    const result = await database
      .insert(attachmentFolders)
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
      throw new Error("Created attachment folder could not be loaded");
    }
    return created;
  },

  async update(
    database: DbSession,
    id: number,
    expectedVersion: number,
    data: AttachmentFolderUpdateData,
    userId?: number
  ): Promise<AttachmentFolderRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(attachmentFolders)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(attachmentFolders.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(attachmentFolders).where(eq(attachmentFolders.id, id)));
  }
};
