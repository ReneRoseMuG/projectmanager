import { eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { contentImages } from "../db/schema.js";

export type ContentImageRecord = typeof contentImages.$inferSelect;
export type ContentImageCreateData = Omit<typeof contentImages.$inferInsert, "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;

function nowIso(): string {
  return new Date().toISOString();
}

export const contentImageRepository = {
  create(database: DbClient, data: ContentImageCreateData, userId?: number): ContentImageRecord {
    const now = nowIso();
    return database
      .insert(contentImages)
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

  findById(database: DbClient, id: string): ContentImageRecord | undefined {
    return database.select().from(contentImages).where(eq(contentImages.id, id)).get();
  }
};
