import Fastify, { type FastifyInstance } from "fastify";
import { db } from "./db/client.js";
import { registerCors } from "./plugins/cors.js";
import { registerMultipart } from "./plugins/multipart.js";
import { registerStatic } from "./plugins/static.js";
import { registerAttachmentsRoutes } from "./routes/attachments.js";
import { registerBacklogRoutes } from "./routes/backlog.js";
import { registerCommentsRoutes } from "./routes/comments.js";
import { registerDocLinksRoutes } from "./routes/doc-links.js";
import { registerEventsRoutes } from "./routes/events.js";
import { registerFeaturesRoutes } from "./routes/features.js";
import { registerNotesRoutes } from "./routes/notes.js";
import { registerProjectsRoutes } from "./routes/projects.js";
import { registerSubtasksRoutes } from "./routes/subtasks.js";
import { registerTagsRoutes } from "./routes/tags.js";
import { registerTasksRoutes } from "./routes/tasks.js";
import { registerUseCasesRoutes } from "./routes/use-cases.js";
import { registerWikiRoutes } from "./routes/wiki.js";
import { errorHandler } from "./utils/errors.js";

export async function buildApp(injectedDb: typeof db = db): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.decorate("db", injectedDb);
  app.setErrorHandler(errorHandler);

  await registerCors(app);
  await registerMultipart(app);
  await registerStatic(app);

  app.get("/health", async () => ({ ok: true }));

  await app.register(registerProjectsRoutes, { prefix: "/api" });
  await app.register(registerTasksRoutes, { prefix: "/api" });
  await app.register(registerSubtasksRoutes, { prefix: "/api" });
  await app.register(registerCommentsRoutes, { prefix: "/api" });
  await app.register(registerTagsRoutes, { prefix: "/api" });
  await app.register(registerNotesRoutes, { prefix: "/api" });
  await app.register(registerAttachmentsRoutes, { prefix: "/api" });
  await app.register(registerEventsRoutes, { prefix: "/api" });
  await app.register(registerFeaturesRoutes, { prefix: "/api" });
  await app.register(registerUseCasesRoutes, { prefix: "/api" });
  await app.register(registerWikiRoutes, { prefix: "/api" });
  await app.register(registerBacklogRoutes, { prefix: "/api" });
  await app.register(registerDocLinksRoutes, { prefix: "/api" });

  return app;
}
