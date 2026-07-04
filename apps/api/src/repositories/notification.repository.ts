import { and, eq, inArray } from "drizzle-orm";
import type { DbSession } from "../db/client.js";
import { firstRow } from "../db/query-utils.js";
import { sentNotifications } from "../db/schema.js";

export type NotificationChannel = "email" | "push";

export interface SentNotificationKey {
  eventId: number;
  userId: number;
  channel: NotificationChannel;
  reminderMinutes: number;
}

// Kanonischer Schlüssel für die "bereits gesendet"-Zuordnung im Speicher.
// Identische Kombination wie der DB-Unique-Index (event, user, channel, reminder).
export function sentNotificationKey(data: SentNotificationKey): string {
  return `${data.eventId}:${data.userId}:${data.channel}:${data.reminderMinutes}`;
}

export const notificationRepository = {
  async wasSent(database: DbSession, data: SentNotificationKey): Promise<boolean> {
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

  // Lädt gebündelt alle bereits gesendeten Einträge für einen Kanal, eine Event-Menge
  // und eine User-Menge (inArray statt Query pro Kombination). Rückgabe als Set der
  // kanonischen Schlüssel — der Aufrufer prüft im Speicher wie zuvor `wasSent`.
  async findSentKeys(
    database: DbSession,
    filter: { eventIds: number[]; userIds: number[]; channel: NotificationChannel }
  ): Promise<Set<string>> {
    if (filter.eventIds.length === 0 || filter.userIds.length === 0) {
      return new Set();
    }
    const rows = await database
      .select({
        eventId: sentNotifications.eventId,
        userId: sentNotifications.userId,
        channel: sentNotifications.channel,
        reminderMinutes: sentNotifications.reminderMinutes
      })
      .from(sentNotifications)
      .where(
        and(
          inArray(sentNotifications.eventId, filter.eventIds),
          inArray(sentNotifications.userId, filter.userIds),
          eq(sentNotifications.channel, filter.channel)
        )
      );
    const keys = new Set<string>();
    for (const row of rows) {
      keys.add(sentNotificationKey({ ...row, channel: row.channel as NotificationChannel }));
    }
    return keys;
  },

  async recordSent(database: DbSession, data: SentNotificationKey & { sentAt: string }): Promise<void> {
    await database.insert(sentNotifications).ignore().values(data);
  },

  // Batch-Insert der gesendeten Einträge (ein Insert statt Insert pro Kombination).
  // `.ignore()` erhält den Doppelversand-Schutz über den Unique-Index bei.
  async recordSentMany(database: DbSession, rows: Array<SentNotificationKey & { sentAt: string }>): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await database.insert(sentNotifications).ignore().values(rows);
  }
};

