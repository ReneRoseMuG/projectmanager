import type { RoleInput, RoleUpdate } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { createRole, deleteRole, getPermissionCatalog, getRole, listRoles, updateRole } from "../services/roles.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, objectResponseSchema } from "../utils/route-schemas.js";

const idParamSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 }
  }
} as const;

const permissionSchema = {
  type: "object",
  required: ["resource", "action"],
  additionalProperties: false,
  properties: {
    resource: { type: "string", minLength: 1 },
    action: { type: "string", minLength: 1 }
  }
} as const;

const roleCreateBodySchema = {
  type: "object",
  required: ["key", "label", "permissions"],
  additionalProperties: false,
  properties: {
    key: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1 },
    permissions: { type: "array", items: permissionSchema }
  }
} as const;

const roleUpdateBodySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    key: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1 },
    permissions: { type: "array", items: permissionSchema },
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerAdminRoleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/roles", { schema: { response: { 200: arrayResponseSchema } } }, async () => listRoles(app.db));

  app.get<{ Params: { id: number } }>(
    "/admin/roles/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getRole(app.db, request.params.id)
  );

  app.post<{ Body: RoleInput }>(
    "/admin/roles",
    { schema: { body: roleCreateBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createRole(app.db, request.body))
  );

  app.put<{ Params: { id: number }; Body: RoleUpdate }>(
    "/admin/roles/:id",
    { schema: { params: idParamSchema, body: roleUpdateBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => updateRole(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/admin/roles/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteRole(app.db, request.params.id);
      return reply.status(204).send();
    }
  );

  app.get("/admin/permissions/catalog", { schema: { response: { 200: objectResponseSchema } } }, async () => getPermissionCatalog());
}
