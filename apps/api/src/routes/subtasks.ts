import type { FastifyInstance } from "fastify";
import type { TaskInput } from "@taskmanager/shared-types";
import { createSubtask, listSubtasks } from "../services/tasks.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, objectResponseSchema, taskIdParamSchema } from "../utils/route-schemas.js";

const subtaskBodySchema = {
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

export async function registerSubtasksRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { taskId: number } }>(
    "/tasks/:taskId/subtasks",
    { schema: { params: taskIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listSubtasks(app.db, request.params.taskId)
  );

  app.post<{ Params: { taskId: number }; Body: TaskInput }>(
    "/tasks/:taskId/subtasks",
    { schema: { params: taskIdParamSchema, body: subtaskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const subtask = await createSubtask(app.db, request.params.taskId, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send(subtask);
    }
  );
}
