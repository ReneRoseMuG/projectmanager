import Fastify from "fastify";
import type { TestDb } from "./db.js";
import type { GoogleDriveBackupClient } from "../../src/services/google-drive.service.js";

interface BuildTestAppOptions {
  enableMultipart?: boolean;
  driveClient?: GoogleDriveBackupClient;
}

const unavailableDriveClient: GoogleDriveBackupClient = {
  async listDumpFiles() {
    throw new Error("Google Drive test client is not configured");
  },
  async uploadDump() {
    throw new Error("Google Drive test client is not configured");
  },
  async downloadFile() {
    throw new Error("Google Drive test client is not configured");
  }
};

export async function buildTestApp(testDb: TestDb, options: BuildTestAppOptions = {}) {
  const app = Fastify({ logger: false });

  app.decorate("db", testDb.db);
  app.decorate("sqlite", testDb.sqlite);
  app.decorate("driveClient", options.driveClient ?? unavailableDriveClient);

  const { errorHandler } = await import("../../src/utils/errors.js");
  const { registerCors } = await import("../../src/plugins/cors.js");
  const { registerProjectsRoutes } = await import("../../src/routes/projects.js");
  const { registerTasksRoutes } = await import("../../src/routes/tasks.js");
  const { registerSubtasksRoutes } = await import("../../src/routes/subtasks.js");
  const { registerCommentsRoutes } = await import("../../src/routes/comments.js");
  const { registerTagsRoutes } = await import("../../src/routes/tags.js");
  const { registerNotesRoutes } = await import("../../src/routes/notes.js");
  const { registerEventsRoutes } = await import("../../src/routes/events.js");
  const { registerFeaturesRoutes } = await import("../../src/routes/features.js");
  const { registerHealthRoutes } = await import("../../src/routes/health.js");
  const { registerUseCasesRoutes } = await import("../../src/routes/use-cases.js");
  const { registerWikiRoutes } = await import("../../src/routes/wiki.js");
  const { registerBacklogRoutes } = await import("../../src/routes/backlog.js");
  const { registerDocLinksRoutes } = await import("../../src/routes/doc-links.js");
  const { registerImportsRoutes } = await import("../../src/routes/imports.js");
  const { registerDumpRoutes } = await import("../../src/routes/dumps.js");
  const { registerAdminSeedRunRoutes } = await import("../../src/routes/admin-seed-runs.js");

  app.setErrorHandler(errorHandler);
  await registerCors(app);

  if (options.enableMultipart) {
    const { registerMultipart } = await import("../../src/plugins/multipart.js");
    const { registerStatic } = await import("../../src/plugins/static.js");
    const { registerAttachmentsRoutes } = await import("../../src/routes/attachments.js");

    await registerMultipart(app);
    await registerStatic(app);
    await app.register(registerAttachmentsRoutes, { prefix: "/api" });
  }

  await app.register(registerProjectsRoutes, { prefix: "/api" });
  await app.register(registerTasksRoutes, { prefix: "/api" });
  await app.register(registerSubtasksRoutes, { prefix: "/api" });
  await app.register(registerCommentsRoutes, { prefix: "/api" });
  await app.register(registerTagsRoutes, { prefix: "/api" });
  await app.register(registerNotesRoutes, { prefix: "/api" });
  await app.register(registerEventsRoutes, { prefix: "/api" });
  await app.register(registerHealthRoutes, { prefix: "/api" });
  await app.register(registerFeaturesRoutes, { prefix: "/api" });
  await app.register(registerUseCasesRoutes, { prefix: "/api" });
  await app.register(registerWikiRoutes, { prefix: "/api" });
  await app.register(registerBacklogRoutes, { prefix: "/api" });
  await app.register(registerDocLinksRoutes, { prefix: "/api" });
  await app.register(registerImportsRoutes, { prefix: "/api" });
  await app.register(registerDumpRoutes, { prefix: "/api" });
  await app.register(registerAdminSeedRunRoutes, { prefix: "/api" });

  await app.ready();
  return app;
}
