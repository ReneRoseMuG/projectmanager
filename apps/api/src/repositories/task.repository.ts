import { eq, inArray, isNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { tasks } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TaskRecord = typeof tasks.$inferSelect;
export type TaskCreateData = Omit<typeof tasks.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TaskUpdateData = Partial<Pick<TaskCreateData, "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const taskRepository = {
  async findById(database: DbSession, id: number): Promise<TaskRecord | undefined> {
    return firstRow(await database.select().from(tasks).where(eq(tasks.id, id)));
  },

  async findAll(database: DbSession): Promise<TaskRecord[]> {
    return database.select().from(tasks);
  },

  async findRootTasks(database: DbSession): Promise<TaskRecord[]> {
    return database.select().from(tasks).where(isNull(tasks.parentId)).orderBy(tasks.status, tasks.updatedAt);
  },

  async findChildren(database: DbSession, parentId: number): Promise<TaskRecord[]> {
    return database.select().from(tasks).where(eq(tasks.parentId, parentId)).orderBy(tasks.createdAt, tasks.id);
  },

  async findByIds(database: DbSession, ids: number[]): Promise<TaskRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    return database.select().from(tasks).where(inArray(tasks.id, ids));
  },

  async create(database: DbSession, data: TaskCreateData, userId?: number): Promise<TaskRecord> {
    const now = nowIso();
    const result = await database
      .insert(tasks)
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
      throw new Error("Created task could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: TaskUpdateData, userId?: number): Promise<TaskRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(tasks)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(tasks.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(tasks).where(eq(tasks.id, id)));
  }
};

