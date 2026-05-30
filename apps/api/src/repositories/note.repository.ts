import { eq, inArray } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { notes } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type NoteRecord = typeof notes.$inferSelect;
export type NoteCreateData = Omit<typeof notes.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type NoteUpdateData = Partial<Pick<NoteCreateData, "title" | "contentJson">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const noteRepository = {
  async findById(database: DbSession, id: number): Promise<NoteRecord | undefined> {
    return firstRow(await database.select().from(notes).where(eq(notes.id, id)));
  },

  async create(database: DbSession, data: NoteCreateData, userId?: number): Promise<NoteRecord> {
    const now = nowIso();
    const result = await database
      .insert(notes)
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
      throw new Error("Created note could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: NoteUpdateData, userId?: number): Promise<NoteRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(notes)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(notes.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(notes).where(eq(notes.id, id)));
  },

  async deleteByIds(database: DbSession, ids: number[]): Promise<number> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return 0;
    }
    return mutationAffectedRows(await database.delete(notes).where(inArray(notes.id, uniqueIds)));
  }
};

