import { and, desc, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
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
  upsert(database: DbClient, data: PushSubscriptionData): PushSubscriptionRecord {
    const existing = database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint)).get();
    const now = nowIso();
    if (existing) {
      return database
        .update(pushSubscriptions)
        .set({
          userId: data.userId,
          p256dh: data.p256dh,
          auth: data.auth,
          updatedAt: now
        })
        .where(eq(pushSubscriptions.id, existing.id))
        .returning()
        .get();
    }
    return database
      .insert(pushSubscriptions)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now
      })
      .returning()
      .get();
  },

  deleteForUser(database: DbClient, userId: number, endpoint: string): number {
    return database
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .run().changes;
  },

  deleteByEndpoint(database: DbClient, endpoint: string): number {
    return database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run().changes;
  },

  findByUser(database: DbClient, userId: number): PushSubscriptionRecord[] {
    return database.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).orderBy(desc(pushSubscriptions.updatedAt)).all();
  }
};
