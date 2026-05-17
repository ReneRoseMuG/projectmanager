import type { FeatureRelationInput } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { FEATURE_RELATION_TYPES } from "../db/schema.js";
import {
  listFeatureRelations,
  listFeatureTasks,
  listProjectFeatures,
  listTaskFeatures,
  listTaskUseCases,
  listUseCaseTasks,
  setFeatureRelations,
  setFeatureTasks,
  setProjectFeatures,
  setTaskFeatures,
  setTaskUseCases,
  setUseCaseTasks
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

const taskIdsBodySchema = {
  type: "object",
  required: ["taskIds"],
  additionalProperties: false,
  properties: {
    taskIds: {
      type: "array",
      items: { type: "integer", minimum: 1 }
    }
  }
} as const;

const featureRelationsBodySchema = {
  type: "object",
  required: ["relations"],
  additionalProperties: false,
  properties: {
    relations: {
      type: "array",
      items: {
        type: "object",
        required: ["targetFeatureId"],
        additionalProperties: false,
        properties: {
          targetFeatureId: { type: "integer", minimum: 1 },
          relationType: { type: "string", enum: FEATURE_RELATION_TYPES },
          description: { type: ["string", "null"] }
        }
      }
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
    "/features/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listFeatureTasks(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { taskIds: number[] } }>(
    "/features/:id/tasks",
    { schema: { params: idParamSchema, body: taskIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setFeatureTasks(app.db, request.params.id, request.body.taskIds)
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id/relations",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listFeatureRelations(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { relations: FeatureRelationInput[] } }>(
    "/features/:id/relations",
    { schema: { params: idParamSchema, body: featureRelationsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setFeatureRelations(app.db, request.params.id, request.body.relations)
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

  app.get<{ Params: { id: number } }>(
    "/use-cases/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listUseCaseTasks(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { taskIds: number[] } }>(
    "/use-cases/:id/tasks",
    { schema: { params: idParamSchema, body: taskIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setUseCaseTasks(app.db, request.params.id, request.body.taskIds)
  );
}
