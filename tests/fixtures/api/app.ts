import Fastify from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { TestDb } from "./db.js";
import type { FileOpener } from "../../../apps/api/src/services/file-opener.service.js";
import { createRealtimeEventBus } from "../../../apps/api/src/services/realtime-event-bus.service.js";

interface BuildTestAppOptions {
  enableMultipart?: boolean;
  enableAuth?: boolean;
  fileOpener?: FileOpener;
}

const unavailableFileOpener: FileOpener = async () => {
  throw new Error("File opener test client is not configured");
};

export async function buildTestApp(testDb: TestDb, options: BuildTestAppOptions = {}) {
  const app = Fastify({ logger: false });
  const contentDir = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-api-content-"));
  const { setContentBaseDir } = await import("../../../apps/api/src/services/content.service.js");
  const { stopAllAttachmentWatchers } = await import("../../../apps/api/src/services/attachment-watcher.service.js");
  setContentBaseDir(contentDir);
  app.addHook("onClose", async () => {
    stopAllAttachmentWatchers();
    await fs.rm(contentDir, { recursive: true, force: true });
  });

  app.decorate("db", testDb.db);
  app.decorate("sqlite", testDb.sqlite);
  app.decorate("fileOpener", options.fileOpener ?? unavailableFileOpener);
  app.decorate("realtimeBus", createRealtimeEventBus());

  const { errorHandler } = await import("../../../apps/api/src/utils/errors.js");
  const { registerCors } = await import("../../../apps/api/src/plugins/cors.js");
  const { registerAuthPlugins, registerGlobalAuthGuard } = await import("../../../apps/api/src/plugins/auth.js");
  const { registerRealtimePublisher } = await import("../../../apps/api/src/plugins/realtime.js");
  const { seedAuthData } = await import("../../../apps/api/src/services/auth.service.js");
  const { registerAuthRoutes } = await import("../../../apps/api/src/routes/auth.js");
  const { registerAdminUserRoutes } = await import("../../../apps/api/src/routes/admin-users.js");
  const { registerAdminRoleRoutes } = await import("../../../apps/api/src/routes/admin-roles.js");
  const { registerRealtimeRoutes } = await import("../../../apps/api/src/routes/realtime.js");
  const { registerProjectsRoutes } = await import("../../../apps/api/src/routes/projects.js");
  const { registerMilestoneRoutes } = await import("../../../apps/api/src/routes/milestones.js");
  const { registerTasksRoutes } = await import("../../../apps/api/src/routes/tasks.js");
  const { registerSubtasksRoutes } = await import("../../../apps/api/src/routes/subtasks.js");
  const { registerCatalogRoutes } = await import("../../../apps/api/src/routes/catalogs.js");
  const { registerCommentsRoutes } = await import("../../../apps/api/src/routes/comments.js");
  const { registerDayPlanRoutes } = await import("../../../apps/api/src/routes/day-plans.js");
  const { registerDashboardRoutes } = await import("../../../apps/api/src/routes/dashboard.js");
  const { registerTagsRoutes } = await import("../../../apps/api/src/routes/tags.js");
  const { registerSettingsRoutes } = await import("../../../apps/api/src/routes/settings.js");
  const { registerNotesRoutes } = await import("../../../apps/api/src/routes/notes.js");
  const { registerTicketsRoutes } = await import("../../../apps/api/src/routes/tickets.js");
  const { registerUserRoutes } = await import("../../../apps/api/src/routes/users.js");
  const { registerMultipart } = await import("../../../apps/api/src/plugins/multipart.js");
  const { registerEventsRoutes } = await import("../../../apps/api/src/routes/events.js");
  const { registerPushRoutes } = await import("../../../apps/api/src/routes/push.js");
  const { registerFeaturesRoutes } = await import("../../../apps/api/src/routes/features.js");
  const { registerHealthRoutes } = await import("../../../apps/api/src/routes/health.js");
  const { registerUseCasesRoutes } = await import("../../../apps/api/src/routes/use-cases.js");
  const { registerWikiRoutes } = await import("../../../apps/api/src/routes/wiki.js");
  const { registerBacklogRoutes } = await import("../../../apps/api/src/routes/backlog.js");
  const { registerDocLinksRoutes } = await import("../../../apps/api/src/routes/doc-links.js");
  const { registerImportsRoutes } = await import("../../../apps/api/src/routes/imports.js");
  const { registerJournalRoutes } = await import("../../../apps/api/src/routes/journal.js");
  const { registerDumpRoutes } = await import("../../../apps/api/src/routes/dumps.js");

  app.setErrorHandler(errorHandler);
  await registerCors(app);
  if (options.enableAuth) {
    await registerAuthPlugins(app);
    await seedAuthData(testDb.db);
  }
  await registerRealtimePublisher(app);
  await registerMultipart(app);

  if (options.enableMultipart) {
    const { registerStatic } = await import("../../../apps/api/src/plugins/static.js");

    await registerStatic(app);
  }

  if (options.enableAuth) {
    await app.register(registerAuthRoutes, { prefix: "/api" });
    await app.register(registerHealthRoutes, { prefix: "/api" });
    registerGlobalAuthGuard(app);
    await app.register(registerAdminUserRoutes, { prefix: "/api" });
    await app.register(registerAdminRoleRoutes, { prefix: "/api" });
    await app.register(registerRealtimeRoutes, { prefix: "/api" });
  }

  await app.register(registerProjectsRoutes, { prefix: "/api" });
  await app.register(registerMilestoneRoutes, { prefix: "/api" });
  await app.register(registerTasksRoutes, { prefix: "/api" });
  await app.register(registerSubtasksRoutes, { prefix: "/api" });
  await app.register(registerCatalogRoutes, { prefix: "/api" });
  await app.register(registerCommentsRoutes, { prefix: "/api" });
  await app.register(registerDashboardRoutes, { prefix: "/api" });
  await app.register(registerDayPlanRoutes, { prefix: "/api" });
  await app.register(registerTagsRoutes, { prefix: "/api" });
  await app.register(registerSettingsRoutes, { prefix: "/api" });
  await app.register(registerNotesRoutes, { prefix: "/api" });
  if (options.enableMultipart) {
    const { registerAttachmentsRoutes } = await import("../../../apps/api/src/routes/attachments.js");
    await app.register(registerAttachmentsRoutes, { prefix: "/api" });
  }
  await app.register(registerTicketsRoutes, { prefix: "/api" });
  await app.register(registerUserRoutes, { prefix: "/api" });
  await app.register(registerEventsRoutes, { prefix: "/api" });
  await app.register(registerPushRoutes, { prefix: "/api" });
  if (!options.enableAuth) {
    await app.register(registerHealthRoutes, { prefix: "/api" });
  }
  await app.register(registerFeaturesRoutes, { prefix: "/api" });
  await app.register(registerUseCasesRoutes, { prefix: "/api" });
  await app.register(registerWikiRoutes, { prefix: "/api" });
  await app.register(registerBacklogRoutes, { prefix: "/api" });
  await app.register(registerDocLinksRoutes, { prefix: "/api" });
  await app.register(registerImportsRoutes, { prefix: "/api" });
  await app.register(registerJournalRoutes, { prefix: "/api" });
  await app.register(registerDumpRoutes, { prefix: "/api" });

  await app.ready();
  return app;
}
