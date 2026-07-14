import { and, asc, eq, inArray, isNull, max, or, sql } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { attachmentFolders } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type AttachmentFolderRecord = typeof attachmentFolders.$inferSelect;
export type AttachmentFolderCreateData = Omit<
  typeof attachmentFolders.$inferInsert,
  "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;
export type AttachmentFolderUpdateData = Partial<Pick<AttachmentFolderCreateData, "parentId" | "projectId" | "name" | "sortOrder">>;

interface AttachmentFolderOrderUpdate {
  id: number;
  expectedVersion: number;
  sortOrder: number;
}

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
    return database
      .select()
      .from(attachmentFolders)
      .where(isNull(attachmentFolders.parentId))
      .orderBy(asc(attachmentFolders.sortOrder), asc(attachmentFolders.name), asc(attachmentFolders.id));
  },

  async findChildren(database: DbSession, parentId: number): Promise<AttachmentFolderRecord[]> {
    return database
      .select()
      .from(attachmentFolders)
      .where(eq(attachmentFolders.parentId, parentId))
      .orderBy(asc(attachmentFolders.sortOrder), asc(attachmentFolders.name), asc(attachmentFolders.id));
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
    return database
      .select()
      .from(attachmentFolders)
      .orderBy(asc(attachmentFolders.sortOrder), asc(attachmentFolders.name), asc(attachmentFolders.id));
  },

  async nextSortOrder(database: DbSession, parentId: number | null): Promise<number> {
    const parentCondition = parentId === null ? isNull(attachmentFolders.parentId) : eq(attachmentFolders.parentId, parentId);
    const row = firstRow(
      await database.select({ value: max(attachmentFolders.sortOrder) }).from(attachmentFolders).where(parentCondition)
    );
    return row?.value === null || row?.value === undefined ? 0 : Number(row.value) + 1024;
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
  },

  async updateOrder(database: DbSession, items: AttachmentFolderOrderUpdate[], userId?: number): Promise<number> {
    if (items.length === 0) {
      return 0;
    }
    const orderCases = sql.join(items.map((item) => sql`when ${item.id} then ${item.sortOrder}`), sql.raw(" "));
    const versionConditions = items.map((item) =>
      and(eq(attachmentFolders.id, item.id), eq(attachmentFolders.version, item.expectedVersion))
    );
    const result = await database
      .update(attachmentFolders)
      .set({
        sortOrder: sql`case ${attachmentFolders.id} ${orderCases} else ${attachmentFolders.sortOrder} end`,
        version: sql`${attachmentFolders.version} + 1`,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(or(...versionConditions));
    return mutationAffectedRows(result);
  }
};
