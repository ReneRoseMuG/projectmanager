import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { features } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type FeatureRecord = typeof features.$inferSelect;
export type FeatureCreateData = Omit<typeof features.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type FeatureUpdateData = Partial<Pick<FeatureCreateData, "title" | "status" | "description" | "contentPath" | "sortOrder">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const featureRepository = {
  findById(database: DbClient, id: number): FeatureRecord | undefined {
    return database.select().from(features).where(eq(features.id, id)).get();
  },

  findAll(database: DbClient): FeatureRecord[] {
    return database.select().from(features).orderBy(features.sortOrder, features.title).all();
  },

  create(database: DbClient, data: FeatureCreateData, userId?: number): FeatureRecord {
    const now = nowIso();
    return database
      .insert(features)
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

  update(database: DbClient, id: number, expectedVersion: number, data: FeatureUpdateData, userId?: number): FeatureRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(features)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(features.id, id))
      .returning()
      .get();
  },

  setContentPath(database: DbClient, id: number, contentPath: string): FeatureRecord | undefined {
    return database.update(features).set({ contentPath, updatedAt: nowIso() }).where(eq(features.id, id)).returning().get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(features).where(eq(features.id, id)).run().changes;
  }
};
