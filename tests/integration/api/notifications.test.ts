/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte MySQL-Testdatenbank, echte Rollen und Sessions.
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

async function getRoleId(testDb: TestDb, key: string): Promise<number> {
  const [rows] = await testDb.pool.execute("SELECT id FROM roles WHERE `key` = ?", [key]);
  const row = (rows as Array<{ id: number }>)[0];
  if (!row) throw new Error(`Role ${key} not found`);
  return row.id;
}

async function createUser(testDb: TestDb, data: { email: string; roleKey: string; firstName?: string; lastName?: string }): Promise<number> {
  const hash = bcrypt.hashSync(password, 4);
  const rid = await getRoleId(testDb, data.roleKey);
  const firstName = data.firstName ?? "Test";
  const lastName = data.lastName ?? "User";
  const [result] = await testDb.pool.execute(
    "INSERT INTO users (name, full_name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES ('', ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())",
    [`${lastName}, ${firstName}`, firstName, lastName, data.email, hash, rid]
  );
  return (result as { insertId: number }).insertId;
}

async function createRoleWithoutNotificationWrite(testDb: TestDb): Promise<number> {
  const [result] = await testDb.pool.execute(
    "INSERT INTO roles (`key`, label, is_system, version, created_at, updated_at) VALUES ('custom_reader', 'Custom Reader', 0, 1, NOW(), NOW())"
  );
  const id = (result as { insertId: number }).insertId;
  await testDb.pool.execute("INSERT INTO permissions (role_id, resource, action) VALUES (?, '*', 'read')", [id]);
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
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("versendet fällige E-Mail-Erinnerungen genau einmal pro berechtigtem aktivem Nutzer", async () => {
    await createUser(testDb, { email: "reader@example.test", roleKey: "reader", firstName: "Rita", lastName: "Reader" });
    const admin = await login(app, "admin@local");
    await createEvent(admin, {
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
    const [notifRows] = await testDb.pool.execute("SELECT channel, reminder_minutes FROM sent_notifications ORDER BY user_id");
    expect(notifRows as Array<{ channel: string; reminder_minutes: number }>).toEqual([
      { channel: "email", reminder_minutes: 60 },
      { channel: "email", reminder_minutes: 60 }
    ]);
  });

  it("sendet keine E-Mail, wenn Notifications oder SMTP deaktiviert sind", async () => {
    const admin = await login(app, "admin@local");
    await createEvent(admin, {
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
    const readerId = await createUser(testDb, { email: "push-reader@example.test", roleKey: "reader" });
    const goneReaderId = await createUser(testDb, { email: "gone-reader@example.test", roleKey: "reader" });
    const admin = await login(app, "admin@local");
    await createEvent(admin, {
      title: "Push Termin",
      startTime: "2026-06-01T10:00:00.000Z",
      endTime: "2026-06-01T11:00:00.000Z",
      reminderMinutes: 60
    });
    await testDb.pool.execute(
      "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, 'key', 'auth', NOW(), NOW())",
      [readerId, "https://push.example.test/ok"]
    );
    await testDb.pool.execute(
      "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at) VALUES (?, ?, 'key', 'auth', NOW(), NOW())",
      [goneReaderId, "https://push.example.test/gone"]
    );
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
    const [pushCountRows] = await testDb.pool.execute("SELECT COUNT(*) AS count FROM sent_notifications WHERE channel = 'push'");
    expect(Number((pushCountRows as Array<{ count: bigint | number }>)[0].count)).toBe(1);
    const [goneCountRows] = await testDb.pool.execute("SELECT COUNT(*) AS count FROM push_subscriptions WHERE endpoint LIKE '%gone'");
    expect(Number((goneCountRows as Array<{ count: bigint | number }>)[0].count)).toBe(0);
  });

  it("schützt Push-Routen und erlaubt Lesern eigene Subscriptions", async () => {
    const readerId = await createUser(testDb, { email: "route-reader@example.test", roleKey: "reader" });
    const customRoleId = await createRoleWithoutNotificationWrite(testDb);
    await testDb.pool.execute(
      "INSERT INTO users (name, full_name, first_name, last_name, email, password_hash, role_id, is_active, version, created_at, updated_at) VALUES ('', 'Write, No', 'No', 'Write', 'no-write@example.test', ?, ?, 1, 1, NOW(), NOW())",
      [bcrypt.hashSync(password, 4), customRoleId]
    );

    await supertest(app.server).post("/api/push/subscribe").send({ endpoint: "https://push.example.test/anon", keys: { p256dh: "key", auth: "auth" } }).expect(401);

    const reader = await login(app, "route-reader@example.test");
    await reader.post("/api/push/subscribe").send({ endpoint: "https://push.example.test/reader", keys: { p256dh: "key", auth: "auth" } }).expect(200);
    const [subRows] = await testDb.pool.execute("SELECT user_id FROM push_subscriptions WHERE endpoint = ?", ["https://push.example.test/reader"]);
    expect((subRows as Array<{ user_id: number }>)[0]).toEqual({ user_id: readerId });

    const noWrite = await login(app, "no-write@example.test");
    await noWrite.post("/api/push/subscribe").send({ endpoint: "https://push.example.test/no-write", keys: { p256dh: "key", auth: "auth" } }).expect(403);
  });
});
