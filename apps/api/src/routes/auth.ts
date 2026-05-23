import type { CurrentUser, LoginRequest, SetPasswordRequest } from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAuth, requireCurrentUser } from "../plugins/auth.js";
import { login, setInitialPassword } from "../services/auth.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

const loginBodySchema = {
  type: "object",
  required: ["email"],
  additionalProperties: false,
  properties: {
    email: { type: "string", minLength: 1 },
    password: { type: "string" }
  }
} as const;

const setPasswordBodySchema = {
  type: "object",
  required: ["password"],
  additionalProperties: false,
  properties: {
    password: { type: "string", minLength: 8 }
  }
} as const;

async function applySession(request: FastifyRequest, user: CurrentUser): Promise<void> {
  await request.session.regenerate();
  request.session.set("userId", user.id);
  request.session.set("roleKey", user.role.key);
  request.session.set("email", user.email);
  await request.session.save();
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginRequest }>(
    "/auth/login",
    { schema: { body: loginBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = await login(app.db, request.body);
      await applySession(request, currentUser);
      return currentUser;
    }
  );

  app.post("/auth/logout", { schema: { response: { 204: { type: "null" } } } }, async (request, reply) => {
    await request.session.destroy();
    reply.clearCookie("taskmanager.sid", { path: "/" });
    return reply.status(204).send();
  });

  app.get("/auth/me", { schema: { response: { 200: objectResponseSchema } } }, async (request) => {
    return requireCurrentUser(request);
  });

  app.post<{ Body: SetPasswordRequest }>(
    "/auth/set-password",
    { preHandler: requireAuth, schema: { body: setPasswordBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      const updated = await setInitialPassword(app.db, currentUser.id, request.body);
      await applySession(request, updated);
      return updated;
    }
  );
}
