import type { FastifyInstance } from "fastify";
import { createWikiPage, deleteWikiPage, getWikiBreadcrumb, getWikiPage, listRootWikiPages, listWikiChildren, updateWikiPage, type WikiPageInput } from "../services/wiki.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const wikiBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    parentId: { type: ["integer", "null"], minimum: 1 },
    projectId: { type: ["integer", "null"], minimum: 1 },
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
    { schema: { body: wikiBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createWikiPage(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/wiki/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getWikiPage(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: WikiPageInput }>(
    "/wiki/:id",
    { schema: { params: idParamSchema, body: wikiPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateWikiPage(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/wiki/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteWikiPage(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
