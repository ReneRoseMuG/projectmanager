import { and, eq, like, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { features } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type FeatureRecord = typeof features.$inferSelect;
export type FeatureCreateData = Omit<typeof features.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type FeatureUpdateData = Partial<Pick<FeatureCreateData, "title" | "status" | "description" | "content" | "sortOrder" | "responsibleUserId">>;

// Serverseitige Filter für die paginierte Feature-Liste. `status` bildet den bisherigen
// clientseitigen Statusfilter exakt nach (Gleichheit auf features.status), `q` bildet die
// Titel-Suche der Board-Ansicht nach (case-insensitive LIKE auf features.title).
export interface FeatureListFilter {
  status?: string;
  q?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Klausel aus den aktiven Filtern; wird von Roh-Query und Count geteilt,
// damit `total` (Anzahl nach Filter, vor Pagination) und die Seite garantiert konsistent sind.
function buildListWhere(filter: FeatureListFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.status !== undefined) {
    conditions.push(eq(features.status, filter.status));
  }
  if (filter.q) {
    conditions.push(like(features.title, `%${filter.q}%`));
  }
  if (conditions.length === 0) {
    return undefined;
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export const featureRepository = {
  async findById(database: DbSession, id: number): Promise<FeatureRecord | undefined> {
    return firstRow(await database.select().from(features).where(eq(features.id, id)));
  },

  async findAll(database: DbSession): Promise<FeatureRecord[]> {
    return database.select().from(features).orderBy(features.sortOrder, features.title);
  },

  // Eine Seite gefilterter Feature-Records (WHERE + ORDER BY + LIMIT/OFFSET). Reihenfolge
  // wie im Alt-Pfad (sortOrder, title). Die Anreicherung (counts/user) erfolgt im Service.
  async findPage(database: DbSession, filter: FeatureListFilter, page: number, pageSize: number): Promise<FeatureRecord[]> {
    const offset = (page - 1) * pageSize;
    return database
      .select()
      .from(features)
      .where(buildListWhere(filter))
      .orderBy(features.sortOrder, features.title)
      .limit(pageSize)
      .offset(offset);
  },

  // Gesamtzahl der Features nach Filter (vor Pagination) für `total`.
  async countFiltered(database: DbSession, filter: FeatureListFilter): Promise<number> {
    const row = firstRow(
      await database.select({ count: sql<number>`count(*)` }).from(features).where(buildListWhere(filter))
    );
    return Number(row?.count ?? 0);
  },

  async create(database: DbSession, data: FeatureCreateData, userId?: number): Promise<FeatureRecord> {
    const now = nowIso();
    const result = await database
      .insert(features)
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
      title: data.title,
      status: data.status ?? "draft",
      description: data.description ?? null,
      content: data.content ?? null,
      sortOrder: data.sortOrder ?? 0,
      responsibleUserId: data.responsibleUserId ?? null,
      version: 1,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
      createdAt: now,
      updatedAt: now
    };
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: FeatureUpdateData, userId?: number): Promise<FeatureRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(features)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(features.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(features).where(eq(features.id, id)));
  }
};

