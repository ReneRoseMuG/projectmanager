import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { comments } from "../db/schema.js";
import { assertVersion } from "./base.repository.js";

export type CommentRecord = typeof comments.$inferSelect;
export type CommentCreateData = Omit<typeof comments.$inferInsert, "id" | "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
export type CommentUpdateData = Partial<Pick<CommentCreateData, "body">>;

function nowIso(): string {
  return new Date().toISOString();
}

export const commentRepository = {
  async findById(database: DbSession, id: number): Promise<CommentRecord | undefined> {
    return firstRow(await database.select().from(comments).where(eq(comments.id, id)));
  },

  async create(database: DbSession, data: CommentCreateData, userId?: number): Promise<CommentRecord> {
    const now = nowIso();
    const result = await database
      .insert(comments)
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
      throw new Error("Created comment could not be loaded");
    }
    return created;
  },

  async update(database: DbSession, id: number, expectedVersion: number, data: CommentUpdateData, userId?: number): Promise<CommentRecord | undefined> {
    const current = await this.findById(database, id);
    if (!current) {
      return undefined;
    }
    assertVersion(current.version, expectedVersion);
    await database
      .update(comments)
      .set({
        ...data,
        version: current.version + 1,
        updatedBy: userId ?? null,
        updatedAt: nowIso()
      })
      .where(eq(comments.id, id));
    return this.findById(database, id);
  },

  async delete(database: DbSession, id: number): Promise<number> {
    return mutationAffectedRows(await database.delete(comments).where(eq(comments.id, id)));
  }
};
