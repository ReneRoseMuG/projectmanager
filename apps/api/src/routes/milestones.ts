import type { FastifyInstance } from "fastify";
import type { MilestoneInput, MilestoneUpdate } from "@taskmanager/shared-types";
import { createMilestone, deleteMilestone, getMilestone, listMilestones, listMilestonesPaginated, listProjectMilestones, updateMilestone } from "../services/milestones.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, paginatedResponseSchema, paginationQuerySchema } from "../utils/route-schemas.js";

// Serverseitige Filter + Opt-in-Pagination der globalen Meilensteinliste. `status`/`q` bilden
// den bisher clientseitigen Status- und Suchfilter nach; ist `page` gesetzt, liefert die Route
// Paginated<Milestone>, sonst weiterhin das nackte Array (Rückwärtskompatibilität für MCP/
// interne Aufrufer). Projektgebundene Listen (byProject) bleiben davon unberührt.
const milestoneListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string" },
    q: { type: "string" },
    ...paginationQuerySchema
  }
} as const;

const milestoneBodySchema = {
  type: "object",
  required: ["projectId", "name"],
  additionalProperties: false,
  properties: {
    projectId: { type: "integer", minimum: 1 },
    name: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", minLength: 1 },
    color: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] },
    responsibleUserId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

const milestonePatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...milestoneBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

const projectMilestoneBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", minLength: 1 },
    color: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] },
    responsibleUserId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

export async function registerMilestoneRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { status?: string; q?: string; page?: number; pageSize?: number } }>(
    "/milestones",
    { schema: { querystring: milestoneListQuerySchema, response: { 200: { anyOf: [arrayResponseSchema, paginatedResponseSchema] } } } },
    async (request) => {
      const { status, q, page, pageSize } = request.query;
      // Opt-in: nur wenn `page` gesetzt ist, paginiert antworten — sonst Array-Alt-Verhalten.
      if (page !== undefined) {
        return listMilestonesPaginated(app.db, { status, q }, page, pageSize ?? 25);
      }
      return listMilestones(app.db);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id/milestones",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectMilestones(app.db, request.params.id)
  );

  app.post<{ Body: MilestoneInput }>(
    "/milestones",
    { schema: { body: milestoneBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createMilestone(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.post<{ Params: { id: number }; Body: Omit<MilestoneInput, "projectId"> }>(
    "/projects/:id/milestones",
    { schema: { params: idParamSchema, body: projectMilestoneBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createMilestone(app.db, { ...request.body, projectId: request.params.id }, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getMilestone(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: MilestoneUpdate }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, body: milestonePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateMilestone(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteMilestone(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
