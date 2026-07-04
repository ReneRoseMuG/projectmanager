import type { FastifyInstance } from "fastify";
import type { NoteInput, NoteMoveInput, NoteUpdate } from "@taskmanager/shared-types";
import { requireCurrentUser } from "../plugins/auth.js";
import {
  createDayPlanNote,
  createProjectNote,
  createMilestoneNote,
  createTaskNote,
  createWikiPageNote,
  deleteDayPlanNote,
  deleteNote,
  getNote,
  linkDayPlanNote,
  listNotes,
  listNotesPaginated,
  listDayPlanNotes,
  listMilestoneNotes,
  listProjectNotes,
  listTaskNotes,
  listWikiPageNotes,
  moveNote,
  updateNote
} from "../services/notes.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, paginatedResponseSchema, paginationQuerySchema } from "../utils/route-schemas.js";

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

const noteMoveSchema = {
  type: "object",
  required: ["source", "target"],
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      required: ["type", "id"],
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["project", "milestone", "task", "ticket"] },
        id: { type: "integer", minimum: 1 }
      }
    },
    target: {
      type: "object",
      required: ["type", "id"],
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["project", "milestone", "task", "ticket"] },
        id: { type: "integer", minimum: 1 }
      }
    }
  }
} as const;

const dayPlanNoteParamSchema = {
  type: "object",
  required: ["id", "noteId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    noteId: { type: "integer", minimum: 1 }
  }
} as const;

const notesListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    q: { type: "string" },
    // Opt-in-Pagination: ist `page` gesetzt, liefert die Route Paginated<Note>, sonst
    // weiterhin das nackte Array (Rückwärtskompatibilität für bestehende Aufrufer).
    ...paginationQuerySchema
  }
} as const;

export async function registerNotesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { q?: string; page?: number; pageSize?: number } }>(
    "/notes",
    { schema: { querystring: notesListQuerySchema, response: { 200: { anyOf: [arrayResponseSchema, paginatedResponseSchema] } } } },
    async (request) => {
      const { q, page, pageSize } = request.query;
      // Opt-in: nur wenn `page` gesetzt ist, paginiert antworten — sonst Array-Alt-Verhalten.
      if (page !== undefined) {
        return listNotesPaginated(app.db, { q }, page, pageSize ?? 25);
      }
      return listNotes(app.db);
    }
  );

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

  app.get<{ Params: { id: number } }>(
    "/day-plans/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      return listDayPlanNotes(app.db, request.params.id, currentUser.id);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/wiki/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listWikiPageNotes(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/projects/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createProjectNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/tasks/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createTaskNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/milestones/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createMilestoneNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/day-plans/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const currentUser = await requireCurrentUser(request);
      return reply.status(201).send(await createDayPlanNote(app.db, request.params.id, currentUser.id, request.body, createJournalActor(request.currentUser)));
    }
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/wiki/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createWikiPageNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.post<{ Params: { id: number; noteId: number } }>(
    "/day-plans/:id/notes/:noteId",
    { schema: { params: dayPlanNoteParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      return linkDayPlanNote(app.db, request.params.id, request.params.noteId, currentUser.id, createJournalActor(request.currentUser));
    }
  );

  app.get<{ Params: { id: number } }>(
    "/notes/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getNote(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: NoteMoveInput }>(
    "/notes/:id/location",
    { schema: { params: idParamSchema, body: noteMoveSchema, response: { 200: objectResponseSchema } } },
    async (request) => moveNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.patch<{ Params: { id: number }; Body: NoteUpdate }>(
    "/notes/:id",
    { schema: { params: idParamSchema, body: notePatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/notes/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteNote(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; noteId: number } }>(
    "/day-plans/:id/notes/:noteId",
    { schema: { params: dayPlanNoteParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      const currentUser = await requireCurrentUser(request);
      await deleteDayPlanNote(app.db, request.params.id, request.params.noteId, currentUser.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
