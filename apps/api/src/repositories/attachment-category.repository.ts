import { and, asc, eq, inArray, max, or, sql } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { attachmentCategories } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type AttachmentCategoryRecord = typeof attachmentCategories.$inferSelect;
export type AttachmentCategoryCreateData = Omit<
  typeof attachmentCategories.$inferInsert,
  "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;
export type AttachmentCategoryUpdateData = Partial<Pick<AttachmentCategoryCreateData, "name" | "color" | "sortOrder">>;

interface AttachmentCategoryOrderUpdate {
  id: number;
  expectedVersion: number;
  sortOrder: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const attachmentCategoryRepository = {
  async findById(database: DbSession, id: number): Promise<AttachmentCategoryRecord | undefined> {
    return firstRow(await database.select().from(attachmentCategories).where(eq(attachmentCategories.id, id)));
  },

  async findByName(database: DbSession, name: string): Promise<AttachmentCategoryRecord | undefined> {
    return firstRow(await database.select().from(attachmentCategories).where(eq(attachmentCategories.name, name)));
  },

  async findByIds(database: DbSession, ids: number[]): Promise<AttachmentCategoryRecord[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select().from(attachmentCategories).where(inArray(attachmentCategories.id, uniqueIds));
  },

  async findAll(database: DbSession): Promise<AttachmentCategoryRecord[]> {
    return database
      .select()
      .from(attachmentCategories)
      .orderBy(asc(attachmentCategories.sortOrder), asc(attachmentCategories.name), asc(attachmentCategories.id));
  },

  async nextSortOrder(database: DbSession): Promise<number> {
    const row = firstRow(await database.select({ value: max(attachmentCategories.sortOrder) }).from(attachmentCategories));
    return row?.value === null || row?.value === undefined ? 0 : Number(row.value) + 1024;
  },

  async create(database: DbSession, data: AttachmentCategoryCreateData, userId?: number): Promise<AttachmentCategoryRecord> {
    const now = nowIso();
    const result = await database
      .insert(attachmentCategories)
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
      throw new Error("Created attachment category could not be loaded");
    }
    return created;
  },

  async update(
    database: DbSession,
    id: number,
    expectedVersion: number,
    data: AttachmentCategoryUpdateData,
    userId?: number
  ): Promise<AttachmentCategoryRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(attachmentCategories)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(attachmentCategories.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(attachmentCategories).where(eq(attachmentCategories.id, id)));
  },

  async updateOrder(database: DbSession, items: AttachmentCategoryOrderUpdate[], userId?: number): Promise<number> {
    if (items.length === 0) {
      return 0;
    }
    const orderCases = sql.join(items.map((item) => sql`when ${item.id} then ${item.sortOrder}`), sql.raw(" "));
    const versionConditions = items.map((item) =>
      and(eq(attachmentCategories.id, item.id), eq(attachmentCategories.version, item.expectedVersion))
    );
    const result = await database
      .update(attachmentCategories)
      .set({
        sortOrder: sql`case ${attachmentCategories.id} ${orderCases} else ${attachmentCategories.sortOrder} end`,
        version: sql`${attachmentCategories.version} + 1`,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(or(...versionConditions));
    return mutationAffectedRows(result);
  }
};
