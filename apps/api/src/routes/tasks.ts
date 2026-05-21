import type { TaskBoardPositionInput, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import {
  createOwnerTask,
  deleteTask,
  getTaskDetail,
  linkOwnerTask,
  listOwnerTasks,
  listTasks,
  unlinkOwnerTask,
  updateOwnerTaskBoard,
  updateTask
} from "../services/tasks.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const taskBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", minLength: 1 },
    priority: { type: "string", minLength: 1 },
    assignee: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
  }
} as const;

const taskPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...taskBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

const taskBoardPositionSchema = {
  type: "object",
  required: ["status", "position", "expectedVersion"],
  additionalProperties: false,
  properties: {
    status: { type: "string", minLength: 1 },
    position: { type: "number" },
    ...expectedVersionPropertySchema
  }
} as const;

const ownerTaskParamSchema = {
  type: "object",
  required: ["id", "taskId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    taskId: { type: "integer", minimum: 1 }
  }
} as const;

export async function registerTasksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tasks", { schema: { response: { 200: arrayResponseSchema } } }, async () => listTasks(app.db));

  app.get<{ Params: { id: number } }>(
    "/projects/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listOwnerTasks(app.db, { type: "project", id: request.params.id })
  );

  app.post<{ Params: { id: number }; Body: TaskInput }>(
    "/projects/:id/tasks",
    { schema: { params: idParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = createOwnerTask(app.db, { type: "project", id: request.params.id }, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(task);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listOwnerTasks(app.db, { type: "milestone", id: request.params.id })
  );

  app.post<{ Params: { id: number }; Body: TaskInput }>(
    "/milestones/:id/tasks",
    { schema: { params: idParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = createOwnerTask(app.db, { type: "milestone", id: request.params.id }, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(task);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listOwnerTasks(app.db, { type: "feature", id: request.params.id })
  );

  app.post<{ Params: { id: number }; Body: TaskInput }>(
    "/features/:id/tasks",
    { schema: { params: idParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = createOwnerTask(app.db, { type: "feature", id: request.params.id }, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(task);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/use-cases/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listOwnerTasks(app.db, { type: "useCase", id: request.params.id })
  );

  app.post<{ Params: { id: number }; Body: TaskInput }>(
    "/use-cases/:id/tasks",
    { schema: { params: idParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = createOwnerTask(app.db, { type: "useCase", id: request.params.id }, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(task);
    }
  );

  app.post<{ Params: { id: number; taskId: number } }>(
    "/projects/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => linkOwnerTask(app.db, { type: "project", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser))
  );

  app.post<{ Params: { id: number; taskId: number } }>(
    "/milestones/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => linkOwnerTask(app.db, { type: "milestone", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser))
  );

  app.post<{ Params: { id: number; taskId: number } }>(
    "/features/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => linkOwnerTask(app.db, { type: "feature", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser))
  );

  app.post<{ Params: { id: number; taskId: number } }>(
    "/use-cases/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => linkOwnerTask(app.db, { type: "useCase", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/projects/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      unlinkOwnerTask(app.db, { type: "project", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/milestones/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      unlinkOwnerTask(app.db, { type: "milestone", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/features/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      unlinkOwnerTask(app.db, { type: "feature", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/use-cases/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      unlinkOwnerTask(app.db, { type: "useCase", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.patch<{ Params: { id: number; taskId: number }; Body: TaskBoardPositionInput }>(
    "/projects/:id/tasks/:taskId/board",
    { schema: { params: ownerTaskParamSchema, body: taskBoardPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateOwnerTaskBoard(app.db, { type: "project", id: request.params.id }, request.params.taskId, request.body, createJournalActor(request.currentUser))
  );

  app.patch<{ Params: { id: number; taskId: number }; Body: TaskBoardPositionInput }>(
    "/milestones/:id/tasks/:taskId/board",
    { schema: { params: ownerTaskParamSchema, body: taskBoardPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateOwnerTaskBoard(app.db, { type: "milestone", id: request.params.id }, request.params.taskId, request.body, createJournalActor(request.currentUser))
  );

  app.patch<{ Params: { id: number; taskId: number }; Body: TaskBoardPositionInput }>(
    "/features/:id/tasks/:taskId/board",
    { schema: { params: ownerTaskParamSchema, body: taskBoardPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateOwnerTaskBoard(app.db, { type: "feature", id: request.params.id }, request.params.taskId, request.body, createJournalActor(request.currentUser))
  );

  app.patch<{ Params: { id: number; taskId: number }; Body: TaskBoardPositionInput }>(
    "/use-cases/:id/tasks/:taskId/board",
    { schema: { params: ownerTaskParamSchema, body: taskBoardPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateOwnerTaskBoard(app.db, { type: "useCase", id: request.params.id }, request.params.taskId, request.body, createJournalActor(request.currentUser))
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getTaskDetail(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: TaskUpdate }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, body: taskPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTask(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/tasks/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteTask(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
