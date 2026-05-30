import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startNotificationScheduler } from "./services/notification-scheduler.service.js";

const app = await buildApp();
startNotificationScheduler(app, config);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
