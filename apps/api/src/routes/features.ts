import type { FastifyInstance } from "fastify";
import { createFeature, deleteFeature, getFeature, listFeatures, updateFeature, type FeatureInput } from "../services/features.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const featureBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    status: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    content: { type: "string" },
    sortOrder: { type: "integer" },
    responsibleUserId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

const featurePatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...featureBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerFeaturesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/features", { schema: { response: { 200: arrayResponseSchema } } }, async () => listFeatures(app.db));

  app.post<{ Body: FeatureInput }>(
    "/features",
    { schema: { body: featureBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createFeature(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getFeature(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: FeatureInput }>(
    "/features/:id",
    { schema: { params: idParamSchema, body: featurePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateFeature(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/features/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteFeature(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
