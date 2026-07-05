import type { PushSubscriptionInput, PushSubscriptionStatus, PushVapidKeyResponse } from "@taskmanager/shared-types";
import webpush from "web-push";
import type { AppConfig } from "../config.js";
import type { DbClient } from "../db/client.js";
import { notificationRepository, sentNotificationKey } from "../repositories/notification.repository.js";
import { pushSubscriptionRepository, type PushSubscriptionRecord } from "../repositories/push-subscription.repository.js";
import { badRequest } from "../utils/errors.js";
import { listDueNotificationEvents, listNotificationRecipients, type NotificationLogger } from "./notification.service.js";

interface PushNotificationOptions {
  now?: Date;
  logger?: NotificationLogger;
  sendNotification?: (subscription: webpush.PushSubscription, payload: string) => Promise<unknown>;
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function normalizeSubscription(input: PushSubscriptionInput): PushSubscriptionInput {
  const endpoint = input.endpoint.trim();
  const p256dh = input.keys.p256dh.trim();
  const auth = input.keys.auth.trim();
  if (!endpoint || !p256dh || !auth) {
    throw badRequest("Push subscription is incomplete");
  }
  return { endpoint, keys: { p256dh, auth } };
}

function mapWebPushSubscription(record: PushSubscriptionRecord): webpush.PushSubscription {
  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth
    }
  };
}

function subscriptionStatus(records: PushSubscriptionRecord[]): PushSubscriptionStatus {
  return {
    subscribed: records.length > 0,
    endpoint: records[0]?.endpoint ?? null
  };
}

function isGoneError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "statusCode" in error && (error as { statusCode?: unknown }).statusCode === 410;
}

function configureWebPush(appConfig: AppConfig): boolean {
  if (!appConfig.webPushEnabled || !appConfig.vapidPublicKey || !appConfig.vapidPrivateKey || !appConfig.vapidSubject) {
    return false;
  }
  webpush.setVapidDetails(appConfig.vapidSubject, appConfig.vapidPublicKey, appConfig.vapidPrivateKey);
  return true;
}

function pushPayload(event: { id: number; title: string; reminderMinutes: number }): string {
  return JSON.stringify({
    title: `Termin in ${event.reminderMinutes} Minuten`,
    body: event.title,
    url: `/calendar?eventId=${event.id}`
  });
}

export function getPushVapidKey(appConfig: AppConfig): PushVapidKeyResponse {
  return {
    publicKey: appConfig.vapidPublicKey,
    enabled: Boolean(appConfig.webPushEnabled && appConfig.vapidPublicKey)
  };
}

export async function subscribeToPushNotifications(database: DbClient, userId: number, input: PushSubscriptionInput): Promise<PushSubscriptionStatus> {
  const normalized = normalizeSubscription(input);
  await pushSubscriptionRepository.upsert(database, {
    userId,
    endpoint: normalized.endpoint,
    p256dh: normalized.keys.p256dh,
    auth: normalized.keys.auth
  });
  return getPushSubscriptionStatus(database, userId);
}

export async function unsubscribeFromPushNotifications(database: DbClient, userId: number, endpoint: string): Promise<PushSubscriptionStatus> {
  const normalizedEndpoint = endpoint.trim();
  if (!normalizedEndpoint) {
    throw badRequest("endpoint is required");
  }
  await pushSubscriptionRepository.deleteForUser(database, userId, normalizedEndpoint);
  return getPushSubscriptionStatus(database, userId);
}

export async function getPushSubscriptionStatus(database: DbClient, userId: number): Promise<PushSubscriptionStatus> {
  return subscriptionStatus(await pushSubscriptionRepository.findByUser(database, userId));
}

export async function sendPendingPushNotifications(database: DbClient, appConfig: AppConfig, options: PushNotificationOptions = {}): Promise<void> {
  if (!appConfig.notificationsEnabled || !configureWebPush(appConfig)) {
    return;
  }

  const sendNotification = options.sendNotification ?? webpush.sendNotification;
  const now = options.now ?? new Date();
  const dueEvents = await listDueNotificationEvents(database, now);
  const recipients = await listNotificationRecipients(database);
  if (dueEvents.length === 0 || recipients.length === 0) {
    return;
  }

  // Pro Tick EINMAL alle bereits gesendeten Push-Kombinationen laden statt wasSent pro Kombination.
  const sentKeys = await notificationRepository.findSentKeys(database, {
    eventIds: dueEvents.map((event) => event.id),
    userIds: recipients.map((recipient) => recipient.id),
    channel: "push"
  });
  // Push-Subscriptions pro Tick EINMAL für alle Empfänger laden (findByUsers statt findByUser je Iteration).
  // Die Subscription hängt nicht vom Event ab — Reihenfolge pro User identisch zu findByUser.
  const subscriptionsByUser = await pushSubscriptionRepository.findByUsers(database, recipients.map((recipient) => recipient.id));
  // Neue "gesendet"-Einträge sammeln und am Ende als Batch-Insert schreiben.
  const recorded: Array<{ eventId: number; userId: number; channel: "push"; reminderMinutes: number; sentAt: string }> = [];

  for (const event of dueEvents) {
    for (const recipient of recipients) {
      const key = sentNotificationKey({ eventId: event.id, userId: recipient.id, channel: "push", reminderMinutes: event.reminderMinutes });
      if (sentKeys.has(key)) {
        continue;
      }
      const subscriptions = subscriptionsByUser.get(recipient.id) ?? [];
      if (subscriptions.length === 0) {
        continue;
      }

      let delivered = false;
      for (const subscription of subscriptions) {
        try {
          await sendNotification(mapWebPushSubscription(subscription), pushPayload(event));
          delivered = true;
        } catch (error) {
          if (isGoneError(error)) {
            await pushSubscriptionRepository.deleteByEndpoint(database, subscription.endpoint);
            continue;
          }
          options.logger?.error({ error, channel: "push", eventId: event.id, userId: recipient.id }, "Push notification failed");
        }
      }

      if (delivered) {
        // Innerhalb desselben Ticks Doppelversand vermeiden, falls dieselbe Kombination erneut auftritt.
        sentKeys.add(key);
        recorded.push({
          eventId: event.id,
          userId: recipient.id,
          channel: "push",
          reminderMinutes: event.reminderMinutes,
          sentAt: nowIso(now)
        });
      }
    }
  }

  await notificationRepository.recordSentMany(database, recorded);
}
