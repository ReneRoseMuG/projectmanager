import type { FastifyInstance } from "fastify";
import { FEATURE_STATUSES } from "../db/schema.js";
import { createFeature, deleteFeature, getFeature, listFeatures, updateFeature, type FeatureInput } from "../services/features.service.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const featureBodySchema = {
  type: "object",
  required: ["title", "slug"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    status: { type: "string", enum: FEATURE_STATUSES },
    description: { type: ["string", "null"] },
    content: { type: "string" },
    sortOrder: { type: "integer" }
  }
} as const;

const featurePatchSchema = {
  type: "object",
  additionalProperties: false,
  properties: featureBodySchema.properties
} as const;

export async function registerFeaturesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/features", { schema: { response: { 200: arrayResponseSchema } } }, async () => listFeatures(app.db));

  app.post<{ Body: FeatureInput }>(
    "/features",
    { schema: { body: featureBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createFeature(app.db, request.body))
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getFeature(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: FeatureInput }>(
    "/features/:id",
    { schema: { params: idParamSchema, body: featurePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateFeature(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/features/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteFeature(app.db, request.params.id);
      return reply.status(204).send();
    }
  );
}
