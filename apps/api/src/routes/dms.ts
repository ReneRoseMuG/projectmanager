import type { FastifyInstance, FastifyRequest } from "fastify";
import { createUnboundAttachment, deleteAttachment } from "../services/attachments.service.js";
import {
  assignCategoryToAttachment,
  assignCategoryToAttachments,
  createAttachmentCategory,
  deleteAttachmentCategory,
  listAttachmentCategories,
  removeCategoryFromAttachment,
  updateAttachmentCategory
} from "../services/attachment-category.service.js";
import {
  addAttachmentsToFolder,
  addAttachmentToFolder,
  createAttachmentFolder,
  deleteAttachmentFolder,
  listAttachmentFolders,
  moveAttachmentBetweenFolders,
  removeAttachmentFromFolder,
  updateAttachmentFolder
} from "../services/attachment-folder.service.js";
import { getDocument, listDocumentLibrary, listDocumentLibraryPaginated, setDocumentTags, updateDocumentMetadata } from "../services/document.service.js";
import { buildDocumentsArchive } from "../services/document-download.service.js";
import { createJournalActor } from "../services/journal.service.js";
import { badRequest } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, paginatedResponseSchema, paginationQuerySchema, tagIdsBodySchema } from "../utils/route-schemas.js";

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
    q: { type: "string" },
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
    category: { type: "integer", minimum: 1 }
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

// Mehrfachauswahl-Body: mindestens eine gültige Dokument-ID.
const bulkAttachmentIdsBodySchema = {
  type: "object",
  required: ["attachmentIds"],
  additionalProperties: false,
  properties: {
    attachmentIds: {
      type: "array",
      minItems: 1,
      items: { type: "integer", minimum: 1 }
    }
  }
} as const;

const folderIdParamSchema = {
  type: "object",
  required: ["folderId"],
  properties: {
    folderId: { type: "integer", minimum: 1 }
  }
} as const;

const categoryIdParamSchema = {
  type: "object",
  required: ["categoryId"],
  properties: {
    categoryId: { type: "integer", minimum: 1 }
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
  app.get<{ Querystring: { folder?: string; category?: number; tag?: number; type?: string; q?: string; page?: number; pageSize?: number } }>(
    "/documents",
    { config: attachmentsAuth("read"), schema: { querystring: documentLibraryQuerySchema, response: { 200: { anyOf: [arrayResponseSchema, paginatedResponseSchema] } } } },
    async (request) => {
      const { folder: folderParam, category, tag, type, q, page, pageSize } = request.query;
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
      const documentFilter = { folder, category, tag, type, q };
      // Opt-in: nur wenn `page` gesetzt ist, paginiert antworten — sonst Array-Alt-Verhalten.
      if (page !== undefined) {
        return listDocumentLibraryPaginated(app.db, documentFilter, page, pageSize ?? 25);
      }
      return listDocumentLibrary(app.db, documentFilter);
    }
  );

  // `folder` und `category` sind der Ablage-Kontext der Dokumente-Seite: Wer in einer Sammlung
  // bzw. unter einer Kategorie steht und hochlädt, ordnet die Datei genau dort ein. Beide sind
  // optional und wirken symmetrisch. Schlägt eine Zuordnung fehl (unbekanntes Ziel → 404), ist das
  // Attachment bereits angelegt — bekannte Grenze, die schon für `folder` galt.
  app.post<{ Querystring: { folder?: number; category?: number } }>(
    "/documents",
    { config: attachmentsAuth("write"), schema: { ...uploadBodySchema, querystring: uploadQuerySchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => {
      const upload = await readUpload(request);
      const document = await createUnboundAttachment(app.db, upload, createJournalActor(request.currentUser));
      if (request.query.folder !== undefined) {
        await addAttachmentToFolder(app.db, request.query.folder, document.id);
      }
      if (request.query.category !== undefined) {
        await assignCategoryToAttachment(app.db, document.id, request.query.category);
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

  // --- Bulk-Operationen (Mehrfachauswahl) ---
  app.post<{ Params: { folderId: number }; Body: { attachmentIds: number[] } }>(
    "/documents/bulk/folders/:folderId",
    { config: attachmentsAuth("write"), schema: { params: folderIdParamSchema, body: bulkAttachmentIdsBodySchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await addAttachmentsToFolder(app.db, request.params.folderId, request.body.attachmentIds);
      return reply.status(204).send();
    }
  );

  app.post<{ Params: { categoryId: number }; Body: { attachmentIds: number[] } }>(
    "/documents/bulk/categories/:categoryId",
    { config: attachmentsAuth("write"), schema: { params: categoryIdParamSchema, body: bulkAttachmentIdsBodySchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await assignCategoryToAttachments(app.db, request.params.categoryId, request.body.attachmentIds);
      return reply.status(204).send();
    }
  );

  // Bulk-Download: ausgewählte Dokumente als Zip streamen. Kein Response-Schema (Binär-Stream).
  // buildDocumentsArchive wirft bei leerer/unbekannter Auswahl VOR dem Hijack — Fastify liefert
  // dann regulär 400/404. Erst wenn ein Archiv steht, übernehmen wir den rohen Response-Stream.
  app.post<{ Body: { attachmentIds: number[] } }>(
    "/documents/download",
    { config: attachmentsAuth("read"), schema: { body: bulkAttachmentIdsBodySchema } },
    async (request, reply) => {
      const archive = await buildDocumentsArchive(app.db, request.body.attachmentIds);
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="dokumente.zip"'
      });
      archive.on("error", (error) => {
        request.log.error(error, "Bulk-Download-Zip fehlgeschlagen");
        reply.raw.destroy(error);
      });
      archive.pipe(reply.raw);
      await archive.finalize();
    }
  );
}
