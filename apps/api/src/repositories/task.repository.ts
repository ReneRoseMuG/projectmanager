import { eq, inArray, isNull } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { tasks } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TaskRecord = typeof tasks.$inferSelect;
export type TaskCreateData = Omit<typeof tasks.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TaskUpdateData = Partial<Pick<TaskCreateData, "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const taskRepository = {
  findById(database: DbClient, id: number): TaskRecord | undefined {
    return database.select().from(tasks).where(eq(tasks.id, id)).get();
  },

  findAll(database: DbClient): TaskRecord[] {
    return database.select().from(tasks).all();
  },

  findRootTasks(database: DbClient): TaskRecord[] {
    return database.select().from(tasks).where(isNull(tasks.parentId)).orderBy(tasks.status, tasks.updatedAt).all();
  },

  findChildren(database: DbClient, parentId: number): TaskRecord[] {
    return database.select().from(tasks).where(eq(tasks.parentId, parentId)).orderBy(tasks.createdAt, tasks.id).all();
  },

  findByIds(database: DbClient, ids: number[]): TaskRecord[] {
    if (ids.length === 0) {
      return [];
    }
    return database.select().from(tasks).where(inArray(tasks.id, ids)).all();
  },

  create(database: DbClient, data: TaskCreateData, userId?: number): TaskRecord {
    const now = nowIso();
    return database
      .insert(tasks)
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

  update(database: DbClient, id: number, expectedVersion: number, data: TaskUpdateData, userId?: number): TaskRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(tasks)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(tasks.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(tasks).where(eq(tasks.id, id)).run().changes;
  }
};
