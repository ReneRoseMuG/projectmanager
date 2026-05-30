import { eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { contentImages } from "../db/schema.js";

export type ContentImageRecord = typeof contentImages.$inferSelect;
export type ContentImageCreateData = Omit<typeof contentImages.$inferInsert, "version" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;

function nowIso(): string {
  return new Date().toISOString();
}

export const contentImageRepository = {
  async create(database: DbSession, data: ContentImageCreateData, userId?: number): Promise<ContentImageRecord> {
    const now = nowIso();
    await database
      .insert(contentImages)
      .values({
        ...data,
        version: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
        createdAt: now,
        updatedAt: now
      });
    const created = await this.findById(database, data.id);
    if (!created) {
      throw new Error("Created content image could not be loaded");
    }
    return created;
  },

  async findById(database: DbSession, id: string): Promise<ContentImageRecord | undefined> {
    return firstRow(await database.select().from(contentImages).where(eq(contentImages.id, id)));
  }
};

