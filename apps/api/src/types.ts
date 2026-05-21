import type { DbClient } from "./db/client.js";
import type Database from "better-sqlite3";
import type { AiLocalModelClient } from "./services/ai-ollama.service.js";
import type { FileOpener } from "./services/file-opener.service.js";
import type { AuthAction, AuthResource, CurrentUser } from "@taskmanager/shared-types";

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
    sqlite: Database.Database;
    aiClient: AiLocalModelClient;
    fileOpener: FileOpener;
  }

  interface FastifyRequest {
    currentUser?: CurrentUser;
  }

  interface Session {
    userId?: number;
    roleKey?: string;
    email?: string;
  }

  interface FastifyContextConfig {
    auth?: {
      resource: AuthResource;
      action: AuthAction;
    };
  }
}
