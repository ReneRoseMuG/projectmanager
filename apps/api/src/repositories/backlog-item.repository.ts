import { and, eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { backlogItems } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type BacklogItemRecord = typeof backlogItems.$inferSelect;
export type BacklogItemCreateData = Omit<typeof backlogItems.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type BacklogItemUpdateData = Partial<Pick<BacklogItemCreateData, "title" | "description" | "status" | "importKey" | "featureId" | "useCaseId" | "sortOrder" | "responsibleUserId">>;
export interface BacklogItemFilters {
  featureId?: number;
  useCaseId?: number;
  status?: BacklogItemRecord["status"];
}

function nowIso(): string {
  return new Date().toISOString();
}

export const backlogItemRepository = {
  async findById(database: DbSession, id: number): Promise<BacklogItemRecord | undefined> {
    return firstRow(await database.select().from(backlogItems).where(eq(backlogItems.id, id)));
  },

  async findByProject(database: DbSession, projectId: number, filters: BacklogItemFilters): Promise<BacklogItemRecord[]> {
    const conditions = [eq(backlogItems.projectId, projectId)];
    if (filters.featureId !== undefined) {
      conditions.push(eq(backlogItems.featureId, filters.featureId));
    }
    if (filters.useCaseId !== undefined) {
      conditions.push(eq(backlogItems.useCaseId, filters.useCaseId));
    }
    if (filters.status !== undefined) {
      conditions.push(eq(backlogItems.status, filters.status));
    }

    return database.select().from(backlogItems).where(and(...conditions)).orderBy(backlogItems.sortOrder, backlogItems.createdAt);
  },

  async create(database: DbSession, data: BacklogItemCreateData, userId?: number): Promise<BacklogItemRecord> {
    const now = nowIso();
    const result = await database
      .insert(backlogItems)
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
      throw new Error("Created backlog item could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: BacklogItemUpdateData, userId?: number): Promise<BacklogItemRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(backlogItems)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(backlogItems.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(backlogItems).where(eq(backlogItems.id, id)));
  }
};

