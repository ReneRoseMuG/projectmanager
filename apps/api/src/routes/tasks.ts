import type { TaskBoardPositionInput, TaskInput, TaskUpdate } from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import {
  createOwnerTask,
  deleteTask,
  getTaskStats,
  getTaskDetail,
  linkOwnerTask,
  listOverdueTasks,
  listRecentTasks,
  listTaskLinkCandidates,
  listOwnerTasks,
  listTasks,
  unlinkOwnerTask,
  updateOwnerTaskBoard,
  updateTask
} from "../services/tasks.service.js";
import type { DashboardOverdueTaskOwner, DashboardTaskOwner, TaskOwner } from "../services/tasks.service.js";
import { ensureDayPlanOwnedByUser } from "../services/day-plan.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
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
    responsibleUserId: { type: ["integer", "null"], minimum: 1 },
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

const taskLinkBodySchema = {
  type: "object",
  required: ["taskId"],
  additionalProperties: false,
  properties: {
    taskId: { type: "integer", minimum: 1 }
  }
} as const;

const taskLinkCandidatesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "feature", "useCase", "wikiPage"] },
    ownerId: { type: "integer", minimum: 1 },
    contextOwnerType: { type: "string", enum: ["project", "milestone", "feature", "useCase", "wikiPage"] },
    contextOwnerId: { type: "integer", minimum: 1 }
  }
} as const;

const dashboardTaskQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "task", "dayPlan"] },
    ownerId: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50 },
    sort: { type: "string", enum: ["createdAt", "updatedAt"] }
  }
} as const;

const dashboardOverdueTaskQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "dayPlan"] },
    ownerId: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50 }
  }
} as const;

function taskOwnerFromQuery(query: { ownerType?: DashboardTaskOwner["type"]; ownerId?: number }): DashboardTaskOwner | undefined {
  if (query.ownerType === undefined && query.ownerId === undefined) {
    return undefined;
  }
  if (query.ownerType === undefined || query.ownerId === undefined) {
    throw badRequest("ownerType and ownerId must be provided together");
  }
  return { type: query.ownerType, id: query.ownerId };
}

function overdueTaskOwnerFromQuery(query: { ownerType?: DashboardOverdueTaskOwner["type"]; ownerId?: number }): DashboardOverdueTaskOwner | undefined {
  return taskOwnerFromQuery(query) as DashboardOverdueTaskOwner | undefined;
}

async function ensureDashboardDayPlanAccess(app: FastifyInstance, request: FastifyRequest, owner?: DashboardTaskOwner | DashboardOverdueTaskOwner): Promise<void> {
  if (owner?.type !== "dayPlan") {
    return;
  }
  const currentUser = await requireCurrentUser(request);
  await ensureDayPlanOwnedByUser(app.db, owner.id, currentUser.id);
}

export async function registerTasksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tasks", { schema: { response: { 200: arrayResponseSchema } } }, async () => listTasks(app.db));

  app.get<{ Querystring: { ownerType?: DashboardTaskOwner["type"]; ownerId?: number } }>(
    "/tasks/stats",
    { schema: { querystring: dashboardTaskQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const owner = taskOwnerFromQuery(request.query);
      await ensureDashboardDayPlanAccess(app, request, owner);
      return getTaskStats(app.db, owner);
    }
  );

  app.get<{ Querystring: { ownerType?: DashboardTaskOwner["type"]; ownerId?: number; limit?: number; sort?: "createdAt" | "updatedAt" } }>(
    "/tasks/recent",
    { schema: { querystring: dashboardTaskQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const owner = taskOwnerFromQuery(request.query);
      await ensureDashboardDayPlanAccess(app, request, owner);
      return listRecentTasks(app.db, { owner, limit: request.query.limit, sort: request.query.sort });
    }
  );

  app.get<{ Querystring: { ownerType?: "project" | "milestone" | "dayPlan"; ownerId?: number; limit?: number } }>(
    "/tasks/overdue",
    { schema: { querystring: dashboardOverdueTaskQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const owner = overdueTaskOwnerFromQuery(request.query);
      await ensureDashboardDayPlanAccess(app, request, owner);
      return listOverdueTasks(app.db, { owner, limit: request.query.limit });
    }
  );

  app.get<{ Querystring: { ownerType?: TaskOwner["type"]; ownerId?: number; contextOwnerType?: TaskOwner["type"]; contextOwnerId?: number } }>(
    "/tasks/link-candidates",
    { schema: { querystring: taskLinkCandidatesQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const owner = request.query.ownerType && request.query.ownerId ? { type: request.query.ownerType, id: request.query.ownerId } : null;
      const contextOwner = request.query.contextOwnerType && request.query.contextOwnerId ? { type: request.query.contextOwnerType, id: request.query.contextOwnerId } : null;
      return listTaskLinkCandidates(app.db, owner, contextOwner);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id/tasks",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listOwnerTasks(app.db, { type: "project", id: request.params.id })
  );

  app.post<{ Params: { id: number }; Body: TaskInput }>(
    "/projects/:id/tasks",
    { schema: { params: idParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const task = await createOwnerTask(app.db, { type: "project", id: request.params.id }, request.body, createJournalActor(request.currentUser));
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
      const task = await createOwnerTask(app.db, { type: "milestone", id: request.params.id }, request.body, createJournalActor(request.currentUser));
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
      const task = await createOwnerTask(app.db, { type: "feature", id: request.params.id }, request.body, createJournalActor(request.currentUser));
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
      const task = await createOwnerTask(app.db, { type: "useCase", id: request.params.id }, request.body, createJournalActor(request.currentUser));
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

  for (const basePath of ["/wiki", "/wiki-pages"]) {
    app.get<{ Params: { id: number } }>(
      `${basePath}/:id/tasks`,
      { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
      async (request) => listOwnerTasks(app.db, { type: "wikiPage", id: request.params.id })
    );

    app.post<{ Params: { id: number }; Body: { taskId: number } }>(
      `${basePath}/:id/tasks`,
      { schema: { params: idParamSchema, body: taskLinkBodySchema, response: { 201: objectResponseSchema } } },
      async (request, reply) => {
        const task = await linkOwnerTask(
          app.db,
          { type: "wikiPage", id: request.params.id },
          request.body.taskId,
          createJournalActor(request.currentUser),
          { conflictOnExisting: true }
        );
        return reply.status(201).send(task);
      }
    );

    app.delete<{ Params: { id: number; taskId: number } }>(
      `${basePath}/:id/tasks/:taskId`,
      { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
      async (request, reply) => {
        await unlinkOwnerTask(app.db, { type: "wikiPage", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
        return reply.status(204).send();
      }
    );
  }

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/projects/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await unlinkOwnerTask(app.db, { type: "project", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/milestones/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await unlinkOwnerTask(app.db, { type: "milestone", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/features/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await unlinkOwnerTask(app.db, { type: "feature", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; taskId: number } }>(
    "/use-cases/:id/tasks/:taskId",
    { schema: { params: ownerTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await unlinkOwnerTask(app.db, { type: "useCase", id: request.params.id }, request.params.taskId, createJournalActor(request.currentUser));
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
