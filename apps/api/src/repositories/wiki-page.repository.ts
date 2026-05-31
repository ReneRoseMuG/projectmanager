import { eq, isNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { wikiPages } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type WikiPageRecord = typeof wikiPages.$inferSelect;
export type WikiPageCreateData = Omit<typeof wikiPages.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type WikiPageUpdateData = Partial<Pick<WikiPageCreateData, "parentId" | "title" | "content" | "sortOrder">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const wikiPageRepository = {
  async findById(database: DbSession, id: number): Promise<WikiPageRecord | undefined> {
    return firstRow(await database.select().from(wikiPages).where(eq(wikiPages.id, id)));
  },

  async findRootPages(database: DbSession): Promise<WikiPageRecord[]> {
    return database.select().from(wikiPages).where(isNull(wikiPages.parentId)).orderBy(wikiPages.sortOrder, wikiPages.title);
  },

  async findChildren(database: DbSession, id: number): Promise<WikiPageRecord[]> {
    return database.select().from(wikiPages).where(eq(wikiPages.parentId, id)).orderBy(wikiPages.sortOrder, wikiPages.title);
  },

  async create(database: DbSession, data: WikiPageCreateData, userId?: number): Promise<WikiPageRecord> {
    const now = nowIso();
    const result = await database
      .insert(wikiPages)
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
      throw new Error("Created wiki page could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: WikiPageUpdateData, userId?: number): Promise<WikiPageRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(wikiPages)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(wikiPages.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(wikiPages).where(eq(wikiPages.id, id)));
  }
};

