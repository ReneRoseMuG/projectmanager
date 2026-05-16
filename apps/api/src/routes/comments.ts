import type { FastifyInstance } from "fastify";
import type { CommentInput } from "@taskmanager/shared-types";
import { createComment, deleteComment, listComments } from "../services/comments.service.js";
import { arrayResponseSchema, emptyResponseSchema, idParamSchema, objectResponseSchema, taskIdParamSchema } from "../utils/route-schemas.js";

const commentBodySchema = {
  type: "object",
  required: ["body"],
  additionalProperties: false,
  properties: {
    body: { type: "string", minLength: 1 }
  }
} as const;

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
    { schema: { params: idParamSchema, response: { 200: emptyResponseSchema } } },
    async (request) => {
      deleteComment(app.db, request.params.id);
      return { ok: true };
    }
  );
}
