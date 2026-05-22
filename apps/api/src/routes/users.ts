import type { FastifyInstance } from "fastify";
import { listUserOptions } from "../services/users.service.js";
import { arrayResponseSchema } from "../utils/route-schemas.js";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/users",
    {
      config: { auth: { resource: "users", action: "read" } },
      schema: { response: { 200: arrayResponseSchema } }
    },
    async () => listUserOptions(app.db)
  );
}
