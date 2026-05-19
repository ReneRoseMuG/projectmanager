import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { comments } from "../db/schema.js";

export type CommentRecord = typeof comments.$inferSelect;
export type CommentCreateData = Omit<typeof comments.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;

function nowIso(): string {
  return new Date().toISOString();
}

export const commentRepository = {
  findById(database: DbClient, id: number): CommentRecord | undefined {
    return database.select().from(comments).where(eq(comments.id, id)).get();
  },

  create(database: DbClient, data: CommentCreateData, userId?: number): CommentRecord {
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

  delete(database: DbClient, id: number): number {
    return database.delete(comments).where(eq(comments.id, id)).run().changes;
  }
};
