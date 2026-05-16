import type { FastifyInstance } from "fastify";
import type { TaskInput } from "@taskmanager/shared-types";
import { PRIORITIES, TASK_STATUSES } from "../db/schema.js";
import { createSubtask, listSubtasks } from "../services/tasks.service.js";
import { arrayResponseSchema, objectResponseSchema, taskIdParamSchema } from "../utils/route-schemas.js";

const subtaskBodySchema = {
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
      const subtask = createSubtask(app.db, request.params.taskId, request.body);
      return reply.status(201).send(subtask);
    }
  );
}
