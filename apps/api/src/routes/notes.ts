import type { FastifyInstance } from "fastify";
import type { NoteInput, NoteUpdate } from "@taskmanager/shared-types";
import {
  createProjectNote,
  createMilestoneNote,
  createTaskNote,
  deleteNote,
  getNote,
  listMilestoneNotes,
  listProjectNotes,
  listTaskNotes,
  updateNote
} from "../services/notes.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const noteBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    contentJson: { type: "object", additionalProperties: true }
  }
} as const;

const notePatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...noteBodySchema.properties,
    ...expectedVersionPropertySchema
  }
} as const;

export async function registerNotesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: number } }>(
    "/projects/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectNotes(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTaskNotes(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listMilestoneNotes(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/projects/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createProjectNote(app.db, request.params.id, request.body))
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/tasks/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createTaskNote(app.db, request.params.id, request.body))
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/milestones/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(createMilestoneNote(app.db, request.params.id, request.body))
  );

  app.get<{ Params: { id: number } }>(
    "/notes/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getNote(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: NoteUpdate }>(
    "/notes/:id",
    { schema: { params: idParamSchema, body: notePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateNote(app.db, request.params.id, request.body)
  );

  app.delete<{ Params: { id: number } }>(
    "/notes/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      deleteNote(app.db, request.params.id);
      return reply.status(204).send();
    }
  );
}
