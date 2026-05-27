import type { DayPlanUpdate, EventInput, TaskInput } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import {
  createDayPlanEvent,
  createDayPlanTask,
  findOrCreateDayPlanByUserAndDate,
  linkDayPlanEvent,
  linkDayPlanTask,
  unlinkDayPlanEvent,
  unlinkDayPlanTask,
  updateDayPlanForUserAndDate
} from "../services/day-plan.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { expectedVersionPropertySchema, objectResponseSchema } from "../utils/route-schemas.js";

const dateParamSchema = {
  type: "object",
  required: ["date"],
  additionalProperties: false,
  properties: {
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }
  }
} as const;

const dateTaskParamSchema = {
  type: "object",
  required: ["date", "taskId"],
  additionalProperties: false,
  properties: {
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    taskId: { type: "integer", minimum: 1 }
  }
} as const;

const dateEventParamSchema = {
  type: "object",
  required: ["date", "eventId"],
  additionalProperties: false,
  properties: {
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    eventId: { type: "integer", minimum: 1 }
  }
} as const;

const dayPlanPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["open", "completed"] },
    notes: { type: ["string", "null"] },
    ...expectedVersionPropertySchema
  }
} as const;

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

const eventOwnerSchema = {
  type: "object",
  required: ["type", "id"],
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["project", "milestone", "task", "dayPlan"] },
    id: { type: "integer", minimum: 1 }
  }
} as const;

const eventBodySchema = {
  type: "object",
  required: ["title", "startTime", "endTime"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    startTime: { type: "string" },
    endTime: { type: "string" },
    isAllDay: { type: "boolean" },
    color: { type: ["string", "null"] },
    reminderMinutes: { type: "integer", minimum: 1 },
    owners: {
      type: "array",
      items: eventOwnerSchema
    }
  }
} as const;

export async function registerDayPlanRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { date: string } }>(
    "/day-plans/:date",
    { schema: { params: dateParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return findOrCreateDayPlanByUserAndDate(app.db, currentUser.id, request.params.date, createJournalActor(currentUser));
    }
  );

  app.patch<{ Params: { date: string }; Body: DayPlanUpdate }>(
    "/day-plans/:date",
    { schema: { params: dateParamSchema, body: dayPlanPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return updateDayPlanForUserAndDate(app.db, currentUser.id, request.params.date, request.body, createJournalActor(currentUser));
    }
  );

  app.post<{ Params: { date: string }; Body: TaskInput }>(
    "/day-plans/:date/tasks",
    { schema: { params: dateParamSchema, body: taskBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      const task = createDayPlanTask(app.db, currentUser.id, request.params.date, request.body, createJournalActor(currentUser));
      return reply.status(201).send(task);
    }
  );

  app.post<{ Params: { date: string; taskId: number } }>(
    "/day-plans/:date/tasks/:taskId",
    { schema: { params: dateTaskParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return linkDayPlanTask(app.db, currentUser.id, request.params.date, request.params.taskId, createJournalActor(currentUser));
    }
  );

  app.delete<{ Params: { date: string; taskId: number } }>(
    "/day-plans/:date/tasks/:taskId",
    { schema: { params: dateTaskParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      unlinkDayPlanTask(app.db, currentUser.id, request.params.date, request.params.taskId, createJournalActor(currentUser));
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { date: string }; Body: EventInput }>(
    "/day-plans/:date/events",
    { schema: { params: dateParamSchema, body: eventBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      const event = createDayPlanEvent(app.db, currentUser.id, request.params.date, request.body, createJournalActor(currentUser));
      return reply.status(201).send(event);
    }
  );

  app.post<{ Params: { date: string; eventId: number } }>(
    "/day-plans/:date/events/:eventId",
    { schema: { params: dateEventParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return linkDayPlanEvent(app.db, currentUser.id, request.params.date, request.params.eventId, createJournalActor(currentUser));
    }
  );

  app.delete<{ Params: { date: string; eventId: number } }>(
    "/day-plans/:date/events/:eventId",
    { schema: { params: dateEventParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      unlinkDayPlanEvent(app.db, currentUser.id, request.params.date, request.params.eventId, createJournalActor(currentUser));
      return reply.status(204).send();
    }
  );
}
