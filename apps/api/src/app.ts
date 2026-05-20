import Fastify, { type FastifyInstance } from "fastify";
import { db, sqlite } from "./db/client.js";
import { registerCors } from "./plugins/cors.js";
import { registerMultipart } from "./plugins/multipart.js";
import { registerStatic } from "./plugins/static.js";
import { registerAttachmentsRoutes } from "./routes/attachments.js";
import { registerAiRoutes } from "./routes/ai.js";
import { registerBacklogRoutes } from "./routes/backlog.js";
import { registerCommentsRoutes } from "./routes/comments.js";
import { registerCatalogRoutes } from "./routes/catalogs.js";
import { registerDocLinksRoutes } from "./routes/doc-links.js";
import { registerDumpRoutes } from "./routes/dumps.js";
import { registerEventsRoutes } from "./routes/events.js";
import { registerFeaturesRoutes } from "./routes/features.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerImportsRoutes } from "./routes/imports.js";
import { registerMilestoneRoutes } from "./routes/milestones.js";
import { registerNotesRoutes } from "./routes/notes.js";
import { registerProjectsRoutes } from "./routes/projects.js";
import { registerSubtasksRoutes } from "./routes/subtasks.js";
import { registerTagsRoutes } from "./routes/tags.js";
import { registerTasksRoutes } from "./routes/tasks.js";
import { registerTicketsRoutes } from "./routes/tickets.js";
import { registerUseCasesRoutes } from "./routes/use-cases.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { config } from "./config.js";
import { createGoogleDriveBackupClient, type GoogleDriveBackupClient } from "./services/google-drive.service.js";
import { createOllamaLocalModelClient, type AiLocalModelClient } from "./services/ai-ollama.service.js";
import { getEffectiveGoogleDriveBackupFolderId } from "./services/drive-config.service.js";
import { assertSafeTestRuntimeTargets } from "./runtime-safety.js";
import { errorHandler } from "./utils/errors.js";
import type Database from "better-sqlite3";

export async function buildApp(
  injectedDb: typeof db = db,
  injectedSqlite: Database.Database = sqlite,
  injectedDriveClient?: GoogleDriveBackupClient,
  injectedAiClient?: AiLocalModelClient
): Promise<FastifyInstance> {
  assertSafeTestRuntimeTargets(config);

  const app = Fastify({ logger: true });
  const driveClient = injectedDriveClient ?? createGoogleDriveBackupClient(() => getEffectiveGoogleDriveBackupFolderId(injectedDb));
  const aiClient = injectedAiClient ?? createOllamaLocalModelClient(config);

  app.decorate("db", injectedDb);
  app.decorate("sqlite", injectedSqlite);
  app.decorate("driveClient", driveClient);
  app.decorate("aiClient", aiClient);
  app.setErrorHandler(errorHandler);

  await registerCors(app);
  await registerMultipart(app);
  await registerStatic(app);

  app.get("/health", async () => ({ ok: true }));

  await app.register(registerProjectsRoutes, { prefix: "/api" });
  await app.register(registerAiRoutes, { prefix: "/api" });
  await app.register(registerMilestoneRoutes, { prefix: "/api" });
  await app.register(registerTasksRoutes, { prefix: "/api" });
  await app.register(registerSubtasksRoutes, { prefix: "/api" });
  await app.register(registerTicketsRoutes, { prefix: "/api" });
  await app.register(registerCommentsRoutes, { prefix: "/api" });
  await app.register(registerCatalogRoutes, { prefix: "/api" });
  await app.register(registerTagsRoutes, { prefix: "/api" });
  await app.register(registerNotesRoutes, { prefix: "/api" });
  await app.register(registerAttachmentsRoutes, { prefix: "/api" });
  await app.register(registerEventsRoutes, { prefix: "/api" });
  await app.register(registerHealthRoutes, { prefix: "/api" });
  await app.register(registerFeaturesRoutes, { prefix: "/api" });
  await app.register(registerUseCasesRoutes, { prefix: "/api" });
  await app.register(registerWikiRoutes, { prefix: "/api" });
  await app.register(registerBacklogRoutes, { prefix: "/api" });
  await app.register(registerDocLinksRoutes, { prefix: "/api" });
  await app.register(registerImportsRoutes, { prefix: "/api" });
  await app.register(registerDumpRoutes, { prefix: "/api" });

  return app;
}
