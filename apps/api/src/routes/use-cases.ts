import type { FastifyInstance } from "fastify";
import { createUseCase, deleteUseCase, getUseCase, listUseCases, updateUseCase, type UseCaseInput } from "../services/use-cases.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const featureIdParamSchema = {
  type: "object",
  required: ["featureId"],
  properties: {
    featureId: { type: "integer", minimum: 1 }
  }
} as const;

const useCaseBodySchema = {
  type: "object",
  required: ["title", "slug"],
  additionalProperties: false,
  properties: {
    featureId: { type: "integer", minimum: 1 },
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    status: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    content: { type: "string" },
    sortOrder: { type: "integer" }
  }
} as const;

const useCasePatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...useCaseBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerUseCasesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { featureId: number } }>(
    "/features/:featureId/use-cases",
    { schema: { params: featureIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listUseCases(app.db, request.params.featureId)
  );

  app.post<{ Params: { featureId: number }; Body: UseCaseInput }>(
    "/features/:featureId/use-cases",
    { schema: { params: featureIdParamSchema, body: useCaseBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createUseCase(app.db, request.params.featureId, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/use-cases/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getUseCase(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: UseCaseInput }>(
    "/use-cases/:id",
    { schema: { params: idParamSchema, body: useCasePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateUseCase(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/use-cases/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteUseCase(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
