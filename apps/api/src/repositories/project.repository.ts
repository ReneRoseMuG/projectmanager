import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { projects } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type ProjectRecord = typeof projects.$inferSelect;
export type ProjectCreateData = Omit<typeof projects.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type ProjectUpdateData = Partial<ProjectCreateData>;

function nowIso(): string {
  return new Date().toISOString();
}

export const projectRepository = {
  async findById(database: DbSession, id: number): Promise<ProjectRecord | undefined> {
    return firstRow(await database.select().from(projects).where(eq(projects.id, id)));
  },

  async findAll(database: DbSession): Promise<ProjectRecord[]> {
    return database.select().from(projects);
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

