import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { diaryEntries } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type DiaryEntryRecord = typeof diaryEntries.$inferSelect;
export type DiaryEntryCreateData = Omit<typeof diaryEntries.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type DiaryEntryUpdateData = Partial<Pick<DiaryEntryCreateData, "title" | "content" | "coveredUntil" | "sourceCount">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const diaryEntryRepository = {
  // Genau ein lebender Eintrag pro Projekt (Unique-Index auf project_id).
  async findByProjectId(database: DbSession, projectId: number): Promise<DiaryEntryRecord | undefined> {
    return firstRow(await database.select().from(diaryEntries).where(eq(diaryEntries.projectId, projectId)));
  },

  async findById(database: DbSession, id: number): Promise<DiaryEntryRecord | undefined> {
    return firstRow(await database.select().from(diaryEntries).where(eq(diaryEntries.id, id)));
  },

  async create(database: DbSession, data: DiaryEntryCreateData, userId?: number): Promise<DiaryEntryRecord> {
    const now = nowIso();
    const result = await database
      .insert(diaryEntries)
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
      throw new Error("Created diary entry could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: DiaryEntryUpdateData, userId?: number): Promise<DiaryEntryRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    const now = nowIso();
    await database
      .update(diaryEntries)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: now
      })
      .where(eq(diaryEntries.id, id));
    return { ...current, ...data, version: current.version + 1, updatedBy: userId ?? null, updatedAt: now };
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(diaryEntries).where(eq(diaryEntries.id, id)));
  }
};
