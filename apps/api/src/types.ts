import type { DbClient } from "./db/client.js";
import type Database from "better-sqlite3";
import type { AiLocalModelClient } from "./services/ai-ollama.service.js";
import type { GoogleDriveBackupClient } from "./services/google-drive.service.js";
import type { CurrentUser } from "@taskmanager/shared-types";

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
    sqlite: Database.Database;
    driveClient: GoogleDriveBackupClient;
    aiClient: AiLocalModelClient;
  }

  interface FastifyRequest {
    currentUser?: CurrentUser;
  }

  interface Session {
    userId?: number;
    roleKey?: string;
    email?: string;
  }
}
