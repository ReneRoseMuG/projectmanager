import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CommentEntityType, CommentInput, CommentUpdate } from "@taskmanager/shared-types";
import { requireCurrentUser } from "../plugins/auth.js";
import { createComment, createEntityComment, deleteComment, deleteEntityComment, ensureDayPlanCommentAccess, linkEntityComment, listComments, listEntityComments, listRecentComments, updateComment } from "../services/comments.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, taskIdParamSchema } from "../utils/route-schemas.js";

const commentBodySchema = {
  type: "object",
  required: ["body"],
  additionalProperties: false,
  properties: {
    body: { type: "string", minLength: 1 }
  }
} as const;

const commentUpdateSchema = {
  type: "object",
  required: ["body", "expectedVersion"],
  additionalProperties: false,
  properties: {
    body: { type: "string", minLength: 1 },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const entityCommentParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "integer", minimum: 1 }
  }
} as const;

const entityCommentDeleteParamsSchema = {
  type: "object",
  required: ["id", "commentId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    commentId: { type: "integer", minimum: 1 }
  }
} as const;

const recentCommentsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "task", "dayPlan"] },
    ownerId: { type: "integer", minimum: 1 },
    mine: { type: "boolean" },
    limit: { type: "integer", minimum: 1, maximum: 50 }
  }
} as const;

function recentCommentOwnerFromQuery(query: { ownerType?: "project" | "milestone" | "task" | "dayPlan"; ownerId?: number; mine?: boolean }) {
  if (query.ownerType !== undefined || query.ownerId !== undefined) {
    if (query.ownerType === undefined || query.ownerId === undefined) {
      throw badRequest("ownerType and ownerId must be provided together");
    }
    if (query.mine === true) {
      throw badRequest("mine cannot be combined with ownerType and ownerId");
    }
    return { type: query.ownerType, id: query.ownerId };
  }
  return undefined;
}

function registerEntityCommentRoutes(app: FastifyInstance, path: string, entityType: CommentEntityType): void {
  async function ensureDayPlanRouteAccess(id: number, request: FastifyRequest): Promise<void> {
    if (entityType !== "dayPlan") {
      return;
    }
    const currentUser = await requireCurrentUser(request);
    await ensureDayPlanCommentAccess(app.db, id, currentUser.id);
  }

  app.get<{ Params: { id: number } }>(
    `${path}/:id/comments`,
    { schema: { params: entityCommentParamsSchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      await ensureDayPlanRouteAccess(request.params.id, request);
      return listEntityComments(app.db, entityType, request.params.id);
    }
  );

  app.post<{ Params: { id: number }; Body: CommentInput }>(
    `${path}/:id/comments`,
    { schema: { params: entityCommentParamsSchema, body: commentBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      await ensureDayPlanRouteAccess(request.params.id, request);
      return reply.status(201).send(await createEntityComment(app.db, entityType, request.params.id, request.body, createJournalActor(request.currentUser)));
    }
  );

  app.post<{ Params: { id: number; commentId: number } }>(
    `${path}/:id/comments/:commentId`,
    { schema: { params: entityCommentDeleteParamsSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      await ensureDayPlanRouteAccess(request.params.id, request);
      return linkEntityComment(app.db, entityType, request.params.id, request.params.commentId, createJournalActor(request.currentUser));
    }
  );

  app.delete<{ Params: { id: number; commentId: number } }>(
    `${path}/:id/comments/:commentId`,
    { schema: { params: entityCommentDeleteParamsSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await ensureDayPlanRouteAccess(request.params.id, request);
      await deleteEntityComment(app.db, entityType, request.params.id, request.params.commentId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}

export async function registerCommentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { ownerType?: "project" | "milestone" | "task" | "dayPlan"; ownerId?: number; mine?: boolean; limit?: number } }>(
    "/comments/recent",
    { schema: { querystring: recentCommentsQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      const owner = recentCommentOwnerFromQuery(request.query);
      if (owner?.type === "dayPlan") {
        await ensureDayPlanCommentAccess(app.db, owner.id, currentUser.id);
      }
      return listRecentComments(app.db, { owner, currentUserId: currentUser.id, limit: request.query.limit, mine: request.query.mine });
    }
  );

  app.get<{ Params: { taskId: number } }>(
    "/tasks/:taskId/comments",
    { schema: { params: taskIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listComments(app.db, request.params.taskId)
  );

  app.post<{ Params: { taskId: number }; Body: CommentInput }>(
    "/tasks/:taskId/comments",
    { schema: { params: taskIdParamSchema, body: commentBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const comment = await createComment(app.db, request.params.taskId, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(comment);
    }
  );

  app.patch<{ Params: { id: number }; Body: CommentUpdate }>(
    "/comments/:id",
    { schema: { params: idParamSchema, body: commentUpdateSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateComment(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/comments/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteComment(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  registerEntityCommentRoutes(app, "/features", "feature");
  registerEntityCommentRoutes(app, "/projects", "project");
  registerEntityCommentRoutes(app, "/milestones", "milestone");
  registerEntityCommentRoutes(app, "/use-cases", "useCase");
  registerEntityCommentRoutes(app, "/backlog", "backlogItem");
  registerEntityCommentRoutes(app, "/wiki", "wikiPage");
  registerEntityCommentRoutes(app, "/day-plans", "dayPlan");
}
