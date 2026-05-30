import { and, eq } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { sentNotifications } from "../db/schema.js";

export type NotificationChannel = "email" | "push";

export const notificationRepository = {
  async wasSent(database: DbSession, data: { eventId: number; userId: number; channel: NotificationChannel; reminderMinutes: number }): Promise<boolean> {
    const row = firstRow(await database
      .select({ id: sentNotifications.id })
      .from(sentNotifications)
      .where(
        and(
          eq(sentNotifications.eventId, data.eventId),
          eq(sentNotifications.userId, data.userId),
          eq(sentNotifications.channel, data.channel),
          eq(sentNotifications.reminderMinutes, data.reminderMinutes)
        )
      ));
    return Boolean(row);
  },

  async recordSent(database: DbSession, data: { eventId: number; userId: number; channel: NotificationChannel; reminderMinutes: number; sentAt: string }): Promise<void> {
    await database.insert(sentNotifications).ignore().values(data);
  }
};

