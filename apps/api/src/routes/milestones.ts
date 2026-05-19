import type { FastifyInstance } from "fastify";
import type { MilestoneInput, MilestoneUpdate } from "@taskmanager/shared-types";
import { PROJECT_STATUSES } from "../db/schema.js";
import { createMilestone, deleteMilestone, getMilestone, listMilestones, listProjectMilestones, updateMilestone } from "../services/milestones.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const milestoneBodySchema = {
  type: "object",
  required: ["projectId", "name"],
  additionalProperties: false,
  properties: {
    projectId: { type: "integer", minimum: 1 },
    name: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", enum: PROJECT_STATUSES },
    color: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
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
    status: { type: "string", enum: PROJECT_STATUSES },
    color: { type: ["string", "null"] },
    startDate: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
  }
} as const;

export async function registerMilestoneRoutes(app: FastifyInstance): Promise<void> {
  app.get("/milestones", { schema: { response: { 200: arrayResponseSchema } } }, async () => listMilestones(app.db));

  app.get<{ Params: { id: number } }>(
    "/projects/:id/milestones",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectMilestones(app.db, request.params.id)
  );

  app.post<{ Body: MilestoneInput }>(
    "/milestones",
    { schema: { body: milestoneBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createMilestone(app.db, request.body))
  );

  app.post<{ Params: { id: number }; Body: Omit<MilestoneInput, "projectId"> }>(
    "/projects/:id/milestones",
    { schema: { params: idParamSchema, body: projectMilestoneBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createMilestone(app.db, { ...request.body, projectId: request.params.id }))
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getMilestone(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: MilestoneUpdate }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, body: milestonePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateMilestone(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/milestones/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteMilestone(app.db, request.params.id);
      return reply.status(204).send();
    }
  );
}
