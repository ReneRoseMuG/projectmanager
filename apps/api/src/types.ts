import type { DbClient } from "./db/client.js";
import type Database from "better-sqlite3";
import type { GoogleDriveBackupClient } from "./services/google-drive.service.js";

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
    sqlite: Database.Database;
    driveClient: GoogleDriveBackupClient;
  }
}
