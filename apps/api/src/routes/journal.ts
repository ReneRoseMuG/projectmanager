import type { FastifyInstance } from "fastify";
import { JOURNAL_OBJECT_TYPES, JOURNAL_OPERATIONS, type JournalObjectType, type JournalOperation } from "@taskmanager/shared-types";
import { listJournalEntries, listObjectJournalEntries } from "../services/journal.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

interface JournalQuerystring {
  limit?: number;
  cursor?: number;
  q?: string;
  operation?: JournalOperation;
  objectType?: JournalObjectType;
  objectId?: number;
  actorUserId?: number;
  from?: string;
  to?: string;
}

const journalQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100 },
    cursor: { type: "integer", minimum: 1 },
    q: { type: "string" },
    operation: { type: "string", enum: JOURNAL_OPERATIONS },
    objectType: { type: "string", enum: JOURNAL_OBJECT_TYPES },
    objectId: { type: "integer", minimum: 1 },
    actorUserId: { type: "integer", minimum: 1 },
    from: { type: "string" },
    to: { type: "string" }
  }
} as const;

const journalObjectParamsSchema = {
  type: "object",
  required: ["objectType", "objectId"],
  additionalProperties: false,
  properties: {
    objectType: { type: "string", enum: JOURNAL_OBJECT_TYPES },
    objectId: { type: "integer", minimum: 1 }
  }
} as const;

export async function registerJournalRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: JournalQuerystring }>(
    "/journal",
    { schema: { querystring: journalQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => listJournalEntries(app.db, request.query)
  );

  app.get<{ Params: { objectType: JournalObjectType; objectId: number }; Querystring: JournalQuerystring }>(
    "/journal/objects/:objectType/:objectId",
    { schema: { params: journalObjectParamsSchema, querystring: journalQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => listObjectJournalEntries(app.db, request.params.objectType, request.params.objectId, request.query)
  );
}
