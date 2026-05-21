import type { FeatureRelationInput } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { FEATURE_RELATION_TYPES } from "../db/schema.js";
import {
  listFeatureRelations,
  listMilestoneFeatures,
  listProjectFeatures,
  setFeatureRelations,
  setMilestoneFeatures,
  setProjectFeatures
} from "../services/doc-links.service.js";
import { createJournalActor } from "../services/journal.service.js";
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
    async (request) => setProjectFeatures(app.db, request.params.id, request.body.featureIds, createJournalActor(request.currentUser))
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id/features",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listMilestoneFeatures(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { featureIds: number[] } }>(
    "/milestones/:id/features",
    { schema: { params: idParamSchema, body: featureIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setMilestoneFeatures(app.db, request.params.id, request.body.featureIds, createJournalActor(request.currentUser))
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id/relations",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listFeatureRelations(app.db, request.params.id)
  );

  app.put<{ Params: { id: number }; Body: { relations: FeatureRelationInput[] } }>(
    "/features/:id/relations",
    { schema: { params: idParamSchema, body: featureRelationsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setFeatureRelations(app.db, request.params.id, request.body.relations, createJournalActor(request.currentUser))
  );

}
