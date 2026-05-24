import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import {
  createFeatureAttachment,
  createMilestoneAttachment,
  createProjectAttachment,
  createTaskAttachment,
  deleteAttachment,
  listRecentAttachments,
  listFeatureAttachments,
  listMilestoneAttachments,
  listProjectAttachments,
  listTaskAttachments,
  openAttachment
} from "../services/attachments.service.js";
import { getAttachmentPreview } from "../services/attachment-preview.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

interface MultipartFileField {
  filename?: string;
  mimetype?: string;
  toBuffer?: () => Promise<Buffer>;
}

interface UploadBody {
  file?: MultipartFileField | MultipartFileField[];
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

const recentAttachmentsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ownerType: { type: "string", enum: ["project", "milestone", "task"] },
    ownerId: { type: "integer", minimum: 1 },
    mine: { type: "boolean" },
    limit: { type: "integer", minimum: 1, maximum: 50 }
  }
} as const;

function recentAttachmentOwnerFromQuery(query: { ownerType?: "project" | "milestone" | "task"; ownerId?: number; mine?: boolean }) {
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

export async function registerAttachmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { ownerType?: "project" | "milestone" | "task"; ownerId?: number; mine?: boolean; limit?: number } }>(
    "/attachments/recent",
    { schema: { querystring: recentAttachmentsQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      return listRecentAttachments(app.db, { owner: recentAttachmentOwnerFromQuery(request.query), currentUserId: currentUser.id, limit: request.query.limit });
    }
  );

  app.get<{ Params: { id: number } }>(
    "/projects/:id/attachments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listProjectAttachments(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/tasks/:id/attachments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listTaskAttachments(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/milestones/:id/attachments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listMilestoneAttachments(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/features/:id/attachments",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => listFeatureAttachments(app.db, request.params.id)
  );

  app.get<{ Params: { id: number } }>(
    "/attachments/:id/preview",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getAttachmentPreview(app.db, request.params.id)
  );

  app.post<{ Params: { id: number } }>(
    "/attachments/:id/open",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { params: idParamSchema, response: { 204: { type: "null" } } }
    },
    async (request, reply) => {
      await openAttachment(app.db, request.params.id, app.fileOpener, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { id: number } }>(
    "/projects/:id/attachments",
    { schema: { params: idParamSchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createProjectAttachment(app.db, request.params.id, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number } }>(
    "/tasks/:id/attachments",
    { schema: { params: idParamSchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createTaskAttachment(app.db, request.params.id, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number } }>(
    "/milestones/:id/attachments",
    { schema: { params: idParamSchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createMilestoneAttachment(app.db, request.params.id, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number } }>(
    "/features/:id/attachments",
    { schema: { params: idParamSchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createFeatureAttachment(app.db, request.params.id, await readUpload(request), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.delete<{ Params: { id: number } }>(
    "/attachments/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachment(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
