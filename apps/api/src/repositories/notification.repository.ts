import { and, eq } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { sentNotifications } from "../db/schema.js";

export type NotificationChannel = "email" | "push";

export const notificationRepository = {
  wasSent(database: DbClient, data: { eventId: number; userId: number; channel: NotificationChannel; reminderMinutes: number }): boolean {
    const row = database
      .select({ id: sentNotifications.id })
      .from(sentNotifications)
      .where(
        and(
          eq(sentNotifications.eventId, data.eventId),
          eq(sentNotifications.userId, data.userId),
          eq(sentNotifications.channel, data.channel),
          eq(sentNotifications.reminderMinutes, data.reminderMinutes)
        )
      )
      .get();
    return Boolean(row);
  },

  recordSent(database: DbClient, data: { eventId: number; userId: number; channel: NotificationChannel; reminderMinutes: number; sentAt: string }): void {
    database.insert(sentNotifications).values(data).onConflictDoNothing().run();
  }
};
