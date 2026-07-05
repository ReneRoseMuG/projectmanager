import type { FastifyInstance } from "fastify";
import { createFeature, deleteFeature, getFeature, listFeatures, listFeaturesPaginated, updateFeature, type FeatureInput } from "../services/features.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, paginatedResponseSchema, paginationQuerySchema } from "../utils/route-schemas.js";

const featureListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", minLength: 1 },
    q: { type: "string" },
    // Opt-in-Pagination: ist `page` gesetzt, liefert die Route Paginated<Feature>, sonst
    // weiterhin das nackte Array (Rückwärtskompatibilität für MCP/interne Aufrufer).
    ...paginationQuerySchema
  }
} as const;

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
  app.get<{ Querystring: { status?: string; q?: string; page?: number; pageSize?: number } }>(
    "/features",
    { schema: { querystring: featureListQuerySchema, response: { 200: { anyOf: [arrayResponseSchema, paginatedResponseSchema] } } } },
    async (request) => {
      const { status, q, page, pageSize } = request.query;
      // Opt-in: nur wenn `page` gesetzt ist, paginiert antworten — sonst Array-Alt-Verhalten.
      if (page !== undefined) {
        return listFeaturesPaginated(app.db, { status, q }, page, pageSize ?? 25);
      }
      return listFeatures(app.db);
    }
  );

  app.post<{ Body: FeatureInput }>(
    "/features",
    { schema: { body: featureBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createFeature(app.db, request.body, createJournalActor(request.currentUser)))
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
