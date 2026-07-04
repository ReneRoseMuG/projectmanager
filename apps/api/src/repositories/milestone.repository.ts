import { and, eq, inArray, like, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { milestones } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type MilestoneRecord = typeof milestones.$inferSelect;
export type MilestoneCreateData = Omit<typeof milestones.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type MilestoneUpdateData = Partial<MilestoneCreateData>;

// Serverseitige Filter für die paginierte globale Meilensteinliste. `status` bildet den
// bisherigen clientseitigen Statusfilter exakt nach (Gleichheit auf milestones.status),
// `q` bildet die clientseitige Namenssuche nach (case-insensitive LIKE auf milestones.name).
export interface MilestoneListFilter {
  status?: string;
  q?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Klausel aus den aktiven Filtern; wird von Roh-Query und Count geteilt,
// damit `total` (Anzahl nach Filter, vor Pagination) und die Seite garantiert konsistent sind.
function buildListWhere(filter: MilestoneListFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.status !== undefined) {
    conditions.push(eq(milestones.status, filter.status));
  }
  if (filter.q) {
    conditions.push(like(milestones.name, `%${filter.q}%`));
  }
  if (conditions.length === 0) {
    return undefined;
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
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

  // Eine Seite gefilterter Meilenstein-Records (WHERE + ORDER BY + LIMIT/OFFSET). Reihenfolge
  // wie im Alt-Pfad (recencyOrder). Die Anreicherung (counts/tags/...) erfolgt im Service.
  async findPage(database: DbSession, filter: MilestoneListFilter, page: number, pageSize: number): Promise<MilestoneRecord[]> {
    const offset = (page - 1) * pageSize;
    return database
      .select()
      .from(milestones)
      .where(buildListWhere(filter))
      .orderBy(...recencyOrder(milestones))
      .limit(pageSize)
      .offset(offset);
  },

  // Gesamtzahl der Meilensteine nach Filter (vor Pagination) für `total`.
  async countFiltered(database: DbSession, filter: MilestoneListFilter): Promise<number> {
    const row = firstRow(
      await database.select({ count: sql<number>`count(*)` }).from(milestones).where(buildListWhere(filter))
    );
    return Number(row?.count ?? 0);
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

