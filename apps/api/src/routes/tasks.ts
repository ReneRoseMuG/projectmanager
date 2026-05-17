import type { FastifyInstance } from "fastify";
import type { TaskInput, TaskPositionInput, TaskUpdate } from "@taskmanager/shared-types";
import { PRIORITIES, TASK_STATUSES } from "../db/schema.js";
import {
  createTask,
  deleteTask,
  getTaskDetail,
  listTasks,
  listProjectTasks,
  updateTask,
  updateTaskPosition
} from "../services/tasks.service.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, projectIdParamSchema } from "../utils/route-schemas.js";

const taskBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", enum: TASK_STATUSES },
    priority: { type: "string", enum: PRIORITIES },
    assignee: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
  }
} as const;

const taskPatchSchema = {
  type: "object",
  additionalProperties: false,
  properties: taskBodySchema.properties
} as const;

const taskPositionSchema = {
  type: "object",
  required: ["status", "position"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: TASK_STATUSES },
    position: { type: "number" }
  }
} as const;

export async function registerTasksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tasks", { schema: { response: { 200: arrayResponseSchema } } }, async () => listTasks(app.db));

  app.get<{ Params: { projectId: number } }>(
    "/projects/:projectId/tasks",
    { schema: { params: projectIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectTasks(app.db, request.params.projectId)
  );

  app.post<{ Params: { projectId: number }; Body: TaskInput }>(
    "/projects/:projectId/tasks",
    { schema: { params: projectIdParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = createTask(app.db, request.params.projectId, request.body);
      return reply.status(201).send(task);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getTaskDetail(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: TaskUpdate }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, body: taskPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTask(app.db, request.params.id, request.body)
  );

  app.patch<{ Params: { id: number }; Body: TaskPositionInput }>(
    "/tasks/:id/position",
    { schema: { params: idParamSchema, body: taskPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTaskPosition(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteTask(app.db, request.params.id);
      return reply.status(204).send();
    }
  );
}
