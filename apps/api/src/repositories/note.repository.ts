import { eq, inArray } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { notes } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type NoteRecord = typeof notes.$inferSelect;
export type NoteCreateData = Omit<typeof notes.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type NoteUpdateData = Partial<Pick<NoteCreateData, "title" | "contentJson">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const noteRepository = {
  findById(database: DbClient, id: number): NoteRecord | undefined {
    return database.select().from(notes).where(eq(notes.id, id)).get();
  },

  create(database: DbClient, data: NoteCreateData, userId?: number): NoteRecord {
    const now = nowIso();
    return database
      .insert(notes)
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

  update(database: DbClient, id: number, expectedVersion: number, data: NoteUpdateData, userId?: number): NoteRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(notes)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(notes.id, id))
      .returning()
      .get();
  },

  delete(database: DbClient, id: number): number {
    return database.delete(notes).where(eq(notes.id, id)).run().changes;
  },

  deleteByIds(database: DbClient, ids: number[]): number {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return 0;
    }
    return database.delete(notes).where(inArray(notes.id, uniqueIds)).run().changes;
  }
};
