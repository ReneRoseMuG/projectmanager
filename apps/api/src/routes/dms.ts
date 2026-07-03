import type { FastifyInstance, FastifyRequest } from "fastify";
import { createUnboundAttachment, deleteAttachment } from "../services/attachments.service.js";
import {
  assignCategoryToAttachment,
  createAttachmentCategory,
  deleteAttachmentCategory,
  listAttachmentCategories,
  removeCategoryFromAttachment,
  updateAttachmentCategory
} from "../services/attachment-category.service.js";
import {
  addAttachmentToFolder,
  createAttachmentFolder,
  deleteAttachmentFolder,
  listAttachmentFolders,
  moveAttachmentBetweenFolders,
  removeAttachmentFromFolder,
  updateAttachmentFolder
} from "../services/attachment-folder.service.js";
import { getDocument, listDocumentLibrary, setDocumentTags, updateDocumentMetadata } from "../services/document.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, tagIdsBodySchema } from "../utils/route-schemas.js";

// MS-75 (DMS): Alle Routen laufen unter der bestehenden Ressource "attachments" (kein
// eigener Auth-Katalogeintrag). Da die Pfade (/documents, /attachment-categories,
// /attachment-folders) nicht das Segment "/attachments" tragen, wird die Berechtigung
// hier EXPLIZIT je Endpunkt gesetzt — sonst greift der Default "projects".
function attachmentsAuth(action: "read" | "write" | "delete") {
  return { auth: { resource: "attachments" as const, action } };
}

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

const categoryBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    color: { type: "string" }
  }
} as const;

const categoryPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    color: { type: "string" },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const folderBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    parentId: { type: ["integer", "null"], minimum: 1 },
    projectId: { type: ["integer", "null"], minimum: 1 }
  }
} as const;

const folderPatchSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    parentId: { type: ["integer", "null"], minimum: 1 },
    projectId: { type: ["integer", "null"], minimum: 1 },
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
    category: { type: "integer", minimum: 1 },
    tag: { type: "integer", minimum: 1 },
    type: { type: "string" },
    q: { type: "string" }
  }
} as const;

const uploadQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    folder: { type: "integer", minimum: 1 }
  }
} as const;

const folderDeleteQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recursive: { type: "boolean" }
  }
} as const;

const documentCategoryParamSchema = {
  type: "object",
  required: ["id", "categoryId"],
  properties: {
    id: { type: "integer", minimum: 1 },
    categoryId: { type: "integer", minimum: 1 }
  }
} as const;

const folderDocumentParamSchema = {
  type: "object",
  required: ["folderId", "attachmentId"],
  properties: {
    folderId: { type: "integer", minimum: 1 },
    attachmentId: { type: "integer", minimum: 1 }
  }
} as const;

const moveDocumentBodySchema = {
  type: "object",
  required: ["fromFolderId", "toFolderId"],
  additionalProperties: false,
  properties: {
    fromFolderId: { type: "integer", minimum: 1 },
    toFolderId: { type: "integer", minimum: 1 }
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
  // --- Kategorien ---
  app.get(
    "/attachment-categories",
    { config: attachmentsAuth("read"), schema: { response: { 200: arrayResponseSchema } } },
    async () => listAttachmentCategories(app.db)
  );

  app.post<{ Body: { name: string; color?: string } }>(
    "/attachment-categories",
    { config: attachmentsAuth("write"), schema: { body: categoryBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const category = await createAttachmentCategory(app.db, request.body, currentUserId(request));
      return reply.status(201).send(category);
    }
  );

  app.patch<{ Params: { id: number }; Body: { name?: string; color?: string; expectedVersion: number } }>(
    "/attachment-categories/:id",
    { config: attachmentsAuth("write"), schema: { params: idParamSchema, body: categoryPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateAttachmentCategory(app.db, request.params.id, request.body, currentUserId(request))
  );

  app.delete<{ Params: { id: number } }>(
    "/attachment-categories/:id",
    { config: attachmentsAuth("delete"), schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachmentCategory(app.db, request.params.id);
      return reply.status(204).send();
    }
  );

  // --- Sammlungen (virtuelle Ordner) ---
  app.get(
    "/attachment-folders",
    { config: attachmentsAuth("read"), schema: { response: { 200: arrayResponseSchema } } },
    async () => listAttachmentFolders(app.db)
  );

  app.post<{ Body: { name: string; parentId?: number | null; projectId?: number | null } }>(
    "/attachment-folders",
    { config: attachmentsAuth("write"), schema: { body: folderBodySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const folder = await createAttachmentFolder(app.db, request.body, currentUserId(request));
      return reply.status(201).send(folder);
    }
  );

  app.patch<{ Params: { id: number }; Body: { name?: string; parentId?: number | null; projectId?: number | null; expectedVersion: number } }>(
    "/attachment-folders/:id",
    { config: attachmentsAuth("write"), schema: { params: idParamSchema, body: folderPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateAttachmentFolder(app.db, request.params.id, request.body, currentUserId(request))
  );

  app.delete<{ Params: { id: number }; Querystring: { recursive?: boolean } }>(
    "/attachment-folders/:id",
    { config: attachmentsAuth("delete"), schema: { params: idParamSchema, querystring: folderDeleteQuerySchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachmentFolder(app.db, request.params.id, { recursive: request.query.recursive === true });
      return reply.status(204).send();
    }
  );

  // --- Dokument-Sammlung-Zuordnung ---
  app.post<{ Params: { folderId: number; attachmentId: number } }>(
    "/attachment-folders/:folderId/documents/:attachmentId",
    { config: attachmentsAuth("write"), schema: { params: folderDocumentParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await addAttachmentToFolder(app.db, request.params.folderId, request.params.attachmentId);
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { folderId: number; attachmentId: number } }>(
    "/attachment-folders/:folderId/documents/:attachmentId",
    { config: attachmentsAuth("write"), schema: { params: folderDocumentParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await removeAttachmentFromFolder(app.db, request.params.folderId, request.params.attachmentId);
      return reply.status(204).send();
    }
  );

  // --- Dokumentenbibliothek ---
  app.get<{ Querystring: { folder?: string; category?: number; tag?: number; type?: string; q?: string } }>(
    "/documents",
    { config: attachmentsAuth("read"), schema: { querystring: documentLibraryQuerySchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      const { folder: folderParam, category, tag, type, q } = request.query;
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
      return listDocumentLibrary(app.db, { folder, category, tag, type, q });
    }
  );

  app.post<{ Querystring: { folder?: number } }>(
    "/documents",
    { config: attachmentsAuth("write"), schema: { ...uploadBodySchema, querystring: uploadQuerySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const upload = await readUpload(request);
      const document = await createUnboundAttachment(app.db, upload, createJournalActor(request.currentUser));
      if (request.query.folder !== undefined) {
        await addAttachmentToFolder(app.db, request.query.folder, document.id);
      }
      return reply.status(201).send(await getDocument(app.db, document.id));
    }
  );

  app.get<{ Params: { id: number } }>(
    "/documents/:id",
    { config: attachmentsAuth("read"), schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => getDocument(app.db, request.params.id)
  );

  app.patch<{ Params: { id: number }; Body: { displayName?: string | null; description?: string | null; expectedVersion: number } }>(
    "/documents/:id",
    { config: attachmentsAuth("write"), schema: { params: idParamSchema, body: metadataPatchSchema, response: { 200: objectResponseSchema } } },
    async (request) => updateDocumentMetadata(app.db, request.params.id, request.body, currentUserId(request))
  );

  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/documents/:id/tags",
    { config: attachmentsAuth("write"), schema: { params: idParamSchema, body: tagIdsBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => setDocumentTags(app.db, request.params.id, request.body.tagIds)
  );

  app.post<{ Params: { id: number }; Body: { fromFolderId: number; toFolderId: number } }>(
    "/documents/:id/move",
    { config: attachmentsAuth("write"), schema: { params: idParamSchema, body: moveDocumentBodySchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await moveAttachmentBetweenFolders(app.db, request.params.id, request.body.fromFolderId, request.body.toFolderId);
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number } }>(
    "/documents/:id",
    { config: attachmentsAuth("delete"), schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteAttachment(app.db, request.params.id, createJournalActor(request.currentUser));
      return reply.status(204).send();
    }
  );

  // --- Dokument-Kategorie-Zuordnung ---
  app.post<{ Params: { id: number; categoryId: number } }>(
    "/documents/:id/categories/:categoryId",
    { config: attachmentsAuth("write"), schema: { params: documentCategoryParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await assignCategoryToAttachment(app.db, request.params.id, request.params.categoryId);
      return reply.status(204).send();
    }
  );

  app.delete<{ Params: { id: number; categoryId: number } }>(
    "/documents/:id/categories/:categoryId",
    { config: attachmentsAuth("write"), schema: { params: documentCategoryParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await removeCategoryFromAttachment(app.db, request.params.id, request.params.categoryId);
      return reply.status(204).send();
    }
  );
}
