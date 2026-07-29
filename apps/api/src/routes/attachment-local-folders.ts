import { ATTACHMENT_OWNER_TYPES, type AttachmentOwner } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import {
  createAttachmentLocalFolder,
  deleteAttachmentLocalFolder,
  getAttachmentLocalFile,
  listAttachmentLocalEntries,
  listAttachmentLocalFolders,
  openAttachmentLocalFile,
  pickWindowsDirectory
} from "../services/attachment-local-folder.service.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, paginatedResponseSchema } from "../utils/route-schemas.js";

const ownerProperties = {
  ownerType: { type: "string", enum: ATTACHMENT_OWNER_TYPES },
  ownerId: { type: "integer", minimum: 1 }
} as const;

const ownerQuerySchema = {
  type: "object",
  required: ["ownerType", "ownerId"],
  additionalProperties: false,
  properties: ownerProperties
} as const;

const createBodySchema = {
  type: "object",
  required: ["ownerType", "ownerId", "rootPath"],
  additionalProperties: false,
  properties: {
    ...ownerProperties,
    rootPath: { type: "string", minLength: 1, maxLength: 32767 },
    name: { type: "string", minLength: 1, maxLength: 191 }
  }
} as const;

const entriesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    relativePath: { type: "string", maxLength: 32767 },
    page: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 200 }
  }
} as const;

const localFileQuerySchema = {
  type: "object",
  required: ["relativePath"],
  additionalProperties: false,
  properties: {
    relativePath: { type: "string", minLength: 1, maxLength: 32767 },
    download: { type: "boolean" }
  }
} as const;

const localFileBodySchema = {
  type: "object",
  required: ["relativePath"],
  additionalProperties: false,
  properties: {
    relativePath: { type: "string", minLength: 1, maxLength: 32767 }
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

function ownerFromInput(input: { ownerType: AttachmentOwner["type"]; ownerId: number }): AttachmentOwner {
  return { type: input.ownerType, id: input.ownerId };
}

function contentDisposition(filename: string, download: boolean): string {
  const fallback = filename.replace(/["\\\r\n]/g, "_");
  const mode = download ? "attachment" : "inline";
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function registerAttachmentLocalFolderRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { ownerType: AttachmentOwner["type"]; ownerId: number };
  }>(
    "/attachment-local-folders",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { querystring: ownerQuerySchema, response: { 200: arrayResponseSchema } }
    },
    async (request) => listAttachmentLocalFolders(app.db, ownerFromInput(request.query))
  );

  app.post(
    "/attachment-local-folders/pick",
    {
      config: { auth: { resource: "attachments", action: "write" } },
      schema: { response: { 200: objectResponseSchema, 204: { type: "null" } } }
    },
    async (_request, reply) => {
      const selectedPath = await pickWindowsDirectory();
      if (!selectedPath) {
        return reply.status(204).send();
      }
      return reply.send({ path: selectedPath });
    }
  );

  app.post<{
    Body: {
      ownerType: AttachmentOwner["type"];
      ownerId: number;
      rootPath: string;
      name?: string;
    };
  }>(
    "/attachment-local-folders",
    {
      config: { auth: { resource: "attachments", action: "write" } },
      schema: { body: createBodySchema, response: { 201: objectResponseSchema } }
    },
    async (request, reply) =>
      reply.status(201).send(
        await createAttachmentLocalFolder(
          app.db,
          {
            owner: ownerFromInput(request.body),
            rootPath: request.body.rootPath,
            name: request.body.name
          },
          request.currentUser?.id
        )
      )
  );

  app.delete<{ Params: { id: number }; Querystring: { expectedVersion: number } }>(
    "/attachment-local-folders/:id",
    {
      config: { auth: { resource: "attachments", action: "write" } },
      schema: {
        params: idParamSchema,
        querystring: expectedVersionQuerySchema,
        response: { 204: { type: "null" } }
      }
    },
    async (request, reply) => {
      await deleteAttachmentLocalFolder(app.db, request.params.id, request.query.expectedVersion);
      return reply.status(204).send();
    }
  );

  app.get<{
    Params: { id: number };
    Querystring: { relativePath?: string; page?: number; pageSize?: number };
  }>(
    "/attachment-local-folders/:id/entries",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: {
        params: idParamSchema,
        querystring: entriesQuerySchema,
        response: { 200: paginatedResponseSchema }
      }
    },
    async (request) =>
      listAttachmentLocalEntries(
        app.db,
        request.params.id,
        request.query.relativePath,
        request.query.page ?? 1,
        request.query.pageSize ?? 50
      )
  );

  app.get<{
    Params: { id: number };
    Querystring: { relativePath: string; download?: boolean };
  }>(
    "/attachment-local-folders/:id/content",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: { params: idParamSchema, querystring: localFileQuerySchema }
    },
    async (request, reply) => {
      const file = await getAttachmentLocalFile(app.db, request.params.id, request.query.relativePath);
      return reply
        .type(file.mimetype)
        .header("Content-Length", String(file.size))
        .header("Content-Disposition", contentDisposition(file.name, request.query.download === true))
        .send(createReadStream(file.diskPath));
    }
  );

  app.post<{ Params: { id: number }; Body: { relativePath: string } }>(
    "/attachment-local-folders/:id/open",
    {
      config: { auth: { resource: "attachments", action: "read" } },
      schema: {
        params: idParamSchema,
        body: localFileBodySchema,
        response: { 204: { type: "null" } }
      }
    },
    async (request, reply) => {
      await openAttachmentLocalFile(
        app.db,
        request.params.id,
        request.body.relativePath,
        app.fileOpener
      );
      return reply.status(204).send();
    }
  );
}
