import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { tags } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TagRecord = typeof tags.$inferSelect;
export type TagCreateData = Omit<typeof tags.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TagUpdateData = Partial<Pick<TagCreateData, "name" | "color">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const tagRepository = {
  findById(database: DbClient, id: number): TagRecord | undefined {
    return database.select().from(tags).where(eq(tags.id, id)).get();
  },

  findByName(database: DbClient, name: string): TagRecord | undefined {
    return database.select().from(tags).where(eq(tags.name, name)).get();
  },

  findByIds(database: DbClient, ids: number[]): TagRecord[] {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select().from(tags).where(inArray(tags.id, uniqueIds)).all();
  },

  findAll(database: DbClient): TagRecord[] {
    return database.select().from(tags).all();
  },

  create(database: DbClient, data: TagCreateData, userId?: number): TagRecord {
    const now = nowIso();
    return database
      .insert(tags)
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

  update(database: DbClient, id: number, expectedVersion: number, data: TagUpdateData, userId?: number): TagRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(tags)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(tags.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(tags).where(eq(tags.id, id)).run().changes;
  }
};
