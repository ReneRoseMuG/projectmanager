import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { milestones } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type MilestoneRecord = typeof milestones.$inferSelect;
export type MilestoneCreateData = Omit<typeof milestones.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type MilestoneUpdateData = Partial<MilestoneCreateData>;

function nowIso(): string {
  return new Date().toISOString();
}

export const milestoneRepository = {
  findById(database: DbClient, id: number): MilestoneRecord | undefined {
    return database.select().from(milestones).where(eq(milestones.id, id)).get();
  },

  findAll(database: DbClient): MilestoneRecord[] {
    return database.select().from(milestones).all();
  },

  findByProjectId(database: DbClient, projectId: number): MilestoneRecord[] {
    return database.select().from(milestones).where(eq(milestones.projectId, projectId)).all();
  },

  findByProjectIds(database: DbClient, projectIds: number[]): MilestoneRecord[] {
    if (projectIds.length === 0) {
      return [];
    }
    return database.select().from(milestones).where(inArray(milestones.projectId, projectIds)).all();
  },

  create(database: DbClient, data: MilestoneCreateData, userId?: number): MilestoneRecord {
    const now = nowIso();
    return database
      .insert(milestones)
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

  update(database: DbClient, id: number, expectedVersion: number, data: MilestoneUpdateData, userId?: number): MilestoneRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(milestones)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(milestones.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(milestones).where(eq(milestones.id, id)).run().changes;
  }
};
