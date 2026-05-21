import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  createFeatureAttachment,
  createMilestoneAttachment,
  createProjectAttachment,
  createTaskAttachment,
  deleteAttachment,
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
      await openAttachment(app.db, request.params.id, app.fileOpener);
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
