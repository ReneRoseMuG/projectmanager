import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { features } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type FeatureRecord = typeof features.$inferSelect;
export type FeatureCreateData = Omit<typeof features.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type FeatureUpdateData = Partial<Pick<FeatureCreateData, "title" | "status" | "description" | "content" | "sortOrder" | "responsibleUserId">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const featureRepository = {
  async findById(database: DbSession, id: number): Promise<FeatureRecord | undefined> {
    return firstRow(await database.select().from(features).where(eq(features.id, id)));
  },

  async findAll(database: DbSession): Promise<FeatureRecord[]> {
    return database.select().from(features).orderBy(features.sortOrder, features.title);
  },

  async create(database: DbSession, data: FeatureCreateData, userId?: number): Promise<FeatureRecord> {
    const now = nowIso();
    const result = await database
      .insert(features)
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
      throw new Error("Created feature could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: FeatureUpdateData, userId?: number): Promise<FeatureRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(features)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(features.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(features).where(eq(features.id, id)));
  }
};

