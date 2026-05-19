import type { FastifyInstance } from "fastify";
import type { CommentEntityType, CommentInput } from "@taskmanager/shared-types";
import { createComment, createEntityComment, deleteComment, deleteEntityComment, linkEntityComment, listComments, listEntityComments } from "../services/comments.service.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, taskIdParamSchema } from "../utils/route-schemas.js";

const commentBodySchema = {
  type: "object",
  required: ["body"],
  additionalProperties: false,
  properties: {
    body: { type: "string", minLength: 1 }
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

function registerEntityCommentRoutes(app: FastifyInstance, path: string, entityType: CommentEntityType): void {
  app.get<{ Params: { id: number } }>(
    `${path}/:id/comments`,
    { schema: { params: entityCommentParamsSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listEntityComments(app.db, entityType, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: CommentInput }>(
    `${path}/:id/comments`,
    { schema: { params: entityCommentParamsSchema, body: commentBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createEntityComment(app.db, entityType, request.params.id, request.body))
  );

  app.post<{ Params: { id: number; commentId: number } }>(
    `${path}/:id/comments/:commentId`,
    { schema: { params: entityCommentDeleteParamsSchema, response: { 200: objectResponseSchema } } },
    async (request) => linkEntityComment(app.db, entityType, request.params.id, request.params.commentId)
  );

  app.delete<{ Params: { id: number; commentId: number } }>(
    `${path}/:id/comments/:commentId`,
    { schema: { params: entityCommentDeleteParamsSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteEntityComment(app.db, entityType, request.params.id, request.params.commentId);
      return reply.status(204).send();
    }
  );
}

export async function registerCommentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { taskId: number } }>(
    "/tasks/:taskId/comments",
    { schema: { params: taskIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listComments(app.db, request.params.taskId)
  );

  app.post<{ Params: { taskId: number }; Body: CommentInput }>(
    "/tasks/:taskId/comments",
    { schema: { params: taskIdParamSchema, body: commentBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const comment = createComment(app.db, request.params.taskId, request.body);
      return reply.status(201).send(comment);
    }
  );

  app.delete<{ Params: { id: number } }>(
    "/comments/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteComment(app.db, request.params.id);
      return reply.status(204).send();
    }
  );

  registerEntityCommentRoutes(app, "/features", "feature");
  registerEntityCommentRoutes(app, "/projects", "project");
  registerEntityCommentRoutes(app, "/use-cases", "useCase");
  registerEntityCommentRoutes(app, "/backlog", "backlogItem");
  registerEntityCommentRoutes(app, "/wiki", "wikiPage");
}
