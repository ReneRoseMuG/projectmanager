import type { CatalogEntryInput, CatalogEntryUpdate, CatalogKind } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { CATALOG_KINDS } from "../db/schema.js";
import { createCatalogEntry, deleteCatalogEntry, listCatalogEntries, updateCatalogEntry } from "../services/catalogs.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, objectResponseSchema } from "../utils/route-schemas.js";

const kindParamSchema = {
  type: "object",
  required: ["kind"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: CATALOG_KINDS }
  }
} as const;

const kindAndIdParamSchema = {
  type: "object",
  required: ["kind", "id"],
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: CATALOG_KINDS },
    id: { type: "integer", minimum: 1 }
  }
} as const;

const catalogEntryBodySchema = {
  type: "object",
  required: ["key", "label"],
  additionalProperties: false,
  properties: {
    key: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1 },
    sortOrder: { type: "number" },
    isClosed: { type: "boolean" },
    color: { type: "string", minLength: 1 }
  }
} as const;

const catalogEntryPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    label: { type: "string", minLength: 1 },
    sortOrder: { type: "number" },
    isClosed: { type: "boolean" },
    color: { type: "string", minLength: 1 },
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerCatalogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/catalogs", { schema: { response: { 200: arrayResponseSchema } } }, async () => listCatalogEntries(app.db));

  app.get<{ Params: { kind: CatalogKind } }>(
    "/catalogs/:kind",
    { schema: { params: kindParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listCatalogEntries(app.db, request.params.kind)
  );

  app.post<{ Params: { kind: CatalogKind }; Body: CatalogEntryInput }>(
    "/catalogs/:kind",
    { schema: { params: kindParamSchema, body: catalogEntryBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createCatalogEntry(app.db, request.params.kind, request.body))
  );

  app.patch<{ Params: { kind: CatalogKind; id: number }; Body: CatalogEntryUpdate }>(
    "/catalogs/:kind/:id",
    { schema: { params: kindAndIdParamSchema, body: catalogEntryPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateCatalogEntry(app.db, request.params.kind, request.params.id, request.body)
  );

  app.delete<{ Params: { kind: CatalogKind; id: number } }>(
    "/catalogs/:kind/:id",
    { schema: { params: kindAndIdParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteCatalogEntry(app.db, request.params.kind, request.params.id);
      return reply.status(204).send();
    }
  );
}
