import Fastify, { type FastifyInstance } from "fastify";
import { db } from "./db/client.js";
import { registerCors } from "./plugins/cors.js";
import { registerAuthPlugins, registerGlobalAuthGuard } from "./plugins/auth.js";
import { registerMultipart } from "./plugins/multipart.js";
import { registerRealtimePublisher } from "./plugins/realtime.js";
import { registerStatic } from "./plugins/static.js";
import { registerAdminRoleRoutes } from "./routes/admin-roles.js";
import { registerAdminUserRoutes } from "./routes/admin-users.js";
import { registerAttachmentsRoutes } from "./routes/attachments.js";
import { registerDmsRoutes } from "./routes/dms.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerBacklogRoutes } from "./routes/backlog.js";
import { registerCalendarConnectionRoutes } from "./routes/calendar-connections.js";
import { registerCommentsRoutes } from "./routes/comments.js";
import { registerContentImageRoutes } from "./routes/content-images.js";
import { registerCatalogRoutes } from "./routes/catalogs.js";
import { registerDayPlanRoutes } from "./routes/day-plans.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerDocLinksRoutes } from "./routes/doc-links.js";
import { registerEventsRoutes } from "./routes/events.js";
import { registerFeaturesRoutes } from "./routes/features.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerImportsRoutes } from "./routes/imports.js";
import { registerJournalRoutes } from "./routes/journal.js";
import { registerMilestoneRoutes } from "./routes/milestones.js";
import { registerNotesRoutes } from "./routes/notes.js";
import { registerProjectsRoutes } from "./routes/projects.js";
import { registerPushRoutes } from "./routes/push.js";
import { registerRealtimeRoutes } from "./routes/realtime.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerSubtasksRoutes } from "./routes/subtasks.js";
import { registerTagsRoutes } from "./routes/tags.js";
import { registerTasksRoutes } from "./routes/tasks.js";
import { registerTicketsRoutes } from "./routes/tickets.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerUseCasesRoutes } from "./routes/use-cases.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { registerDiaryRoutes } from "./routes/diary.js";
import { config } from "./config.js";
import { openFileWithDefaultApp } from "./services/file-opener.service.js";
import { stopAllAttachmentWatchers } from "./services/attachment-watcher.service.js";
import { createRealtimeEventBus } from "./services/realtime-event-bus.service.js";
import { assertSafeTestRuntimeTargets } from "./runtime-safety.js";
import { seedAuthData } from "./services/auth.service.js";
import { seedDefaultCatalogEntries } from "./services/catalogs.service.js";
import { errorHandler } from "./utils/errors.js";

export async function buildApp(
  injectedDb: typeof db = db
): Promise<FastifyInstance> {
  assertSafeTestRuntimeTargets(config);

  const app = Fastify({ logger: true });

  app.decorate("db", injectedDb);
  app.decorate("fileOpener", openFileWithDefaultApp);
  app.decorate("realtimeBus", createRealtimeEventBus());
  app.setErrorHandler(errorHandler);
  app.addHook("onClose", async () => {
    stopAllAttachmentWatchers();
  });

  await registerCors(app);
  await registerAuthPlugins(app);
  await registerMultipart(app);
  await registerStatic(app);
  await registerRealtimePublisher(app);
  await seedAuthData(injectedDb);
  await seedDefaultCatalogEntries(injectedDb);

  app.get("/health", async () => ({ ok: true }));

  await app.register(registerAuthRoutes, { prefix: "/api" });
  await app.register(registerHealthRoutes, { prefix: "/api" });
  registerGlobalAuthGuard(app);
  await app.register(registerAdminUserRoutes, { prefix: "/api" });
  await app.register(registerAdminRoleRoutes, { prefix: "/api" });
  await app.register(registerRealtimeRoutes, { prefix: "/api" });
  await app.register(registerProjectsRoutes, { prefix: "/api" });
  await app.register(registerMilestoneRoutes, { prefix: "/api" });
  await app.register(registerTasksRoutes, { prefix: "/api" });
  await app.register(registerSubtasksRoutes, { prefix: "/api" });
  await app.register(registerTicketsRoutes, { prefix: "/api" });
  await app.register(registerUserRoutes, { prefix: "/api" });
  await app.register(registerCommentsRoutes, { prefix: "/api" });
  await app.register(registerCatalogRoutes, { prefix: "/api" });
  await app.register(registerTagsRoutes, { prefix: "/api" });
  await app.register(registerSettingsRoutes, { prefix: "/api" });
  await app.register(registerDashboardRoutes, { prefix: "/api" });
  await app.register(registerDayPlanRoutes, { prefix: "/api" });
  await app.register(registerNotesRoutes, { prefix: "/api" });
  await app.register(registerContentImageRoutes, { prefix: "/api" });
  await app.register(registerAttachmentsRoutes, { prefix: "/api" });
  await app.register(registerDmsRoutes, { prefix: "/api" });
  await app.register(registerEventsRoutes, { prefix: "/api" });
  await app.register(registerCalendarConnectionRoutes, { prefix: "/api" });
  await app.register(registerPushRoutes, { prefix: "/api" });
  await app.register(registerFeaturesRoutes, { prefix: "/api" });
  await app.register(registerUseCasesRoutes, { prefix: "/api" });
  await app.register(registerWikiRoutes, { prefix: "/api" });
  await app.register(registerDiaryRoutes, { prefix: "/api" });
  await app.register(registerBacklogRoutes, { prefix: "/api" });
  await app.register(registerDocLinksRoutes, { prefix: "/api" });
  await app.register(registerImportsRoutes, { prefix: "/api" });
  await app.register(registerJournalRoutes, { prefix: "/api" });

  return app;
}
