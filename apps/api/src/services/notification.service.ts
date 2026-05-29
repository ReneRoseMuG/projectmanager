import type { Role } from "@taskmanager/shared-types";
import { gte } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../config.js";
import type { DbClient } from "../db/client.js";
import { events } from "../db/schema.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository, type UserRecord } from "../repositories/user.repository.js";
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

async function roleForUser(database: DbClient, user: UserRecord): Promise<Role | null> {
  const role = await roleRepository.findById(database, user.roleId);
  if (!role) {
    return null;
  }
  return mapRole(role, await roleRepository.findPermissionsByRoleId(database, role.id));
}

export async function listNotificationRecipients(database: DbClient): Promise<NotificationRecipient[]> {
  const users = await userRepository.findActive(database);
  const result: NotificationRecipient[] = [];
  for (const user of users) {
    const role = await roleForUser(database, user);
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

  for (const event of dueEvents) {
    for (const recipient of recipients) {
      if (await notificationRepository.wasSent(database, { eventId: event.id, userId: recipient.id, channel: "email", reminderMinutes: event.reminderMinutes })) {
        continue;
      }
      try {
        await transport.sendMail({
          from: appConfig.smtpFrom,
          to: recipient.email,
          subject: emailSubject(event),
          text: emailText(event)
        });
        await notificationRepository.recordSent(database, {
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
}
