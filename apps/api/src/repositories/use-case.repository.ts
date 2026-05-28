import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { useCases } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type UseCaseRecord = typeof useCases.$inferSelect;
export type UseCaseCreateData = Omit<typeof useCases.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type UseCaseUpdateData = Partial<Pick<UseCaseCreateData, "featureId" | "title" | "status" | "description" | "content" | "sortOrder">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const useCaseRepository = {
  findById(database: DbClient, id: number): UseCaseRecord | undefined {
    return database.select().from(useCases).where(eq(useCases.id, id)).get();
  },

  findByFeatureId(database: DbClient, featureId: number): UseCaseRecord[] {
    return database.select().from(useCases).where(eq(useCases.featureId, featureId)).orderBy(useCases.sortOrder, useCases.title).all();
  },

  create(database: DbClient, data: UseCaseCreateData, userId?: number): UseCaseRecord {
    const now = nowIso();
    return database
      .insert(useCases)
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

  update(database: DbClient, id: number, expectedVersion: number, data: UseCaseUpdateData, userId?: number): UseCaseRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(useCases)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(useCases.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(useCases).where(eq(useCases.id, id)).run().changes;
  }
};
