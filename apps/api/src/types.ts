import type { DbClient } from "./db/client.js";
import type Database from "better-sqlite3";
import type { FileOpener } from "./services/file-opener.service.js";
import type { RealtimeEventBus } from "./services/realtime-event-bus.service.js";
import type { AuthAction, AuthResource, CurrentUser } from "@taskmanager/shared-types";

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
    sqlite: Database.Database;
    fileOpener: FileOpener;
    realtimeBus: RealtimeEventBus;
  }

  interface FastifyRequest {
    currentUser?: CurrentUser;
    sourceTabId?: string | null;
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
