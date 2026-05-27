import cron from "node-cron";
import type { FastifyInstance } from "fastify";
import { config, type AppConfig } from "../config.js";
import { sendPendingEmailNotifications } from "./notification.service.js";
import { sendPendingPushNotifications } from "./push-notification.service.js";

export function startNotificationScheduler(app: FastifyInstance, appConfig: AppConfig = config): void {
  if (!appConfig.notificationsEnabled) {
    return;
  }
  if (!cron.validate(appConfig.notificationCron)) {
    app.log.error({ cron: appConfig.notificationCron }, "Notification cron expression is invalid");
    return;
  }

  let running = false;
  const task = cron.schedule(appConfig.notificationCron, () => {
    if (running) {
      return;
    }
    running = true;
    void Promise.all([
      sendPendingEmailNotifications(app.db, appConfig, { logger: app.log }),
      sendPendingPushNotifications(app.db, appConfig, { logger: app.log })
    ]).finally(() => {
      running = false;
    });
  });

  app.addHook("onClose", async () => {
    task.stop();
  });
}
