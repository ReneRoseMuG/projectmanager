import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CommentInput, NoteInput, TicketInput, TicketPositionInput, TicketRelationInput, TicketUpdate } from "@taskmanager/shared-types";
import { TICKET_RELATION_TYPES, TICKET_RESOLUTIONS } from "../db/schema.js";
import { createTicketAttachment, deleteAttachment, listTicketAttachments } from "../services/attachments.service.js";
import { createEntityComment, deleteEntityComment, listEntityComments } from "../services/comments.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { createTicketNote, deleteTicketNote, listTicketNotes } from "../services/notes.service.js";
import { setTicketTags } from "../services/tags.service.js";
import {
  addTicketRelation,
  createOwnerTicket,
  createSubTicket,
  createTicket,
  deleteTicket,
  getTicketDetail,
  getTicketStats,
  linkOwnerTicket,
  listRecentTickets,
  listTicketLinkCandidates,
  listOwnerTickets,
  listProjectTickets,
  listTicketRelationCandidates,
  listSubTickets,
  listTicketRelations,
  listTickets,
  removeTicketRelation,
  unlinkOwnerTicket,
  updateTicket,
  updateTicketPosition
} from "../services/tickets.service.js";
import type { DashboardTicketOwner, TicketOwner } from "../services/tickets.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, expectedVersionPropertySchema, idParamSchema, objectResponseSchema, projectIdParamSchema, tagIdsBodySchema } from "../utils/route-schemas.js";

interface MultipartFileField {
  filename?: string;
  mimetype?: string;
  toBuffer?: () => Promise<Buffer>;
}

interface UploadBody {
  file?: MultipartFileField | MultipartFileField[];
}

const ticketBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    description: { type: ["string", "null"] },
    status: { type: "string", minLength: 1 },
    priority: { type: "string", minLength: 1 },
    reporterUserId: { type: ["integer", "null"], minimum: 1 },
    responsibleUserId: { type: ["integer", "null"], minimum: 1 },
    environment: { type: ["string", "null"] },
    affectedVersion: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
  }
} as const;

const ticketPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    ...ticketBodySchema.properties,
    resolution: { type: ["string", "null"], enum: [...TICKET_RESOLUTIONS, null] },
    resolvedAt: { type: ["string", "null"] },
    ...expectedVersionPropertySchema
  }
} as const;

const ticketPositionSchema = {
  type: "object",
  required: ["status", "position", "expectedVersion"],
  additionalProperties: false,
  properties: {
    status: { type: "string", minLength: 1 },
    position: { type: "number" },
    ...expectedVersionPropertySchema
  }
} as const;

const ticketRelationSchema = {
  type: "object",
  required: ["targetTicketId", "relationType"],
  additionalProperties: false,
  properties: {
    targetTicketId: { type: "integer", minimum: 1 },
    relationType: { type: "string", enum: TICKET_RELATION_TYPES }
  }
} as const;

const noteBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    contentJson: { type: "object", additionalProperties: true }
  }
} as const;

const commentBodySchema = {
  type: "object",
  required: ["body"],
  additionalProperties: false,
  properties: {
    body: { type: "string", minLength: 1 }
  }
} as const;

const idAndChildIdParamSchema = {
  type: "object",
  required: ["id", "childId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    childId: { type: "integer", minimum: 1 }
  }
} as const;

const ownerTicketParamSchema = {
  type: "object",
  required: ["id", "ticketId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    ticketId: { type: "integer", minimum: 1 }
  }
} as const;

const ticketLinkBodySchema = {
  type: "object",
  required: ["ticketId"],
  additionalProperties: false,
  properties: {
    ticketId: { type: "integer", minimum: 1 }
  }
} as const;

const ticketLinkCandidatesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "task", "feature", "useCase", "wikiPage"] },
    ownerId: { type: "integer", minimum: 1 },
    contextOwnerType: { type: "string", enum: ["project", "milestone", "task", "feature", "useCase", "wikiPage"] },
    contextOwnerId: { type: "integer", minimum: 1 }
  }
} as const;

const dashboardTicketQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone"] },
    ownerId: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 50 },
    sort: { type: "string", enum: ["createdAt", "updatedAt"] }
  }
} as const;

function ticketOwnerFromQuery(query: { ownerType?: DashboardTicketOwner["type"]; ownerId?: number }): DashboardTicketOwner | undefined {
  if (query.ownerType === undefined && query.ownerId === undefined) {
    return undefined;
  }
  if (query.ownerType === undefined || query.ownerId === undefined) {
    throw badRequest("ownerType and ownerId must be provided together");
  }
  return { type: query.ownerType, id: query.ownerId };
}

const uploadBodySchema = {
  consumes: ["multipart/form-data"],
  body: {
    type: "object",
    required: ["file"],
    additionalProperties: false,
    properties: {
      file: { $ref: "#multipartFile" }
    }
  }
} as const;

async function readUpload(request: FastifyRequest) {
  const file = (request.body as UploadBody | undefined)?.file;
  if (!file || Array.isArray(file) || typeof file.toBuffer !== "function") {
    throw badRequest("A file upload is required");
  }

  return {
    originalName: file.filename ?? "upload",
    mimetype: file.mimetype ?? "application/octet-stream",
    buffer: await file.toBuffer()
  };
}

export async function registerTicketsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tickets", { schema: { response: { 200: arrayResponseSchema } } }, async () => listTickets(app.db));

  app.get<{ Querystring: { ownerType?: DashboardTicketOwner["type"]; ownerId?: number } }>(
    "/tickets/stats",
    { schema: { querystring: dashboardTicketQuerySchema, response: { 200: objectResponseSchema } } },
    async (request) => getTicketStats(app.db, ticketOwnerFromQuery(request.query))
  );

  app.get<{ Querystring: { ownerType?: DashboardTicketOwner["type"]; ownerId?: number; limit?: number; sort?: "createdAt" | "updatedAt" } }>(
    "/tickets/recent",
    { schema: { querystring: dashboardTicketQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => listRecentTickets(app.db, { owner: ticketOwnerFromQuery(request.query), limit: request.query.limit, sort: request.query.sort })
  );

  app.post<{ Body: TicketInput }>(
    "/tickets",
    { schema: { body: ticketBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createTicket(app.db, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { projectId: number } }>(
    "/projects/:projectId/tickets",
    { schema: { params: projectIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectTickets(app.db, request.params.projectId)
  );

  app.post<{ Params: { projectId: number }; Body: TicketInput }>(
    "/projects/:projectId/tickets",
    { schema: { params: projectIdParamSchema, body: ticketBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) =>
      reply.status(201).send(await createOwnerTicket(app.db, { type: "project", id: request.params.projectId }, request.body, createJournalActor(request.currentUser)))
  );

  const ownerRoutes: Array<{ path: string; ownerType: TicketOwner["type"] }> = [
    { path: "/projects/:id/tickets", ownerType: "project" },
    { path: "/milestones/:id/tickets", ownerType: "milestone" },
    { path: "/tasks/:id/tickets", ownerType: "task" },
    { path: "/features/:id/tickets", ownerType: "feature" },
    { path: "/use-cases/:id/tickets", ownerType: "useCase" }
  ];

  for (const route of ownerRoutes.slice(1)) {
    app.get<{ Params: { id: number } }>(
      route.path,
      { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
      async (request) => listOwnerTickets(app.db, { type: route.ownerType, id: request.params.id })
    );

    app.post<{ Params: { id: number }; Body: TicketInput }>(
      route.path,
      { schema: { params: idParamSchema, body: ticketBodySchema, response: { 201: objectResponseSchema } } },
      async (request, reply) =>
        reply.status(201).send(await createOwnerTicket(app.db, { type: route.ownerType, id: request.params.id }, request.body, createJournalActor(request.currentUser)))
    );
  }

  for (const route of ownerRoutes) {
    app.post<{ Params: { id: number; ticketId: number } }>(
      `${route.path}/:ticketId`,
      { schema: { params: ownerTicketParamSchema, response: { 200: objectResponseSchema } } },
      async (request) => linkOwnerTicket(app.db, { type: route.ownerType, id: request.params.id }, request.params.ticketId, createJournalActor(request.currentUser))
    );

    app.delete<{ Params: { id: number; ticketId: number } }>(
      `${route.path}/:ticketId`,
      { schema: { params: ownerTicketParamSchema, response: { 204: { type: "null" } } } },
      async (request, reply) => {
        await unlinkOwnerTicket(app.db, { type: route.ownerType, id: request.params.id }, request.params.ticketId, createJournalActor(request.currentUser));
        return reply.status(204).send();
      }
    );
  }

  for (const basePath of ["/wiki", "/wiki-pages"]) {
    app.get<{ Params: { id: number } }>(
      `${basePath}/:id/tickets`,
      { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
      async (request) => listOwnerTickets(app.db, { type: "wikiPage", id: request.params.id })
    );

    app.post<{ Params: { id: number }; Body: { ticketId: number } }>(
      `${basePath}/:id/tickets`,
      { schema: { params: idParamSchema, body: ticketLinkBodySchema, response: { 201: objectResponseSchema } } },
      async (request, reply) => {
        const ticket = await linkOwnerTicket(
          app.db,
          { type: "wikiPage", id: request.params.id },
          request.body.ticketId,
          createJournalActor(request.currentUser),
          { conflictOnExisting: true }
        );
        return reply.status(201).send(ticket);
      }
    );

    app.delete<{ Params: { id: number; ticketId: number } }>(
      `${basePath}/:id/tickets/:ticketId`,
      { schema: { params: ownerTicketParamSchema, response: { 204: { type: "null" } } } },
      async (request, reply) => {
        await unlinkOwnerTicket(app.db, { type: "wikiPage", id: request.params.id }, request.params.ticketId, createJournalActor(request.currentUser));
        return reply.status(204).send();
      }
    );
  }

  app.get<{ Querystring: { ownerType?: TicketOwner["type"]; ownerId?: number; contextOwnerType?: TicketOwner["type"]; contextOwnerId?: number } }>(
    "/tickets/link-candidates",
    { schema: { querystring: ticketLinkCandidatesQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const owner = request.query.ownerType && request.query.ownerId ? { type: request.query.ownerType, id: request.query.ownerId } : null;
      const contextOwner = request.query.contextOwnerType && request.query.contextOwnerId ? { type: request.query.contextOwnerType, id: request.query.contextOwnerId } : null;
      return listTicketLinkCandidates(app.db, owner, contextOwner);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getTicketDetail(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: TicketUpdate }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, body: ticketPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTicket(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.patch<{ Params: { id: number }; Body: TicketPositionInput }>(
    "/tickets/:id/position",
    { schema: { params: idParamSchema, body: ticketPositionSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateTicketPosition(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.delete<{ Params: { id: number } }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteTicket(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/sub-tickets",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listSubTickets(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: TicketInput }>(
    "/tickets/:id/sub-tickets",
    { schema: { params: idParamSchema, body: ticketBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createSubTicket(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTicketRelations(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/relation-candidates",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTicketRelationCandidates(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: TicketRelationInput }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, body: ticketRelationSchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      await addTicketRelation(app.db, request.params.id, request.body, createJournalActor(request.currentUser));
      return reply.status(201).send({ ok: true });
    }
  );

  app.delete<{ Params: { id: number }; Body: TicketRelationInput }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, body: ticketRelationSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await removeTicketRelation(app.db, request.params.id, request.body.targetTicketId, request.body.relationType, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/tickets/:id/tags",
    { schema: { params: idParamSchema, body: tagIdsBodySchema, response: { 200: arrayResponseSchema } } },
    async (request) => setTicketTags(app.db, request.params.id, request.body.tagIds, createJournalActor(request.currentUser))
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/notes",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTicketNotes(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: NoteInput }>(
    "/tickets/:id/notes",
    { schema: { params: idParamSchema, body: noteBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createTicketNote(app.db, request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.delete<{ Params: { id: number; childId: number } }>(
    "/tickets/:id/notes/:childId",
    { schema: { params: idAndChildIdParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteTicketNote(app.db, request.params.id, request.params.childId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/comments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listEntityComments(app.db, "ticket", request.params.id)
  );

  app.post<{ Params: { id: number }; Body: CommentInput }>(
    "/tickets/:id/comments",
    { schema: { params: idParamSchema, body: commentBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await createEntityComment(app.db, "ticket", request.params.id, request.body, createJournalActor(request.currentUser)))
  );

  app.delete<{ Params: { id: number; childId: number } }>(
    "/tickets/:id/comments/:childId",
    { schema: { params: idAndChildIdParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteEntityComment(app.db, "ticket", request.params.id, request.params.childId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.get<{ Params: { id: number } }>(
    "/tickets/:id/attachments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTicketAttachments(app.db, request.params.id)
  );

  app.post<{ Params: { id: number } }>(
    "/tickets/:id/attachments",
    { schema: { params: idParamSchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createTicketAttachment(app.db, request.params.id, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.delete<{ Params: { id: number; childId: number } }>(
    "/tickets/:id/attachments/:childId",
    { schema: { params: idAndChildIdParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachment(app.db, request.params.childId, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
