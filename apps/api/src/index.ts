import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startNotificationScheduler } from "./services/notification-scheduler.service.js";

const app = await buildApp();

// Last-resort safety net: a dropped database connection or any other late async
// error must not take the whole API process down. The pool's own "error" handler
// (see db/client.ts) covers the common database case; these handlers log anything
// else and keep the server running instead of exiting on an otherwise-uncaught error.
process.on("unhandledRejection", (reason) => {
  app.log.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  app.log.error({ err }, "Uncaught exception");
});

startNotificationScheduler(app, config);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
