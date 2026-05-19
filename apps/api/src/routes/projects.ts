import type { FastifyInstance } from "fastify";
import type { ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { PROJECT_STATUSES } from "../db/schema.js";
import { createProject, deleteProject, getProject, listProjects, updateProject } from "../services/projects.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const projectBodySchema = {
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

const projectPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...projectBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerProjectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/projects", { schema: { response: { 200: arrayResponseSchema } } }, async () => listProjects(app.db));

  app.post<{ Body: ProjectInput }>(
    "/projects",
    { schema: { body: projectBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const project = createProject(app.db, request.body);
      return reply.status(201).send(project);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getProject(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: ProjectUpdate }>(
    "/projects/:id",
    { schema: { params: idParamSchema, body: projectPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateProject(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/projects/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteProject(app.db, request.params.id);
      return reply.status(204).send();
    }
  );
}
