import type { FastifyInstance } from "fastify";
import {
  createTag,
  deleteTag,
  listTags,
  setMilestoneTags,
  setProjectTags,
  setTaskTags,
  updateTag
} from "../services/tags.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, tagIdsBodySchema } from "../utils/route-schemas.js";

const tagBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    color: { type: "string" }
  }
} as const;

const tagPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...tagBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerTagsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tags", { schema: { response: { 200: arrayResponseSchema } } }, async () => listTags(app.db));

  app.post<{ Body: { name?: string; color?: string } }>(
    "/tags",
    { schema: { body: tagBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createTag(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.patch<{ Params: { id: number }; Body: { name?: string; color?: string; expectedVersion: number } }>(
    "/tags/:id",
    { schema: { params: idParamSchema, body: tagPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTag(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/tags/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteTag(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/projects/:id/tags",
    { schema: { params: idParamSchema, body: tagIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setProjectTags(app.db, request.params.id, request.body.tagIds, createJournalActor(request.currentUser))
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/tasks/:id/tags",
    { schema: { params: idParamSchema, body: tagIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setTaskTags(app.db, request.params.id, request.body.tagIds, createJournalActor(request.currentUser))
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/milestones/:id/tags",
    { schema: { params: idParamSchema, body: tagIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setMilestoneTags(app.db, request.params.id, request.body.tagIds, createJournalActor(request.currentUser))
  );
}
