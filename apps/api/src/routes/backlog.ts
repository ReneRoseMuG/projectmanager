import type { FastifyInstance } from "fastify";
import { createBacklogItem, deleteBacklogItem, getBacklogItem, listBacklogItems, updateBacklogItem, type BacklogFilters, type BacklogInput } from "../services/backlog.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const backlogQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    featureId: { type: "integer", minimum: 1 },
    useCaseId: { type: "integer", minimum: 1 },
    status: { type: "string", minLength: 1 }
  }
} as const;

const backlogBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", minLength: 1 },
    importKey: { type: ["string", "null"] },
    featureId: { type: ["integer", "null"], minimum: 1 },
    useCaseId: { type: ["integer", "null"], minimum: 1 },
    sortOrder: { type: "integer" },
    responsibleUserId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

const backlogPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...backlogBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerBacklogRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: number }; Querystring: BacklogFilters }>(
    "/projects/:id/backlog",
    { schema: { params: idParamSchema, querystring: backlogQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => listBacklogItems(app.db, request.params.id, request.query)
  );

  app.post<{ Params: { id: number }; Body: BacklogInput }>(
    "/projects/:id/backlog",
    { schema: { params: idParamSchema, body: backlogBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createBacklogItem(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/backlog/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getBacklogItem(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: BacklogInput }>(
    "/backlog/:id",
    { schema: { params: idParamSchema, body: backlogPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateBacklogItem(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/backlog/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteBacklogItem(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
