/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte SQLite-Testdatenbank, echte Rollen und Sessions.
 *
 * Mock-Entscheidung:
 * - Nur externe Versandkanäle werden ersetzt: SMTP-Transport und Web-Push-Sender.
 *
 * Isolation:
 * - Temp-DB über createTestDb und truncateAll; keine produktiven Daten oder Uploads.
 *
 * Abgedeckte Regeln:
 * - Termin-Erinnerungen werden pro Nutzer, Termin, Kanal und Vorlauf genau einmal versendet.
 * - Reine Leser dürfen eigene Push-Subscriptions verwalten.
 * - Ungültige Push-Subscriptions werden bei 410 Gone gelöscht.
 *
 * Fehlerfälle:
 * - Deaktivierte Kanäle senden nicht, anonyme Requests erhalten 401, Rollen ohne notifications:write erhalten 403.
 *
 * Ziel:
 * MS-14 gegen Versandduplikate, Berechtigungsfehler und kaputte Push-Subscriptions absichern.
 */

import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import supertest from "supertest";
import webpush from "web-push";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { config, type AppConfig } from "../../../apps/api/src/config.js";
import { sendPendingEmailNotifications } from "../../../apps/api/src/services/notification.service.js";
import { sendPendingPushNotifications } from "../../../apps/api/src/services/push-notification.service.js";
import { buildTestApp, createEvent, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const password = "password123";

function notificationConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const keys = webpush.generateVAPIDKeys();
  return {
    ...config,
    notificationsEnabled: true,
    notificationCron: "* * * * *",
    smtpEnabled: true,
    smtpHost: "smtp.example.test",
    smtpPort: 587,
    smtpUser: "smtp-user",
    smtpPassword: "smtp-password",
    smtpFrom: "admin@example.test",
    webPushEnabled: true,
    vapidPublicKey: keys.publicKey,
    vapidPrivateKey: keys.privateKey,
    vapidSubject: "mailto:admin@example.test",
    ...overrides
  };
}

function roleId(key: string, testDb: TestDb): number {
  const row = testDb.sqlite.prepare("SELECT id FROM roles WHERE key = ?").get(key) as { id: number } | undefined;
  if (!row) {
    throw new Error(`Role ${key} not found`);
  }
  return row.id;
}

function createUser(testDb: TestDb, data: { email: string; roleKey: string; firstName?: string; lastName?: string }): number {
  const hash = bcrypt.hashSync(password, 4);
  const result = testDb.sqlite
    .prepare(
      "INSERT INTO users (name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES ('', ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))"
    )
    .run(data.firstName ?? "Test", data.lastName ?? "User", data.email, hash, roleId(data.roleKey, testDb));
  return Number(result.lastInsertRowid);
}

function createRoleWithoutNotificationWrite(testDb: TestDb): number {
  const result = testDb.sqlite
    .prepare("INSERT INTO roles (key, label, is_system, version, created_at, updated_at) VALUES ('custom_reader', 'Custom Reader', 0, 1, datetime('now'), datetime('now'))")
    .run();
  const id = Number(result.lastInsertRowid);
  testDb.sqlite.prepare("INSERT INTO permissions (role_id, resource, action) VALUES (?, '*', 'read')").run(id);
  return id;
}

async function login(app: FastifyInstance, email: string) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}

describe("MS-14 notifications", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  it("versendet fällige E-Mail-Erinnerungen genau einmal pro berechtigtem aktivem Nutzer", async () => {
    createUser(testDb, { email: "reader@example.test", roleKey: "reader", firstName: "Rita", lastName: "Reader" });
    await createEvent(app, {
      title: "Kundentermin",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      reminderMinutes: 60
    });
    const transport = { sendMail: vi.fn().mockResolvedValue({ messageId: "ok" }) };

    await sendPendingEmailNotifications(testDb.db, notificationConfig(), {
      now: new Date("2026-06-01T09:00:00.000Z"),
      transport
    });
    await sendPendingEmailNotifications(testDb.db, notificationConfig(), {
      now: new Date("2026-06-01T09:00:30.000Z"),
      transport
    });

    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    const rows = testDb.sqlite.prepare("SELECT channel, reminder_minutes FROM sent_notifications ORDER BY user_id").all() as Array<{ channel: string; reminder_minutes: number }>;
    expect(rows).toEqual([
      { channel: "email", reminder_minutes: 60 },
      { channel: "email", reminder_minutes: 60 }
    ]);
  });

  it("sendet keine E-Mail, wenn Notifications oder SMTP deaktiviert sind", async () => {
    await createEvent(app, {
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      reminderMinutes: 60
    });
    const transport = { sendMail: vi.fn().mockResolvedValue({}) };

    await sendPendingEmailNotifications(testDb.db, notificationConfig({ notificationsEnabled: false }), {
      now: new Date("2026-06-01T09:00:00.000Z"),
      transport
    });
    await sendPendingEmailNotifications(testDb.db, notificationConfig({ smtpEnabled: false }), {
      now: new Date("2026-06-01T09:00:00.000Z"),
      transport
    });

    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("versendet Push-Erinnerungen und löscht ungültige Subscriptions bei 410 Gone", async () => {
    const readerId = createUser(testDb, { email: "push-reader@example.test", roleKey: "reader" });
    const goneReaderId = createUser(testDb, { email: "gone-reader@example.test", roleKey: "reader" });
    await createEvent(app, {
      title: "Push Termin",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      reminderMinutes: 60
    });
    testDb.sqlite
      .prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, 'key', 'auth', datetime('now'), datetime('now'))")
      .run(readerId, "https://push.example.test/ok");
    testDb.sqlite
      .prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, 'key', 'auth', datetime('now'), datetime('now'))")
      .run(goneReaderId, "https://push.example.test/gone");
    const sendNotification = vi.fn().mockImplementation((subscription: { endpoint: string }) => {
      if (subscription.endpoint.endsWith("/gone")) {
        return Promise.reject({ statusCode: 410 });
      }
      return Promise.resolve({});
    });

    await sendPendingPushNotifications(testDb.db, notificationConfig(), {
      now: new Date("2026-06-01T09:00:00.000Z"),
      sendNotification
    });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    expect(testDb.sqlite.prepare("SELECT COUNT(*) AS count FROM sent_notifications WHERE channel = 'push'").get()).toEqual({ count: 1 });
    expect(testDb.sqlite.prepare("SELECT COUNT(*) AS count FROM push_subscriptions WHERE endpoint LIKE '%gone'").get()).toEqual({ count: 0 });
  });

  it("schützt Push-Routen und erlaubt Lesern eigene Subscriptions", async () => {
    const readerId = createUser(testDb, { email: "route-reader@example.test", roleKey: "reader" });
    const customRoleId = createRoleWithoutNotificationWrite(testDb);
    testDb.sqlite
      .prepare(
        "INSERT INTO users (name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES ('', 'No', 'Write', 'no-write@example.test', ?, ?, 1, 1, datetime('now'), datetime('now'))"
      )
      .run(bcrypt.hashSync(password, 4), customRoleId);

    await supertest(app.server).post("/api/push/subscribe").send({ endpoint: "https://push.example.test/anon", keys: { p256dh: "key", auth: "auth" } }).expect(401);

    const reader = await login(app, "route-reader@example.test");
    await reader.post("/api/push/subscribe").send({ endpoint: "https://push.example.test/reader", keys: { p256dh: "key", auth: "auth" } }).expect(200);
    expect(testDb.sqlite.prepare("SELECT user_id FROM push_subscriptions WHERE endpoint = ?").get("https://push.example.test/reader")).toEqual({ user_id: readerId });

    const noWrite = await login(app, "no-write@example.test");
    await noWrite.post("/api/push/subscribe").send({ endpoint: "https://push.example.test/no-write", keys: { p256dh: "key", auth: "auth" } }).expect(403);
  });
});
