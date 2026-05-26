import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { comments } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type CommentRecord = typeof comments.$inferSelect;
export type CommentCreateData = Omit<typeof comments.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type CommentUpdateData = Partial<Pick<CommentCreateData, "body">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const commentRepository = {
  findById(database: DbSession, id: number): CommentRecord | undefined {
    return database.select().from(comments).where(eq(comments.id, id)).get();
  },

  create(database: DbSession, data: CommentCreateData, userId?: number): CommentRecord {
    const now = nowIso();
    return database
      .insert(comments)
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

  update(database: DbSession, id: number, expectedVersion: number, data: CommentUpdateData, userId?: number): CommentRecord | undefined {
    const current = this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    return database
      .update(comments)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(comments.id, id))
      .returning()
      .get();
  },

  delete(database: DbSession, id: number): number {
    return database.delete(comments).where(eq(comments.id, id)).run().changes;
  }
};
