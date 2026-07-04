import { and, eq, like, or, sql, type SQL } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows, recencyOrder } from "../db/query-utils.js";
import { projects } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type ProjectRecord = typeof projects.$inferSelect;
export type ProjectCreateData = Omit<typeof projects.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type ProjectUpdateData = Partial<ProjectCreateData>;

// Serverseitige Filter für die paginierte Projektliste. `status` bildet den bisherigen
// clientseitigen Statusfilter exakt nach (Gleichheit auf projects.status), `q` sucht
// case-insensitive in Name und Beschreibung (MySQL-LIKE auf der üblichen Collation).
export interface ProjectListFilter {
  status?: string;
  q?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Baut die WHERE-Klausel aus den aktiven Filtern; wird von Roh-Query und Count geteilt,
// damit `total` (Anzahl nach Filter, vor Pagination) und die Seite garantiert konsistent sind.
function buildListWhere(filter: ProjectListFilter): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.status !== undefined) {
    conditions.push(eq(projects.status, filter.status));
  }
  if (filter.q) {
    const pattern = `%${filter.q}%`;
    conditions.push(or(like(projects.name, pattern), like(projects.description, pattern)) as SQL);
  }
  if (conditions.length === 0) {
    return undefined;
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

export const projectRepository = {
  async findById(database: DbSession, id: number): Promise<ProjectRecord | undefined> {
    return firstRow(await database.select().from(projects).where(eq(projects.id, id)));
  },

  async findAll(database: DbSession): Promise<ProjectRecord[]> {
    return database.select().from(projects);
  },

  // Eine Seite gefilterter Projekt-Records (WHERE + ORDER BY + LIMIT/OFFSET). Reihenfolge
  // wie im Alt-Pfad (recencyOrder). Die Anreicherung (counts/tags) erfolgt im Service.
  async findPage(database: DbSession, filter: ProjectListFilter, page: number, pageSize: number): Promise<ProjectRecord[]> {
    const offset = (page - 1) * pageSize;
    return database
      .select()
      .from(projects)
      .where(buildListWhere(filter))
      .orderBy(...recencyOrder(projects))
      .limit(pageSize)
      .offset(offset);
  },

  // Gesamtzahl der Projekte nach Filter (vor Pagination) für `total`.
  async countFiltered(database: DbSession, filter: ProjectListFilter): Promise<number> {
    const row = firstRow(
      await database.select({ count: sql<number>`count(*)` }).from(projects).where(buildListWhere(filter))
    );
    return Number(row?.count ?? 0);
  },

  async create(database: DbSession, data: ProjectCreateData, userId?: number): Promise<ProjectRecord> {
    const now = nowIso();
    const result = await database
      .insert(projects)
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
      throw new Error("Created project could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: ProjectUpdateData, userId?: number): Promise<ProjectRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(projects)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(projects.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(projects).where(eq(projects.id, id)));
  }
};

