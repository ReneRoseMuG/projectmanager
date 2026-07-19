import type { AttachmentLibrarySelection } from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { createReadStream } from "node:fs";
import { requireCurrentUser } from "../plugins/auth.js";
import {
  createFeatureAttachment,
  createMilestoneAttachment,
  createProjectAttachment,
  createTaskAttachment,
  createWikiPageAttachment,
  deleteAttachment,
  getAttachmentFile,
  unlinkAttachment,
  listRecentAttachments,
  listFeatureAttachments,
  listMilestoneAttachments,
  listProjectAttachments,
  listTaskAttachments,
  listWikiPageAttachments,
  openAttachment
} from "../services/attachments.service.js";
import { getAttachmentPreview, getAttachmentPreviewFile } from "../services/attachment-preview.service.js";
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

const ownerUploadQuerySchema = {
  type: "object",
  required: ["libraryVisibility"],
  additionalProperties: false,
  properties: {
    libraryVisibility: { type: "string", enum: ["attachment-only", "document-library"] }
  }
} as const;

const attachmentLifecycleQuerySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    expectedVersion: { type: "integer", minimum: 1 },
    orphanAction: { type: "string", enum: ["add-to-library"] }
  }
} as const;

const expectedVersionQuerySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const attachmentContentQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    download: { type: "boolean" }
  }
} as const;

const ownerAttachmentParamSchema = {
  type: "object",
  required: ["id", "attachmentId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    attachmentId: { type: "integer", minimum: 1 }
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

function contentDisposition(filename: string, download: boolean): string {
  const fallback = filename.replace(/["\\\r\n]/g, "_");
  const mode = download ? "attachment" : "inline";
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function readUpload(request: FastifyRequest, librarySelection: AttachmentLibrarySelection) {
  const file = (request.body as UploadBody | undefined)?.file;
  if (!file || Array.isArray(file) || typeof file.toBuffer !== "function") {
    throw badRequest("A file upload is required");
  }

  return {
    originalName: file.filename ?? "upload",
    mimetype: file.mimetype ?? "application/octet-stream",
    buffer: await file.toBuffer(),
    librarySelection
  };
}

export async function registerAttachmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { ownerType?: "project" | "milestone" | "task"; ownerId?: number; mine?: boolean; limit?: number } }>(
    "/attachments/recent",
    { schema: { querystring: recentAttachmentsQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      return listRecentAttachments(app.db, { owner: recentAttachmentOwnerFromQuery(request.query), currentUserId: currentUser.id, limit: request.query.limit, mine: request.query.mine });
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

  for (const basePath of ["/wiki", "/wiki-pages"]) {
    app.get<{ Params: { id: number } }>(
      `${basePath}/:id/attachments`,
      { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
      async (request) => listWikiPageAttachments(app.db, request.params.id)
    );
  }

  app.get<{ Params: { id: number } }>(
    "/attachments/:id/preview",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { params: idParamSchema, response: { 200: objectResponseSchema } }
    },
    async (request) => getAttachmentPreview(app.db, request.params.id)
  );

  app.get<{ Params: { id: number }; Querystring: { download?: boolean } }>(
    "/attachments/:id/content",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { params: idParamSchema, querystring: attachmentContentQuerySchema }
    },
    async (request, reply) => {
      const file = await getAttachmentFile(app.db, request.params.id);
      return reply
        .type(file.mimetype)
        .header("Content-Length", String(file.size))
        .header("Content-Disposition", contentDisposition(file.originalName, request.query.download === true))
        .send(createReadStream(file.diskPath));
    }
  );

  app.get<{ Params: { id: number } }>(
    "/attachments/:id/preview-file",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { params: idParamSchema }
    },
    async (request, reply) => {
      const file = await getAttachmentPreviewFile(app.db, request.params.id);
      return reply
        .type("application/pdf")
        .header("Content-Length", String(file.size))
        .header("Content-Disposition", "inline")
        .send(createReadStream(file.diskPath));
    }
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

  app.post<{ Params: { id: number }; Querystring: { libraryVisibility: AttachmentLibrarySelection } }>(
    "/projects/:id/attachments",
    { schema: { params: idParamSchema, querystring: ownerUploadQuerySchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createProjectAttachment(app.db, request.params.id, await readUpload(request, request.query.libraryVisibility), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number }; Querystring: { libraryVisibility: AttachmentLibrarySelection } }>(
    "/tasks/:id/attachments",
    { schema: { params: idParamSchema, querystring: ownerUploadQuerySchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createTaskAttachment(app.db, request.params.id, await readUpload(request, request.query.libraryVisibility), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number }; Querystring: { libraryVisibility: AttachmentLibrarySelection } }>(
    "/milestones/:id/attachments",
    { schema: { params: idParamSchema, querystring: ownerUploadQuerySchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createMilestoneAttachment(app.db, request.params.id, await readUpload(request, request.query.libraryVisibility), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  app.post<{ Params: { id: number }; Querystring: { libraryVisibility: AttachmentLibrarySelection } }>(
    "/features/:id/attachments",
    { schema: { params: idParamSchema, querystring: ownerUploadQuerySchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const attachment = await createFeatureAttachment(app.db, request.params.id, await readUpload(request, request.query.libraryVisibility), createJournalActor(request.currentUser));
      return reply.status(201).send(attachment);
    }
  );

  for (const basePath of ["/wiki", "/wiki-pages"]) {
    app.post<{ Params: { id: number }; Querystring: { libraryVisibility: AttachmentLibrarySelection } }>(
      `${basePath}/:id/attachments`,
      { schema: { params: idParamSchema, querystring: ownerUploadQuerySchema, ...uploadBodySchema, response: { 201: objectResponseSchema } } },
      async (request, reply) => {
        const attachment = await createWikiPageAttachment(app.db, request.params.id, await readUpload(request, request.query.libraryVisibility), createJournalActor(request.currentUser));
        return reply.status(201).send(attachment);
      }
    );

    app.delete<{
      Params: { id: number; attachmentId: number };
      Querystring: { expectedVersion: number; orphanAction?: "add-to-library" };
    }>(
      `${basePath}/:id/attachments/:attachmentId`,
      {
        config: { auth: { resource: "attachments", action: "write" } },
        schema: {
          params: ownerAttachmentParamSchema,
          querystring: attachmentLifecycleQuerySchema,
          response: { 204: { type: "null" } }
        }
      },
      async (request, reply) => {
        await unlinkAttachment(
          app.db,
          { type: "wikiPage", id: request.params.id },
          request.params.attachmentId,
          request.query,
          createJournalActor(request.currentUser)
        );
        return reply.status(204).send();
      }
    );
  }

  const unlinkRoutes = [
    { path: "/projects/:id/attachments/:attachmentId", ownerType: "project" as const },
    { path: "/tasks/:id/attachments/:attachmentId", ownerType: "task" as const },
    { path: "/milestones/:id/attachments/:attachmentId", ownerType: "milestone" as const },
    { path: "/features/:id/attachments/:attachmentId", ownerType: "feature" as const }
  ];
  for (const route of unlinkRoutes) {
    app.delete<{
      Params: { id: number; attachmentId: number };
      Querystring: { expectedVersion: number; orphanAction?: "add-to-library" };
    }>(
      route.path,
      {
        config: { auth: { resource: "attachments", action: "write" } },
        schema: { params: ownerAttachmentParamSchema, querystring: attachmentLifecycleQuerySchema, response: { 204: { type: "null" } } }
      },
      async (request, reply) => {
        await unlinkAttachment(
          app.db,
          { type: route.ownerType, id: request.params.id },
          request.params.attachmentId,
          request.query,
          createJournalActor(request.currentUser)
        );
        return reply.status(204).send();
      }
    );
  }

  app.delete<{ Params: { id: number }; Querystring: { expectedVersion: number } }>(
    "/attachments/:id",
    {
      config: { auth: { resource: "attachments", action: "delete" } },
      schema: { params: idParamSchema, querystring: expectedVersionQuerySchema, response: { 204: { type: "null" } } }
    },
    async (request, reply) => {
      await deleteAttachment(app.db, request.params.id, request.query.expectedVersion, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );
}
