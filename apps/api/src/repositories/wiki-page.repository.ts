import { eq, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { wikiPages } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type WikiPageRecord = typeof wikiPages.$inferSelect;
export type WikiPageCreateData = Omit<typeof wikiPages.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type WikiPageUpdateData = Partial<Pick<WikiPageCreateData, "parentId" | "projectId" | "title" | "slug" | "contentPath" | "sortOrder">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const wikiPageRepository = {
  findById(database: DbClient, id: number): WikiPageRecord | undefined {
    return database.select().from(wikiPages).where(eq(wikiPages.id, id)).get();
  },

  findRootPages(database: DbClient): WikiPageRecord[] {
    return database.select().from(wikiPages).where(isNull(wikiPages.parentId)).orderBy(wikiPages.sortOrder, wikiPages.title).all();
  },

  findChildren(database: DbClient, id: number): WikiPageRecord[] {
    return database.select().from(wikiPages).where(eq(wikiPages.parentId, id)).orderBy(wikiPages.sortOrder, wikiPages.title).all();
  },

  findBySlug(database: DbClient, slug: string): WikiPageRecord[] {
    return database.select().from(wikiPages).where(eq(wikiPages.slug, slug)).all();
  },

  create(database: DbClient, data: WikiPageCreateData, userId?: number): WikiPageRecord {
    const now = nowIso();
    return database
      .insert(wikiPages)
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

  update(database: DbClient, id: number, expectedVersion: number, data: WikiPageUpdateData, userId?: number): WikiPageRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(wikiPages)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(wikiPages.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(wikiPages).where(eq(wikiPages.id, id)).run().changes;
  }
};
