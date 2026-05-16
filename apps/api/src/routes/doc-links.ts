import type { FastifyInstance } from "fastify";
import {
  listProjectFeatures,
  listTaskFeatures,
  listTaskUseCases,
  setProjectFeatures,
  setTaskFeatures,
  setTaskUseCases
} from "../services/doc-links.service.js";
import { arrayResponseSchema, idParamSchema } from "../utils/route-schemas.js";

const featureIdsBodySchema = {
  type: "object",
  required: ["featureIds"],
  additionalProperties: false,
  properties: {
    featureIds: {
      type: "array",
      items: { type: "integer", minimum: 1 }
    }
  }
} as const;

const useCaseIdsBodySchema = {
  type: "object",
  required: ["useCaseIds"],
  additionalProperties: false,
  properties: {
    useCaseIds: {
      type: "array",
      items: { type: "integer", minimum: 1 }
    }
  }
} as const;

export async function registerDocLinksRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: number } }>(
    "/projects/:id/features",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectFeatures(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { featureIds: number[] } }>(
    "/projects/:id/features",
    { schema: { params: idParamSchema, body: featureIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setProjectFeatures(app.db, request.params.id, request.body.featureIds)
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id/features",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTaskFeatures(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { featureIds: number[] } }>(
    "/tasks/:id/features",
    { schema: { params: idParamSchema, body: featureIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setTaskFeatures(app.db, request.params.id, request.body.featureIds)
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id/use-cases",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTaskUseCases(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { useCaseIds: number[] } }>(
    "/tasks/:id/use-cases",
    { schema: { params: idParamSchema, body: useCaseIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setTaskUseCases(app.db, request.params.id, request.body.useCaseIds)
  );
}
