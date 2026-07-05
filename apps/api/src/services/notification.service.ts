import type { Role } from "@taskmanager/shared-types";
import { gte, inArray } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../config.js";
import type { DbClient } from "../db/client.js";
import { events, roles } from "../db/schema.js";
import { notificationRepository, sentNotificationKey } from "../repositories/notification.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { hasPermission, mapRole } from "./roles.service.js";

export interface NotificationLogger {
  error: (payload: unknown, message?: string) => void;
  warn?: (payload: unknown, message?: string) => void;
}

export interface NotificationEvent {
  id: number;
  title: string;
  startTime: string;
  reminderMinutes: number;
}

export interface NotificationRecipient {
  id: number;
  email: string;
}

interface EmailNotificationOptions {
  now?: Date;
  logger?: NotificationLogger;
  transport?: Pick<Transporter, "sendMail">;
}

function nowIso(now: Date): string {
  return now.toISOString();
}

export async function listNotificationRecipients(database: DbClient): Promise<NotificationRecipient[]> {
  const users = await userRepository.findActive(database);
  if (users.length === 0) {
    return [];
  }
  // Rollen + Permissions der aktiven User gebündelt laden (2 Queries statt 2 pro User).
  // Zuordnung im Speicher — identische Auswahl wie zuvor über roleForUser + hasPermission.
  const roleIds = [...new Set(users.map((user) => user.roleId))];
  const roleRecords = await database.select().from(roles).where(inArray(roles.id, roleIds));
  const permissionRecords = await roleRepository.findPermissionsByRoleIds(database, roleIds);
  const roleMap = new Map<number, Role>();
  for (const roleRecord of roleRecords) {
    roleMap.set(roleRecord.id, mapRole(roleRecord, permissionRecords));
  }
  const result: NotificationRecipient[] = [];
  for (const user of users) {
    // Fehlende Rolle == zuvor null aus roleForUser: User wird ausgelassen.
    const role = roleMap.get(user.roleId);
    if (role && hasPermission(role, "events", "read")) {
      result.push({ id: user.id, email: user.email });
    }
  }
  return result;
}

export async function listDueNotificationEvents(database: DbClient, now: Date = new Date()): Promise<NotificationEvent[]> {
  const rows = await database
    .select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      reminderMinutes: events.reminderMinutes
    })
    .from(events)
    .where(gte(events.startTime, nowIso(now)));
  return rows.filter((event) => {
    const startTime = new Date(event.startTime).getTime();
    if (!Number.isFinite(startTime)) {
      return false;
    }
    const reminderAt = startTime - event.reminderMinutes * 60 * 1000;
    return reminderAt <= now.getTime() && startTime >= now.getTime();
  });
}

function createEmailTransport(appConfig: AppConfig): Transporter {
  return nodemailer.createTransport({
    host: appConfig.smtpHost,
    port: appConfig.smtpPort,
    secure: appConfig.smtpPort === 465,
    auth: appConfig.smtpUser ? { user: appConfig.smtpUser, pass: appConfig.smtpPassword } : undefined
  });
}

function emailSubject(event: NotificationEvent): string {
  return `Termin in ${event.reminderMinutes} Minuten: ${event.title}`;
}

function emailText(event: NotificationEvent): string {
  return [`Der Termin "${event.title}" beginnt am ${event.startTime}.`, "", `Erinnerungsvorlauf: ${event.reminderMinutes} Minuten.`].join("\n");
}

export async function sendPendingEmailNotifications(database: DbClient, appConfig: AppConfig, options: EmailNotificationOptions = {}): Promise<void> {
  if (!appConfig.notificationsEnabled || !appConfig.smtpEnabled) {
    return;
  }
  if (!appConfig.smtpHost || !appConfig.smtpFrom) {
    options.logger?.error({ channel: "email" }, "SMTP notification config is incomplete");
    return;
  }

  const transport = options.transport ?? createEmailTransport(appConfig);
  const now = options.now ?? new Date();
  const dueEvents = await listDueNotificationEvents(database, now);
  const recipients = await listNotificationRecipients(database);
  if (dueEvents.length === 0 || recipients.length === 0) {
    return;
  }

  // Pro Tick EINMAL alle bereits gesendeten (event,user,channel,reminder)-Kombinationen laden
  // statt wasSent pro Kombination. Prüfung im Speicher — identische "bereits gesendet"-Logik.
  const sentKeys = await notificationRepository.findSentKeys(database, {
    eventIds: dueEvents.map((event) => event.id),
    userIds: recipients.map((recipient) => recipient.id),
    channel: "email"
  });
  // Neue "gesendet"-Einträge sammeln und am Ende als Batch-Insert schreiben.
  const recorded: Array<{ eventId: number; userId: number; channel: "email"; reminderMinutes: number; sentAt: string }> = [];

  for (const event of dueEvents) {
    for (const recipient of recipients) {
      const key = sentNotificationKey({ eventId: event.id, userId: recipient.id, channel: "email", reminderMinutes: event.reminderMinutes });
      if (sentKeys.has(key)) {
        continue;
      }
      try {
        await transport.sendMail({
          from: appConfig.smtpFrom,
          to: recipient.email,
          subject: emailSubject(event),
          text: emailText(event)
        });
        // Innerhalb desselben Ticks Doppelversand vermeiden, falls dieselbe Kombination erneut auftritt.
        sentKeys.add(key);
        recorded.push({
          eventId: event.id,
          userId: recipient.id,
          channel: "email",
          reminderMinutes: event.reminderMinutes,
          sentAt: nowIso(now)
        });
      } catch (error) {
        options.logger?.error({ error, channel: "email", eventId: event.id, userId: recipient.id }, "Email notification failed");
      }
    }
  }

  await notificationRepository.recordSentMany(database, recorded);
}
