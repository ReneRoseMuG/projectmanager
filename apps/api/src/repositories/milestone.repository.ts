import { eq, inArray } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { milestones } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type MilestoneRecord = typeof milestones.$inferSelect;
export type MilestoneCreateData = Omit<typeof milestones.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type MilestoneUpdateData = Partial<MilestoneCreateData>;

function nowIso(): string {
  return new Date().toISOString();
}

export const milestoneRepository = {
  async findById(database: DbSession, id: number): Promise<MilestoneRecord | undefined> {
    return firstRow(await database.select().from(milestones).where(eq(milestones.id, id)));
  },

  async findAll(database: DbSession): Promise<MilestoneRecord[]> {
    return database.select().from(milestones);
  },

  async findByProjectId(database: DbSession, projectId: number): Promise<MilestoneRecord[]> {
    return database.select().from(milestones).where(eq(milestones.projectId, projectId));
  },

  async findByProjectIds(database: DbSession, projectIds: number[]): Promise<MilestoneRecord[]> {
    if (projectIds.length === 0) {
      return [];
    }
    return database.select().from(milestones).where(inArray(milestones.projectId, projectIds));
  },

  async create(database: DbSession, data: MilestoneCreateData, userId?: number): Promise<MilestoneRecord> {
    const now = nowIso();
    const result = await database
      .insert(milestones)
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
      throw new Error("Created milestone could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: MilestoneUpdateData, userId?: number): Promise<MilestoneRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(milestones)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(milestones.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(milestones).where(eq(milestones.id, id)));
  }
};

