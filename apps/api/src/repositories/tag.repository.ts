import { eq, inArray } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { and } from "drizzle-orm";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { tags } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TagRecord = typeof tags.$inferSelect;
export type TagCreateData = Omit<typeof tags.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TagUpdateData = Partial<Pick<TagCreateData, "name" | "color">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const tagRepository = {
  async findById(database: DbSession, id: number): Promise<TagRecord | undefined> {
    return firstRow(await database.select().from(tags).where(eq(tags.id, id)));
  },

  async findByName(database: DbSession, name: string, domain?: string): Promise<TagRecord | undefined> {
    const condition = domain === undefined
      ? eq(tags.name, name)
      : and(eq(tags.domain, domain), eq(tags.name, name));
    return firstRow(await database.select().from(tags).where(condition));
  },

  async findByIds(database: DbSession, ids: number[]): Promise<TagRecord[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    return database.select().from(tags).where(inArray(tags.id, uniqueIds));
  },

  async findAll(database: DbSession): Promise<TagRecord[]> {
    return database.select().from(tags);
  },

  async create(database: DbSession, data: TagCreateData, userId?: number): Promise<TagRecord> {
    const now = nowIso();
    const result = await database
      .insert(tags)
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
      throw new Error("Created tag could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: TagUpdateData, userId?: number): Promise<TagRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(tags)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(tags.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(tags).where(eq(tags.id, id)));
  }
};

