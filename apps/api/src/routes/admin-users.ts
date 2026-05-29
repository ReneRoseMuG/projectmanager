import type { AdminUserInput, AdminUserUpdate } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import { createAdminUser, deleteAdminUser, getAdminUser, listAdminUsers, updateAdminUser } from "../services/users.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, objectResponseSchema } from "../utils/route-schemas.js";

const idParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 }
  }
} as const;

const userCreateBodySchema = {
  type: "object",
  required: ["firstName", "lastName", "email", "roleId", "password"],
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    lastName: { type: "string", minLength: 1 },
    address: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    email: { type: "string", minLength: 1 },
    roleId: { type: "integer", minimum: 1 },
    password: { type: "string", minLength: 8 },
    isActive: { type: "boolean" }
  }
} as const;

const userUpdateBodySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    firstName: { type: "string", minLength: 1 },
    lastName: { type: "string", minLength: 1 },
    address: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    email: { type: "string", minLength: 1 },
    roleId: { type: "integer", minimum: 1 },
    password: { type: "string", minLength: 8 },
    isActive: { type: "boolean" },
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerAdminUserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/users", { schema: { response: { 200: arrayResponseSchema } } }, async () => listAdminUsers(app.db));

  app.get<{ Params: { id: number } }>(
    "/admin/users/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getAdminUser(app.db, request.params.id)
  );

  app.post<{ Body: AdminUserInput }>(
    "/admin/users",
    { schema: { body: userCreateBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createAdminUser(app.db, request.body))
  );

  app.put<{ Params: { id: number }; Body: AdminUserUpdate }>(
    "/admin/users/:id",
    { schema: { params: idParamSchema, body: userUpdateBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => updateAdminUser(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/admin/users/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      const actor = await requireCurrentUser(request);
      deleteAdminUser(app.db, request.params.id, actor.id);
      return reply.status(204).send();
    }
  );
}
