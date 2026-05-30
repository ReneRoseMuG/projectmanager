import { and, desc, eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow, insertId, mutationAffectedRows } from "../db/query-utils.js";
import { pushSubscriptions } from "../db/schema.js";

export type PushSubscriptionRecord = typeof pushSubscriptions.$inferSelect;

export interface PushSubscriptionData {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const pushSubscriptionRepository = {
  async upsert(database: DbSession, data: PushSubscriptionData): Promise<PushSubscriptionRecord> {
    const existing = firstRow(await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint)));
    const now = nowIso();
    if (existing) {
      await database
        .update(pushSubscriptions)
        .set({
          userId: data.userId,
          p256dh: data.p256dh,
          auth: data.auth,
          updatedAt: now
        })
        .where(eq(pushSubscriptions.id, existing.id));
      const updated = firstRow(await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, existing.id)));
      if (!updated) {
        throw new Error("Updated push subscription could not be loaded");
      }
      return updated;
    }
    const result = await database
      .insert(pushSubscriptions)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now
      });
    const created = firstRow(await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, insertId(result))));
    if (!created) {
      throw new Error("Created push subscription could not be loaded");
    }
    return created;
  },

  async deleteForUser(database: DbSession, userId: number, endpoint: string): Promise<number> {
    return mutationAffectedRows(await database
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint))));
  },

  async deleteByEndpoint(database: DbSession, endpoint: string): Promise<number> {
    return mutationAffectedRows(await database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)));
  },

  async findByUser(database: DbSession, userId: number): Promise<PushSubscriptionRecord[]> {
    return database.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).orderBy(desc(pushSubscriptions.updatedAt));
  }
};

