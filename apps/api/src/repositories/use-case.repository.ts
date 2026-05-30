import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { useCases } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type UseCaseRecord = typeof useCases.$inferSelect;
export type UseCaseCreateData = Omit<typeof useCases.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type UseCaseUpdateData = Partial<Pick<UseCaseCreateData, "featureId" | "title" | "status" | "description" | "content" | "sortOrder" | "responsibleUserId">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const useCaseRepository = {
  async findById(database: DbSession, id: number): Promise<UseCaseRecord | undefined> {
    return firstRow(await database.select().from(useCases).where(eq(useCases.id, id)));
  },

  async findByFeatureId(database: DbSession, featureId: number): Promise<UseCaseRecord[]> {
    return database.select().from(useCases).where(eq(useCases.featureId, featureId)).orderBy(useCases.sortOrder, useCases.title);
  },

  async create(database: DbSession, data: UseCaseCreateData, userId?: number): Promise<UseCaseRecord> {
    const now = nowIso();
    const result = await database
      .insert(useCases)
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
      throw new Error("Created use case could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: UseCaseUpdateData, userId?: number): Promise<UseCaseRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(useCases)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(useCases.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(useCases).where(eq(useCases.id, id)));
  }
};

