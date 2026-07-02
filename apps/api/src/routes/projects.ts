import type { FastifyInstance } from "fastify";
import type { ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "../services/projects.service.js";
import { getProjectContextTree, resolveProjectIdForMoveOwner } from "../services/project-context-tree.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const projectBodySchema = {
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

const projectPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...projectBodySchema.properties,
    wikiPageId: { type: ["integer", "null"], minimum: 1 },
    ...expectedVersionPropertySchema
  }
} as const;

const contextTreeQuerySchema = {
  type: "object",
  required: ["ownerType", "ownerId"],
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "task", "ticket"] },
    ownerId: { type: "integer", minimum: 1 }
  }
} as const;

export async function registerProjectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects", { schema: { response: { 200: arrayResponseSchema } } }, async () => listProjects(app.db));

  app.get<{ Querystring: { ownerType: "project" | "milestone" | "task" | "ticket"; ownerId: number } }>(
    "/projects/context-tree",
    { schema: { querystring: contextTreeQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => getProjectContextTree(app.db, await resolveProjectIdForMoveOwner(app.db, { type: request.query.ownerType, id: request.query.ownerId }))
  );

  app.post<{ Body: ProjectInput }>(
    "/projects",
    { schema: { body: projectBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const project = await createProject(app.db, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(project);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getProject(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id/context-tree",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getProjectContextTree(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: ProjectUpdate }>(
    "/projects/:id",
    { schema: { params: idParamSchema, body: projectPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateProject(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/projects/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteProject(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
