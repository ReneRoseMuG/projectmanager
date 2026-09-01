import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AttachmentVersionInput } from "@taskmanager/shared-types";
import { createReadStream } from "node:fs";
import { deleteAttachment, getAttachmentFile, openAttachment } from "../services/attachments.service.js";
import {
  createAttachmentFolder,
  deleteAttachmentFolder,
  listAttachmentFolders,
  setAttachmentFolder,
  updateAttachmentFolder
} from "../services/attachment-folder.service.js";
import { addDocumentTagsBulk, getDocument, listDocumentLibrary, listDocumentLibraryPaginated, setDocumentFolderBulk, setDocumentTags, updateDocumentMetadata } from "../services/document.service.js";
import { importDocument } from "../services/document-import.service.js";
import { buildDocumentsArchive } from "../services/document-download.service.js";
import { getDocumentDuplicateCheck, startDocumentDuplicateCheck } from "../services/document-duplicate-check.service.js";
import { getAttachmentPreview, getAttachmentPreviewFile, getAttachmentThumbnail } from "../services/attachment-preview.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest, notFound } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, paginatedResponseSchema, paginationQuerySchema } from "../utils/route-schemas.js";

function documentsAuth(action: "read" | "write" | "delete") {
  return { auth: { resource: "documents" as const, action } };
}

function contentDisposition(filename: string, download: boolean): string {
  const fallback = filename.replace(/["\\\r\n]/g, "_");
  const mode = download ? "attachment" : "inline";
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

const documentContentQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: { download: { type: "boolean" } }
} as const;

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

const folderBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    parentId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

const folderPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    parentId: { type: ["integer", "null"], minimum: 1 },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const metadataPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    displayName: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const documentLibraryQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    folder: { type: "string" },
    category: {},
    tag: { type: "integer", minimum: 1 },
    tags: { type: "string", minLength: 1, maxLength: 220, pattern: "^[0-9]+(,[0-9]+)*$" },
    type: { type: "string", enum: ["image/", "application/pdf", "text/", "video/", "audio/"] },
    q: { type: "string", maxLength: 200 },
    // Opt-in-Pagination: ist `page` gesetzt, liefert die Route Paginated<Attachment>,
    // sonst weiterhin das nackte Array (Rückwärtskompatibilität für MCP/interne Aufrufer).
    ...paginationQuerySchema
  }
} as const;

const uploadQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    folder: { type: "integer", minimum: 1 },
    tags: { type: "string", minLength: 1, maxLength: 220, pattern: "^[0-9]+(,[0-9]+)*$" },
    folders: {},
    category: {}
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

const documentFolderBodySchema = {
  type: "object",
  required: ["folderId", "expectedVersion"],
  additionalProperties: false,
  properties: {
    folderId: { type: ["integer", "null"], minimum: 1 },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const documentTagsBodySchema = {
  type: "object",
  required: ["tagIds", "expectedVersion"],
  additionalProperties: false,
  properties: {
    tagIds: { type: "array", maxItems: 20, uniqueItems: true, items: { type: "integer", minimum: 1 } },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const bulkDocumentTagsBodySchema = {
  type: "object",
  required: ["attachments", "tagIds"],
  additionalProperties: false,
  properties: {
    attachments: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        type: "object",
        required: ["id", "expectedVersion"],
        additionalProperties: false,
        properties: {
          id: { type: "integer", minimum: 1 },
          expectedVersion: { type: "integer", minimum: 1 }
        }
      }
    },
    tagIds: { type: "array", minItems: 1, maxItems: 20, uniqueItems: true, items: { type: "integer", minimum: 1 } }
  }
} as const;

const bulkDocumentFolderBodySchema = {
  type: "object",
  required: ["attachments"],
  additionalProperties: false,
  properties: {
    attachments: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        type: "object",
        required: ["id", "expectedVersion"],
        additionalProperties: false,
        properties: {
          id: { type: "integer", minimum: 1 },
          expectedVersion: { type: "integer", minimum: 1 }
        }
      }
    }
  }
} as const;

const documentArchiveBodySchema = {
  type: "object",
  required: ["attachmentIds"],
  additionalProperties: false,
  properties: {
    attachmentIds: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      uniqueItems: true,
      items: { type: "integer", minimum: 1 }
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

function currentUserId(request: FastifyRequest): number | undefined {
  return request.currentUser?.id;
}

export async function registerDmsRoutes(app: FastifyInstance): Promise<void> {
  // --- Sammlungen (virtuelle Ordner) ---
  app.get(
    "/attachment-folders",
    { config: documentsAuth("read"), schema: { response: { 200: arrayResponseSchema } } },
    async () => listAttachmentFolders(app.db)
  );

  app.post<{ Body: { name: string; parentId?: number | null } }>(
    "/attachment-folders",
    { config: documentsAuth("write"), schema: { body: folderBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const folder = await createAttachmentFolder(app.db, request.body, currentUserId(request));
      return reply.status(201).send(folder);
    }
  );

  app.patch<{ Params: { id: number }; Body: { name?: string; parentId?: number | null; expectedVersion: number } }>(
    "/attachment-folders/:id",
    { config: documentsAuth("write"), schema: { params: idParamSchema, body: folderPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateAttachmentFolder(app.db, request.params.id, request.body, currentUserId(request))
  );

  app.delete<{ Params: { id: number }; Querystring: { expectedVersion: number } }>(
    "/attachment-folders/:id",
    { config: documentsAuth("delete"), schema: { params: idParamSchema, querystring: expectedVersionQuerySchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachmentFolder(app.db, request.params.id, request.query.expectedVersion);
      return reply.status(204).send();
    }
  );

  // --- Dokumentenbibliothek ---
  app.get<{ Querystring: { folder?: string; category?: unknown; tag?: number; tags?: string; type?: string; q?: string; page?: number; pageSize?: number } }>(
    "/documents",
    { config: documentsAuth("read"), schema: { querystring: documentLibraryQuerySchema, response: { 200: { anyOf: [arrayResponseSchema, paginatedResponseSchema] } } } },
    async (request) => {
      if (request.query.category !== undefined) {
        throw badRequest("Kategorien werden seit MS-80 nicht mehr unterstützt. Bitte DMS-Tags verwenden.");
      }
      const { folder: folderParam, tag, tags: tagsParam, type, q, page, pageSize } = request.query;
      let folder: number | "unsorted" | undefined;
      if (folderParam === "unsorted") {
        folder = "unsorted";
      } else if (folderParam !== undefined && folderParam !== "") {
        const parsed = Number(folderParam);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw badRequest("folder muss 'unsorted' oder eine gültige Sammlungs-ID sein.");
        }
        folder = parsed;
      }
      const tagIds = [
        ...(tag !== undefined ? [tag] : []),
        ...(tagsParam ? tagsParam.split(",").map(Number) : [])
      ];
      const tags = [...new Set(tagIds)];
      if (tags.length > 20) {
        throw badRequest("Höchstens 20 Tags können gleichzeitig gefiltert werden.");
      }
      const documentFilter = { folder, tags, type, q };
      // Opt-in: nur wenn `page` gesetzt ist, paginiert antworten — sonst Array-Alt-Verhalten.
      if (page !== undefined) {
        return listDocumentLibraryPaginated(app.db, documentFilter, page, pageSize ?? 25);
      }
      return listDocumentLibrary(app.db, documentFilter);
    }
  );

  app.post<{ Querystring: { folder?: number; tags?: string; folders?: unknown; category?: unknown } }>(
    "/documents",
    { config: documentsAuth("write"), schema: { ...uploadBodySchema, querystring: uploadQuerySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      if (request.query.folders !== undefined) {
        throw badRequest("Mehrfachsammlungen werden seit MS-80 nicht mehr unterstützt. Bitte höchstens eine Sammlung über 'folder' angeben.");
      }
      if (request.query.category !== undefined) {
        throw badRequest("Kategorien werden seit MS-80 nicht mehr unterstützt. Bitte DMS-Tags verwenden.");
      }
      const upload = await readUpload(request);
      const tagIds = request.query.tags?.split(",").map(Number);
      const document = await importDocument(
        app.db,
        upload,
        { folderId: request.query.folder, tagIds },
        createJournalActor(request.currentUser)
      );
      return reply.status(201).send(document);
    }
  );

  app.get(
    "/documents/duplicate-check",
    { config: documentsAuth("read"), schema: { response: { 200: objectResponseSchema } } },
    async () => getDocumentDuplicateCheck(app.db)
  );

  app.post(
    "/documents/duplicate-check",
    { config: documentsAuth("write"), schema: { response: { 202: objectResponseSchema } } },
    async (_request, reply) => reply.status(202).send(await startDocumentDuplicateCheck(app.db))
  );

  app.post<{ Body: { attachments: AttachmentVersionInput[]; tagIds: number[] } }>(
    "/documents/bulk/tags",
    {
      config: documentsAuth("write"),
      schema: { body: bulkDocumentTagsBodySchema, response: { 200: arrayResponseSchema } }
    },
    async (request) => {
      return addDocumentTagsBulk(
        app.db,
        request.body.attachments,
        request.body.tagIds,
        createJournalActor(request.currentUser)
      );
    }
  );

  app.get<{ Params: { id: number } }>(
    "/documents/:id",
    { config: documentsAuth("read"), schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getDocument(app.db, request.params.id)
  );

  app.post<{ Params: { id: number }; Body: { attachments: AttachmentVersionInput[] } }>(
    "/documents/bulk/folders/:id",
    {
      config: documentsAuth("write"),
      schema: { params: idParamSchema, body: bulkDocumentFolderBodySchema, response: { 200: arrayResponseSchema } }
    },
    async (request) => setDocumentFolderBulk(
      app.db,
      request.body.attachments,
      request.params.id,
      createJournalActor(request.currentUser)
    )
  );

  app.post<{ Body: { attachmentIds: number[] } }>(
    "/documents/download",
    {
      config: documentsAuth("read"),
      schema: { body: documentArchiveBodySchema }
    },
    async (request, reply) => {
      const archive = await buildDocumentsArchive(app.db, request.body.attachmentIds);
      archive.on("error", (error) => reply.raw.destroy(error));
      reply
        .type("application/zip")
        .header("Content-Disposition", "attachment; filename=\"dokumente.zip\"");
      void archive.finalize();
      return reply.send(archive);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/documents/:id/thumbnail",
    { config: documentsAuth("read"), schema: { params: idParamSchema } },
    async (request, reply) => {
      await getDocument(app.db, request.params.id);
      const thumbnailPath = await getAttachmentThumbnail(app.db, request.params.id);
      if (!thumbnailPath) {
        throw notFound(`No thumbnail available for attachment with id ${request.params.id}`);
      }
      return reply
        .type("image/png")
        .header("Cache-Control", "private, max-age=86400")
        .send(createReadStream(thumbnailPath));
    }
  );

  app.get<{ Params: { id: number }; Querystring: { download?: boolean } }>(
    "/documents/:id/content",
    { config: documentsAuth("read"), schema: { params: idParamSchema, querystring: documentContentQuerySchema } },
    async (request, reply) => {
      const file = await getAttachmentFile(app.db, request.params.id, "document");
      return reply
        .type(file.mimetype)
        .header("Content-Length", String(file.size))
        .header("Content-Disposition", contentDisposition(file.originalName, request.query.download === true))
        .send(createReadStream(file.diskPath));
    }
  );

  app.get<{ Params: { id: number } }>(
    "/documents/:id/preview",
    { config: documentsAuth("read"), schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      await getDocument(app.db, request.params.id);
      return getAttachmentPreview(app.db, request.params.id);
    }
  );

  app.get<{ Params: { id: number } }>(
    "/documents/:id/preview-file",
    { config: documentsAuth("read"), schema: { params: idParamSchema } },
    async (request, reply) => {
      await getDocument(app.db, request.params.id);
      const file = await getAttachmentPreviewFile(app.db, request.params.id);
      return reply
        .type("application/pdf")
        .header("Content-Length", String(file.size))
        .header("Content-Disposition", "inline")
        .send(createReadStream(file.diskPath));
    }
  );

  app.post<{ Params: { id: number } }>(
    "/documents/:id/open",
    { config: documentsAuth("read"), schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await openAttachment(app.db, request.params.id, app.fileOpener, createJournalActor(request.currentUser), "document");
      return reply.status(204).send();
    }
  );

  app.patch<{ Params: { id: number }; Body: { displayName?: string | null; description?: string | null; expectedVersion: number } }>(
    "/documents/:id",
    { config: documentsAuth("write"), schema: { params: idParamSchema, body: metadataPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateDocumentMetadata(app.db, request.params.id, request.body, createJournalActor(request.currentUser))
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[]; expectedVersion: number } }>(
    "/documents/:id/tags",
    { config: documentsAuth("write"), schema: { params: idParamSchema, body: documentTagsBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => setDocumentTags(
      app.db,
      request.params.id,
      request.body.tagIds,
      request.body.expectedVersion,
      createJournalActor(request.currentUser)
    )
  );

  app.put<{ Params: { id: number }; Body: { folderId: number | null; expectedVersion: number } }>(
    "/documents/:id/folder",
    { config: documentsAuth("write"), schema: { params: idParamSchema, body: documentFolderBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      await setAttachmentFolder(app.db, request.params.id, request.body, createJournalActor(request.currentUser));
      return getDocument(app.db, request.params.id);
    }
  );

  app.delete<{ Params: { id: number }; Querystring: { expectedVersion: number } }>(
    "/documents/:id",
    {
      config: documentsAuth("delete"),
      schema: { params: idParamSchema, querystring: expectedVersionQuerySchema, response: { 204: { type: "null" } } }
    },
    async (request, reply) => {
      await deleteAttachment(
        app.db,
        request.params.id,
        request.query.expectedVersion,
        createJournalActor(request.currentUser),
        "document"
      );
      return reply.status(204).send();
    }
  );

}
