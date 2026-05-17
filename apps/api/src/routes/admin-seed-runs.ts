import type { SeedRunCreateRequest, SeedRunDeleteRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { createVisualSeedRun, deleteSeedRun, listSeedRuns, previewSeedRunDelete } from "../services/seed-data.service.js";
import { arrayResponseSchema, objectResponseSchema } from "../utils/route-schemas.js";

const seedRunIdParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 }
  }
} as const;

const createSeedRunBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: ["string", "null"], minLength: 1 }
  }
} as const;

const deleteSeedRunBodySchema = {
  type: "object",
  required: ["confirmationId"],
  additionalProperties: false,
  properties: {
    confirmationId: { type: "string", minLength: 1 }
  }
} as const;

export async function registerAdminSeedRunRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/seed-runs",
    { schema: { response: { 200: arrayResponseSchema } } },
    async () => listSeedRuns(app.db)
  );

  app.post<{ Body: SeedRunCreateRequest }>(
    "/admin/seed-runs",
    { schema: { body: createSeedRunBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createVisualSeedRun(app.db, request.body ?? {}))
  );

  app.get<{ Params: { id: string } }>(
    "/admin/seed-runs/:id/delete-preview",
    { schema: { params: seedRunIdParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => previewSeedRunDelete(app.db, request.params.id)
  );

  app.delete<{ Params: { id: string }; Body: SeedRunDeleteRequest }>(
    "/admin/seed-runs/:id",
    { schema: { params: seedRunIdParamSchema, body: deleteSeedRunBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => deleteSeedRun(app.db, request.params.id, request.body.confirmationId)
  );
}
