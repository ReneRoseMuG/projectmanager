import type { FastifyInstance } from "fastify";
import type { EventInput, EventUpdate } from "@taskmanager/shared-types";
import { createEvent, deleteEvent, getEvent, listEvents, updateEvent } from "../services/events.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const eventOwnerSchema = {
  type: "object",
  required: ["type", "id"],
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["project", "milestone", "task"] },
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
    owners: {
      type: "array",
      items: eventOwnerSchema
    }
  }
} as const;

const eventPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...eventBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

const eventQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    from: { type: "string" },
    to: { type: "string" }
  }
} as const;

export async function registerEventsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    "/events",
    { schema: { querystring: eventQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => listEvents(app.db, request.query)
  );

  app.post<{ Body: EventInput }>(
    "/events",
    { schema: { body: eventBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createEvent(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/events/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getEvent(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: EventUpdate }>(
    "/events/:id",
    { schema: { params: idParamSchema, body: eventPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateEvent(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/events/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteEvent(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
