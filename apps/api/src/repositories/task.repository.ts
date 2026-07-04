import { and, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { tasks } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type TaskRecord = typeof tasks.$inferSelect;
export type TaskCreateData = Omit<typeof tasks.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type TaskUpdateData = Partial<Pick<TaskCreateData, "parentId" | "title" | "description" | "status" | "priority" | "responsibleUserId" | "dueDate">>;

// Serverseitige Filter für die paginierte globale Aufgabenliste. `status` bildet eine
// Gleichheit auf tasks.status ab, `q` sucht case-insensitive in Titel und Beschreibung
// (MySQL-LIKE auf der üblichen Collation).
export interface TaskListFilter {
  status?: string;
  q?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Klausel für die globale Aufgabenliste: nur Wurzelaufgaben (parentId IS
// NULL, exakt wie findRootTasks) plus die aktiven Filter. Wird von Roh-Query und Count
// geteilt, damit `total` (Anzahl nach Filter, vor Pagination) und die Seite konsistent sind.
function buildRootTasksWhere(filter: TaskListFilter): SQL {
  const conditions: SQL[] = [isNull(tasks.parentId)];
  if (filter.status !== undefined) {
    conditions.push(eq(tasks.status, filter.status));
  }
  if (filter.q) {
    const pattern = `%${filter.q}%`;
    conditions.push(or(like(tasks.title, pattern), like(tasks.description, pattern)) as SQL);
  }
  return and(...conditions) as SQL;
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

  // Eine Seite gefilterter Wurzelaufgaben (WHERE + ORDER BY + LIMIT/OFFSET). Reihenfolge
  // wie im Alt-Pfad findRootTasks (status-gruppiert, dann recencyOrder). Die Anreicherung
  // (tags/subtaskCount/support counts) erfolgt anschließend im Service.
  async findRootTasksPage(database: DbSession, filter: TaskListFilter, page: number, pageSize: number): Promise<TaskRecord[]> {
    const offset = (page - 1) * pageSize;
    return database
      .select()
      .from(tasks)
      .where(buildRootTasksWhere(filter))
      .orderBy(tasks.status, ...recencyOrder(tasks))
      .limit(pageSize)
      .offset(offset);
  },

  // Gesamtzahl der Wurzelaufgaben nach Filter (vor Pagination) für `total`.
  async countRootTasks(database: DbSession, filter: TaskListFilter): Promise<number> {
    const row = firstRow(
      await database.select({ count: sql<number>`count(*)` }).from(tasks).where(buildRootTasksWhere(filter))
    );
    return Number(row?.count ?? 0);
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

