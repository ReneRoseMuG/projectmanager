import type {
  AttachmentOwner,
  AuthResource,
  ParentAttachmentFolderInput,
  ParentAttachmentFolderUpdate,
  ParentDocumentLinkInput,
  ParentFileMoveInput
} from "@taskmanager/shared-types";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { requirePermission } from "../plugins/auth.js";
import { createJournalActor } from "../services/journal.service.js";
import {
  createParentAttachmentFolder,
  createParentDocumentLink,
  deleteParentAttachmentFolder,
  deleteParentDocumentLink,
  listParentAttachmentFolders,
  listParentDocumentLinks,
  moveParentAttachment,
  moveParentDocumentLink,
  updateParentAttachmentFolder
} from "../services/parent-files.service.js";
import { arrayResponseSchema, objectResponseSchema } from "../utils/route-schemas.js";

const ownerIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: { id: { type: "integer", minimum: 1 } }
} as const;

const ownerFolderParamsSchema = {
  type: "object",
  required: ["id", "folderId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    folderId: { type: "integer", minimum: 1 }
  }
} as const;

const ownerAttachmentParamsSchema = {
  type: "object",
  required: ["id", "attachmentId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    attachmentId: { type: "integer", minimum: 1 }
  }
} as const;

const ownerDocumentLinkParamsSchema = {
  type: "object",
  required: ["id", "linkId"],
  additionalProperties: false,
  properties: {
    id: { type: "integer", minimum: 1 },
    linkId: { type: "integer", minimum: 1 }
  }
} as const;

const folderInputSchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255 },
    parentId: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] }
  }
} as const;

const folderUpdateSchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255 },
    parentId: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const documentLinkInputSchema = {
  type: "object",
  required: ["documentId"],
  additionalProperties: false,
  properties: {
    documentId: { type: "integer", minimum: 1 },
    folderId: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] }
  }
} as const;

const moveInputSchema = {
  type: "object",
  required: ["folderId", "expectedVersion"],
  additionalProperties: false,
  properties: {
    folderId: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
    expectedVersion: { type: "integer", minimum: 1 }
  }
} as const;

const expectedVersionQuerySchema = {
  type: "object",
  required: ["expectedVersion"],
  additionalProperties: false,
  properties: { expectedVersion: { type: "integer", minimum: 1 } }
} as const;

interface ParentRouteDefinition {
  basePath: string;
  ownerType: AttachmentOwner["type"];
  ownerResource: AuthResource;
}

const parentRoutes: ParentRouteDefinition[] = [
  { basePath: "/projects", ownerType: "project", ownerResource: "projects" },
  { basePath: "/milestones", ownerType: "milestone", ownerResource: "milestones" },
  { basePath: "/tasks", ownerType: "task", ownerResource: "tasks" },
  { basePath: "/features", ownerType: "feature", ownerResource: "features" },
  { basePath: "/wiki", ownerType: "wikiPage", ownerResource: "wiki" },
  { basePath: "/wiki-pages", ownerType: "wikiPage", ownerResource: "wiki" },
  { basePath: "/tickets", ownerType: "ticket", ownerResource: "tickets" }
];

function owner(definition: ParentRouteDefinition, id: number): AttachmentOwner {
  return { type: definition.ownerType, id };
}

function requireOwnerPermission(resource: AuthResource, action: "read" | "write") {
  const guard = requirePermission(resource, action);
  return async (request: FastifyRequest): Promise<void> => {
    if (request.session === undefined && request.currentUser === undefined) {
      return;
    }
    await guard(request);
  };
}

export async function registerParentFileRoutes(app: FastifyInstance): Promise<void> {
  for (const definition of parentRoutes) {
    const folderPath = `${definition.basePath}/:id/attachment-folders`;
    const folderDetailPath = `${folderPath}/:folderId`;
    const documentLinkPath = `${definition.basePath}/:id/document-links`;
    const documentLinkDetailPath = `${documentLinkPath}/:linkId`;

    app.get<{ Params: { id: number } }>(folderPath, {
      config: { auth: { resource: "attachments", action: "read" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "read"),
      schema: { params: ownerIdParamsSchema, response: { 200: arrayResponseSchema } }
    }, async (request) => listParentAttachmentFolders(app.db, owner(definition, request.params.id)));

    app.post<{ Params: { id: number }; Body: ParentAttachmentFolderInput }>(folderPath, {
      config: { auth: { resource: "attachments", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerIdParamsSchema, body: folderInputSchema, response: { 201: objectResponseSchema } }
    }, async (request, reply) => reply.status(201).send(await createParentAttachmentFolder(
      app.db,
      owner(definition, request.params.id),
      request.body,
      createJournalActor(request.currentUser)
    )));

    app.patch<{ Params: { id: number; folderId: number }; Body: ParentAttachmentFolderUpdate }>(folderDetailPath, {
      config: { auth: { resource: "attachments", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerFolderParamsSchema, body: folderUpdateSchema, response: { 200: objectResponseSchema } }
    }, async (request) => updateParentAttachmentFolder(
      app.db,
      owner(definition, request.params.id),
      request.params.folderId,
      request.body,
      createJournalActor(request.currentUser)
    ));

    app.delete<{ Params: { id: number; folderId: number }; Querystring: { expectedVersion: number } }>(folderDetailPath, {
      config: { auth: { resource: "attachments", action: "delete" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerFolderParamsSchema, querystring: expectedVersionQuerySchema, response: { 204: { type: "null" } } }
    }, async (request, reply) => {
      await deleteParentAttachmentFolder(
        app.db,
        owner(definition, request.params.id),
        request.params.folderId,
        request.query.expectedVersion,
        createJournalActor(request.currentUser)
      );
      return reply.status(204).send();
    });

    app.patch<{ Params: { id: number; attachmentId: number }; Body: ParentFileMoveInput }>(`${definition.basePath}/:id/attachments/:attachmentId/folder`, {
      config: { auth: { resource: "attachments", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerAttachmentParamsSchema, body: moveInputSchema, response: { 200: objectResponseSchema } }
    }, async (request) => moveParentAttachment(
      app.db,
      owner(definition, request.params.id),
      request.params.attachmentId,
      request.body,
      createJournalActor(request.currentUser)
    ));

    app.get<{ Params: { id: number } }>(documentLinkPath, {
      config: { auth: { resource: "documents", action: "read" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "read"),
      schema: { params: ownerIdParamsSchema, response: { 200: arrayResponseSchema } }
    }, async (request) => listParentDocumentLinks(app.db, owner(definition, request.params.id)));

    app.post<{ Params: { id: number }; Body: ParentDocumentLinkInput }>(documentLinkPath, {
      config: { auth: { resource: "documents", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerIdParamsSchema, body: documentLinkInputSchema, response: { 201: objectResponseSchema } }
    }, async (request, reply) => reply.status(201).send(await createParentDocumentLink(
      app.db,
      owner(definition, request.params.id),
      request.body,
      createJournalActor(request.currentUser)
    )));

    app.patch<{ Params: { id: number; linkId: number }; Body: ParentFileMoveInput }>(`${documentLinkDetailPath}/folder`, {
      config: { auth: { resource: "documents", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerDocumentLinkParamsSchema, body: moveInputSchema, response: { 200: objectResponseSchema } }
    }, async (request) => moveParentDocumentLink(
      app.db,
      owner(definition, request.params.id),
      request.params.linkId,
      request.body,
      createJournalActor(request.currentUser)
    ));

    app.delete<{ Params: { id: number; linkId: number }; Querystring: { expectedVersion: number } }>(documentLinkDetailPath, {
      config: { auth: { resource: "documents", action: "write" } },
      preHandler: requireOwnerPermission(definition.ownerResource, "write"),
      schema: { params: ownerDocumentLinkParamsSchema, querystring: expectedVersionQuerySchema, response: { 204: { type: "null" } } }
    }, async (request, reply) => {
      await deleteParentDocumentLink(
        app.db,
        owner(definition, request.params.id),
        request.params.linkId,
        request.query.expectedVersion,
        createJournalActor(request.currentUser)
      );
      return reply.status(204).send();
    });
  }
}
