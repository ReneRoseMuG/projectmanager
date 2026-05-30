import type { FastifyInstance } from "fastify";
import { JOURNAL_OBJECT_TYPES, JOURNAL_OPERATIONS, type JournalObjectType, type JournalOperation } from "@taskmanager/shared-types";
import { requireCurrentUser } from "../plugins/auth.js";
import { ensureDayPlanOwnedByUser } from "../services/day-plan.service.js";
import { listJournalEntries, listObjectJournalEntries } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
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
    async (request) => {
      if (request.query.objectType === "dayPlan") {
        if (request.query.objectId === undefined) {
          throw badRequest("objectId is required for dayPlan journal queries");
        }
        const currentUser = await requireCurrentUser(request);
        await ensureDayPlanOwnedByUser(app.db, request.query.objectId, currentUser.id);
      }
      return listJournalEntries(app.db, request.query);
    }
  );

  app.get<{ Params: { objectType: JournalObjectType; objectId: number }; Querystring: JournalQuerystring }>(
    "/journal/objects/:objectType/:objectId",
    { schema: { params: journalObjectParamsSchema, querystring: journalQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      if (request.params.objectType === "dayPlan") {
        const currentUser = await requireCurrentUser(request);
        await ensureDayPlanOwnedByUser(app.db, request.params.objectId, currentUser.id);
      }
      return listObjectJournalEntries(app.db, request.params.objectType, request.params.objectId, request.query);
    }
  );
}
