import type { DbClient } from "./db/client.js";

declare module "fastify" {
  interface FastifyInstance {
    db: DbClient;
  }
}
