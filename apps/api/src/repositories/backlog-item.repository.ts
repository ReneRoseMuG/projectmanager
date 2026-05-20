import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { backlogItems } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type BacklogItemRecord = typeof backlogItems.$inferSelect;
export type BacklogItemCreateData = Omit<typeof backlogItems.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type BacklogItemUpdateData = Partial<Pick<BacklogItemCreateData, "title" | "description" | "status" | "importKey" | "featureId" | "useCaseId" | "sortOrder">>;
export interface BacklogItemFilters {
  featureId?: number;
  useCaseId?: number;
  status?: BacklogItemRecord["status"];
}

function nowIso(): string {
  return new Date().toISOString();
}

export const backlogItemRepository = {
  findById(database: DbClient, id: number): BacklogItemRecord | undefined {
    return database.select().from(backlogItems).where(eq(backlogItems.id, id)).get();
  },

  findByProject(database: DbClient, projectId: number, filters: BacklogItemFilters): BacklogItemRecord[] {
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

    return database.select().from(backlogItems).where(and(...conditions)).orderBy(backlogItems.sortOrder, backlogItems.createdAt).all();
  },

  create(database: DbClient, data: BacklogItemCreateData, userId?: number): BacklogItemRecord {
    const now = nowIso();
    return database
      .insert(backlogItems)
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

  update(database: DbClient, id: number, expectedVersion: number, data: BacklogItemUpdateData, userId?: number): BacklogItemRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(backlogItems)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(backlogItems.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(backlogItems).where(eq(backlogItems.id, id)).run().changes;
  }
};
