import { eq, inArray, isNull } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { tasks } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TaskRecord = typeof tasks.$inferSelect;
export type TaskCreateData = Omit<typeof tasks.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TaskUpdateData = Partial<Pick<TaskCreateData, "parentId" | "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate">>;

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
    return database.select().from(tasks).where(isNull(tasks.parentId)).orderBy(tasks.status, ...recencyOrder(tasks));
  },

  async findChildren(database: DbSession, parentId: number): Promise<TaskRecord[]> {
    return database.select().from(tasks).where(eq(tasks.parentId, parentId)).orderBy(tasks.status, ...recencyOrder(tasks));
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
    return {
      id: insertId(result),
      parentId: data.parentId ?? null,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      responsibleUserId: data.responsibleUserId ?? null,
      dueDate: data.dueDate ?? null,
      importKey: data.importKey ?? null,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: now,
      updatedAt: now
    };
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: TaskUpdateData, userId?: number): Promise<TaskRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(tasks)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(tasks.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(tasks).where(eq(tasks.id, id)));
  }
};

