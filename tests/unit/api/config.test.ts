import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - API-Key- und Benachrichtigungskonfiguration werden aus der Umgebung gelesen.
 *
 * Fehlerfälle:
 * - Leere API-Key-Werte deaktivieren API-Key-Auth.
 *
 * Ziel:
 * Die Konfigurationswerte bleiben stabil und getrimmt, ohne produktive Umgebungswerte im Test zu verändern.
 */

const trackedEnvKeys = [
  "API_KEY",
  "NOTIFICATIONS_ENABLED",
  "NOTIFICATION_CRON",
  "SMTP_ENABLED",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "WEB_PUSH_ENABLED",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT"
] as const;
const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<(typeof trackedEnvKeys)[number], string | undefined>;

afterEach(() => {
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  vi.resetModules();
});

async function loadConfigWithEnv(values: Partial<Record<(typeof trackedEnvKeys)[number], string | undefined>>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return import("../../../apps/api/src/config.js");
}

async function loadConfigWithApiKey(value: string | undefined) {
  return loadConfigWithEnv({ API_KEY: value });
}

describe("config api key", () => {
  it("deaktiviert API-Key-Auth ohne Secret oder bei leerem Secret", async () => {
    expect((await loadConfigWithApiKey(undefined)).config.apiKey).toBeNull();
    expect((await loadConfigWithApiKey("   ")).config.apiKey).toBeNull();
  });

  it("liest den API-Key getrimmt aus der Umgebung", async () => {
    expect((await loadConfigWithApiKey("  secret-api-key  ")).config.apiKey).toBe("secret-api-key");
  });
});

describe("config notifications", () => {
  it("liest Notification-, SMTP- und VAPID-Werte aus der Umgebung", async () => {
    const loaded = await loadConfigWithEnv({
      NOTIFICATIONS_ENABLED: "true",
      NOTIFICATION_CRON: "*/5 * * * *",
      SMTP_ENABLED: "1",
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "2525",
      SMTP_USER: "smtp-user",
      SMTP_PASSWORD: "smtp-password",
      SMTP_FROM: "sender@example.test",
      WEB_PUSH_ENABLED: "true",
      VAPID_PUBLIC_KEY: "public-key",
      VAPID_PRIVATE_KEY: "private-key",
      VAPID_SUBJECT: "mailto:push@example.test"
    });

    expect(loaded.config.notificationsEnabled).toBe(true);
    expect(loaded.config.notificationCron).toBe("*/5 * * * *");
    expect(loaded.config.smtpEnabled).toBe(true);
    expect(loaded.config.smtpHost).toBe("smtp.example.test");
    expect(loaded.config.smtpPort).toBe(2525);
    expect(loaded.config.smtpUser).toBe("smtp-user");
    expect(loaded.config.smtpPassword).toBe("smtp-password");
    expect(loaded.config.smtpFrom).toBe("sender@example.test");
    expect(loaded.config.webPushEnabled).toBe(true);
    expect(loaded.config.vapidPublicKey).toBe("public-key");
    expect(loaded.config.vapidPrivateKey).toBe("private-key");
    expect(loaded.config.vapidSubject).toBe("mailto:push@example.test");
  });
});
