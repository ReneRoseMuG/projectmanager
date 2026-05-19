import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type ProjectRecord = typeof projects.$inferSelect;
export type ProjectCreateData = Omit<typeof projects.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type ProjectUpdateData = Partial<Omit<ProjectCreateData, "seedRunId">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const projectRepository = {
  findById(database: DbClient, id: number): ProjectRecord | undefined {
    return database.select().from(projects).where(eq(projects.id, id)).get();
  },

  findAll(database: DbClient): ProjectRecord[] {
    return database.select().from(projects).all();
  },

  create(database: DbClient, data: ProjectCreateData, userId?: number): ProjectRecord {
    const now = nowIso();
    return database
      .insert(projects)
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

  update(database: DbClient, id: number, expectedVersion: number, data: ProjectUpdateData, userId?: number): ProjectRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(projects)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(projects.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(projects).where(eq(projects.id, id)).run().changes;
  }
};
