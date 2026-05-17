import type { WikiImportPreviewRequest, WikiImportRunRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { previewWikiImport, runWikiImport } from "../services/wiki-import.service.js";
import { objectResponseSchema, projectIdParamSchema } from "../utils/route-schemas.js";

const wikiImportBodySchema = {
  type: "object",
  required: ["sourcePath"],
  additionalProperties: false,
  properties: {
    sourcePath: { type: "string", minLength: 1 }
  }
} as const;

export async function registerImportsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { projectId: number }; Body: WikiImportPreviewRequest }>(
    "/projects/:projectId/import/wiki/preview",
    { schema: { params: projectIdParamSchema, body: wikiImportBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => previewWikiImport(app.db, request.params.projectId, request.body)
  );

  app.post<{ Params: { projectId: number }; Body: WikiImportRunRequest }>(
    "/projects/:projectId/import/wiki/run",
    { schema: { params: projectIdParamSchema, body: wikiImportBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => runWikiImport(app.db, request.params.projectId, request.body)
  );
}
