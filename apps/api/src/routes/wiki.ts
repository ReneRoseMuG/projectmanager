import type { FastifyInstance, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import {
  addWikiPageRelation,
  createWikiPage,
  deleteWikiPage,
  getWikiBreadcrumb,
  getWikiPage,
  listRootWikiPages,
  listWikiChildren,
  listWikiPageRelations,
  removeWikiPageRelation,
  updateWikiPage,
  type WikiPageInput
} from "../services/wiki.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const wikiBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    parentId: { type: ["integer", "null"], minimum: 1 },
    title: { type: "string", minLength: 1 },
    content: { type: "string" },
    sortOrder: { type: "integer" }
  }
} as const;

const wikiPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...wikiBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

const wikiRelationBodySchema = {
  type: "object",
  required: ["targetWikiPageId"],
  additionalProperties: false,
  properties: {
    targetWikiPageId: { type: "integer", minimum: 1 }
  }
} as const;

function rejectLegacyProjectId(request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction): void {
  const body = request.body;
  if (body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "projectId")) {
    done(badRequest("WikiPage projectId is no longer supported"));
    return;
  }
  done();
}

export async function registerWikiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/wiki", { schema: { response: { 200: arrayResponseSchema } } }, async () => listRootWikiPages(app.db));

  app.get<{ Params: { id: number } }>(
    "/wiki/:id/children",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listWikiChildren(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/wiki/:id/breadcrumb",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => getWikiBreadcrumb(app.db, request.params.id)
  );

  app.post<{ Body: WikiPageInput }>(
    "/wiki",
    { preValidation: rejectLegacyProjectId, schema: { body: wikiBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createWikiPage(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/wiki/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getWikiPage(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: WikiPageInput }>(
    "/wiki/:id",
    { preValidation: rejectLegacyProjectId, schema: { params: idParamSchema, body: wikiPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateWikiPage(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/wiki/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteWikiPage(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  for (const basePath of ["/wiki", "/wiki-pages"]) {
    app.get<{ Params: { id: number } }>(
      `${basePath}/:id/relations`,
      { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
      async (request) => listWikiPageRelations(app.db, request.params.id)
    );

    app.post<{ Params: { id: number }; Body: { targetWikiPageId: number } }>(
      `${basePath}/:id/relations`,
      { schema: { params: idParamSchema, body: wikiRelationBodySchema, response: { 201: arrayResponseSchema } } },
      async (request, reply) => {
        const relations = await addWikiPageRelation(app.db, request.params.id, request.body.targetWikiPageId, createJournalActor(request.currentUser));
        return reply.status(201).send(relations);
      }
    );

    app.delete<{ Params: { id: number; targetId: number } }>(
      `${basePath}/:id/relations/:targetId`,
      {
        schema: {
          params: {
            type: "object",
            required: ["id", "targetId"],
            properties: {
              id: { type: "integer", minimum: 1 },
              targetId: { type: "integer", minimum: 1 }
            }
          },
          response: { 204: { type: "null" } }
        }
      },
      async (request, reply) => {
        await removeWikiPageRelation(app.db, request.params.id, request.params.targetId, createJournalActor(request.currentUser));
        return reply.status(204).send();
      }
    );
  }
}
