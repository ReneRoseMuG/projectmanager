import { and, eq, like, sql, type SQL } from "drizzle-orm";
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
  // Case-insensitive Titelsuche (MySQL-LIKE), bildet die bisherige clientseitige Suche nach.
  q?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Klausel aus Projektbindung und aktiven Filtern; wird von Roh-Query und
// Count geteilt, damit `total` (Anzahl nach Filter, vor Pagination) und die Seite garantiert
// konsistent sind.
function buildProjectWhere(projectId: number, filters: BacklogItemFilters): SQL {
  const conditions: SQL[] = [eq(backlogItems.projectId, projectId)];
  if (filters.featureId !== undefined) {
    conditions.push(eq(backlogItems.featureId, filters.featureId));
  }
  if (filters.useCaseId !== undefined) {
    conditions.push(eq(backlogItems.useCaseId, filters.useCaseId));
  }
  if (filters.status !== undefined) {
    conditions.push(eq(backlogItems.status, filters.status));
  }
  if (filters.q) {
    conditions.push(like(backlogItems.title, `%${filters.q}%`));
  }
  return and(...conditions) as SQL;
}

export const backlogItemRepository = {
  async findById(database: DbSession, id: number): Promise<BacklogItemRecord | undefined> {
    return firstRow(await database.select().from(backlogItems).where(eq(backlogItems.id, id)));
  },

  async findByProject(database: DbSession, projectId: number, filters: BacklogItemFilters): Promise<BacklogItemRecord[]> {
    return database.select().from(backlogItems).where(buildProjectWhere(projectId, filters)).orderBy(backlogItems.sortOrder, backlogItems.createdAt);
  },

  // Eine Seite gefilterter Backlog-Records (WHERE + ORDER BY + LIMIT/OFFSET). Reihenfolge
  // wie im Alt-Pfad (sortOrder, createdAt). Anreicherung (User/Parent-Labels) erfolgt im Service.
  async findPage(database: DbSession, projectId: number, filters: BacklogItemFilters, page: number, pageSize: number): Promise<BacklogItemRecord[]> {
    const offset = (page - 1) * pageSize;
    return database
      .select()
      .from(backlogItems)
      .where(buildProjectWhere(projectId, filters))
      .orderBy(backlogItems.sortOrder, backlogItems.createdAt)
      .limit(pageSize)
      .offset(offset);
  },

  // Gesamtzahl der Backlog-Items nach Filter (vor Pagination) für `total`.
  async countFiltered(database: DbSession, projectId: number, filters: BacklogItemFilters): Promise<number> {
    const row = firstRow(
      await database.select({ count: sql<number>`count(*)` }).from(backlogItems).where(buildProjectWhere(projectId, filters))
    );
    return Number(row?.count ?? 0);
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

